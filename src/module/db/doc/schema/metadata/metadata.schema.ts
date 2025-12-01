import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Schema as MongooseSchema } from 'mongoose';

// Nested class schemas
@Schema({ _id: false })
export class MetadataValue {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  label: string;

  @Prop()
  description?: string;

  @Prop()
  color?: string;

  @Prop()
  icon?: string;

  @Prop({ required: true, default: 0 })
  order: number;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault?: boolean;

  @Prop()
  parentId?: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  properties?: any;
}

export const MetadataValueSchema = SchemaFactory.createForClass(MetadataValue);

@Schema({ _id: false })
export class ValidationRules {
  @Prop()
  minLength?: number;

  @Prop()
  maxLength?: number;

  @Prop()
  pattern?: string;

  @Prop()
  customValidator?: string;
}

export const ValidationRulesSchema =
  SchemaFactory.createForClass(ValidationRules);

@Schema({ _id: false })
export class DisplayConfig {
  @Prop({
    enum: ['order', 'label', 'usage'],
    default: 'order',
  })
  sortBy: string;

  @Prop()
  groupBy?: string;

  @Prop({ default: false })
  showColors?: boolean;

  @Prop({ default: false })
  showIcons?: boolean;
}

export const DisplayConfigSchema = SchemaFactory.createForClass(DisplayConfig);

@Schema({
  timestamps: true,
  collection: 'metadata',
})
export class Metadata extends Document {
  // Core identification
  @Prop({
    required: true,
    index: true,
    enum: [
      // Contact-related metadata
      'contact-status',
      'contact-source',
      'contact-tag',
      'contact-priority',
      'industry',
      // Document-related metadata
      'document-type',
      'document-category',
      'document-tag',
      'document-status',
      'document-visibility',
      'document-access-level',
      // User-related metadata
      'user-role',
      'user-department',
      'user-skill',
      // Project-related metadata
      'project-status',
      'project-type',
      'project-priority',
      // System-wide metadata
      'country',
      'currency',
      'timezone',
      'language',
      // Custom metadata
      'custom',
    ],
  })
  category: string;

  @Prop({ index: true })
  subcategory?: string;

  // Organizational info
  @Prop({ required: true, index: true })
  name: string;

  @Prop()
  description?: string;

  // Configuration
  @Prop({
    type: [MetadataValueSchema],
    required: true,
    validate: [
      {
        validator: function (values: MetadataValue[]) {
          return values && values.length > 0;
        },
        message: 'At least one metadata value is required',
      },
      {
        validator: function (values: MetadataValue[]) {
          const ids: string[] = values.map((v: MetadataValue) => v.id);
          return ids.length === new Set(ids).size;
        },
        message: 'Metadata value IDs must be unique',
      },
    ],
  })
  values: MetadataValue[];

  @Prop({ default: false })
  allowCustomValues?: boolean;

  @Prop({ default: false })
  isMultiSelect?: boolean;

  @Prop({ default: false })
  isRequired?: boolean;

  // Hierarchy support
  @Prop({ default: false })
  isHierarchical?: boolean;

  @Prop({ default: 1 })
  maxLevels?: number;

  // Version control
  @Prop({ default: 1 })
  version: number;

  // Usage tracking
  @Prop({ default: 0 })
  usageCount?: number;

  @Prop()
  lastUsedAt?: Date;

  // Validation rules
  @Prop({ type: ValidationRulesSchema })
  validationRules?: ValidationRules;

  // Display configuration
  @Prop({ type: DisplayConfigSchema })
  displayConfig?: DisplayConfig;

  // Scope and access
  @Prop({
    enum: ['global', 'organization', 'team', 'user'],
    default: 'global',
    index: true,
  })
  scope: string;

  @Prop([String])
  accessibleBy?: string[];

  // Audit and lifecycle
  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop()
  deprecatedAt?: Date;

  @Prop()
  replacedBy?: string;

  @Prop({ index: true })
  createdBy?: string;

  @Prop({ index: true })
  updatedBy?: string;
}

export const MetadataSchema = SchemaFactory.createForClass(Metadata);

// Add indexes for performance after schema creation
MetadataSchema.index({ category: 1, isActive: 1 }); // Primary lookup
MetadataSchema.index({ category: 1, subcategory: 1 }); // Subcategory queries
MetadataSchema.index({ scope: 1, isActive: 1 }); // Scope filtering
MetadataSchema.index({ 'values.id': 1 }); // Value lookup
MetadataSchema.index({ usageCount: -1 }); // Popular metadata
MetadataSchema.index({ lastUsedAt: -1 }); // Recent usage
MetadataSchema.index({ createdAt: -1 }); // Chronological queries

// Compound unique index for category + subcategory
MetadataSchema.index(
  { category: 1, subcategory: 1 },
  { unique: true, sparse: true },
);

// Pre-save middleware for validation and data consistency
MetadataSchema.pre('save', function (next) {
  // Ensure values are sorted by order
  if (this.values && this.values.length > 0) {
    this.values.sort((a, b) => (a.order || 0) - (b.order || 0));

    // Ensure only one default value if applicable
    if (!this.isMultiSelect) {
      const defaultValues = this.values.filter((v) => v.isDefault);
      if (defaultValues.length > 1) {
        // Keep only the first default, remove others
        let foundFirst = false;
        this.values.forEach((v) => {
          if (v.isDefault) {
            if (foundFirst) {
              v.isDefault = false;
            } else {
              foundFirst = true;
            }
          }
        });
      }
    }
  }

  // Validate hierarchical constraints
  if (this.isHierarchical && this.values) {
    const parentIds = new Set<string>();
    const childIds = new Set<string>();

    this.values.forEach((v) => {
      if (v.parentId) {
        childIds.add(String(v.id));
        parentIds.add(String(v.parentId));
      }
    });

    // Ensure parent IDs exist in values
    for (const parentId of parentIds) {
      const parentExists = this.values.some((v) => v.id === parentId);
      if (!parentExists) {
        return next(
          new Error(`Parent ID ${String(parentId)} does not exist in values`),
        );
      }
    }
  }

  next();
});

// Add methods to the schema
MetadataSchema.methods.incrementUsage = function (this: Metadata) {
  this.usageCount = (this.usageCount || 0) + 1;
  this.lastUsedAt = new Date();
  return this.save();
};
