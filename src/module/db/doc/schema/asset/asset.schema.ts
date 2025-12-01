import { Schema } from 'mongoose';

// Sub-schemas for nested objects
const AssetRelationshipSchema = new Schema(
  {
    entityType: {
      type: String,
      enum: ['contact', 'user', 'project', 'organization'],
      required: true,
    },
    entityId: { type: String, required: true },
    relationshipType: {
      type: String,
      enum: ['about', 'from', 'to', 'shared-with', 'attached-to'],
      required: true,
    },
  },
  { _id: false },
);

const AssetFileReferenceSchema = new Schema(
  {
    fileId: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const CollaboratorSchema = new Schema(
  {
    userId: { type: String, required: true },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'commenter'],
      default: 'viewer',
    },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const AssetVersionSchema = new Schema(
  {
    version: { type: Number, required: true },
    content: { type: String },
    fileRef: AssetFileReferenceSchema,
    modifiedBy: { type: String, required: true },
    modifiedAt: { type: Date, default: Date.now },
    changeNote: { type: String },
  },
  { _id: false },
);

// Main Asset schema
export const AssetSchema = new Schema(
  {
    // Core asset properties
    title: { type: String, required: true, index: true },
    // Metadata reference to 'asset-type' category
    type: { type: String, required: true, index: true },

    // Content (either text or file reference, not both)
    content: { type: String },
    fileRef: AssetFileReferenceSchema,

    // Asset classification and organization (metadata references)
    // Metadata reference to 'asset-category' category
    category: { type: String, index: true },
    // Metadata references to 'asset-tag' category
    tags: [{ type: String, index: true }],

    // Relationships to other entities
    relatedTo: [AssetRelationshipSchema],

    // Access control and visibility (metadata references)
    // Metadata reference to 'asset-visibility' category
    visibility: {
      type: String,
      required: true,
      default: 'private',
      index: true,
    },
    // Metadata reference to 'asset-access-level' category
    accessLevel: {
      type: String,
      required: true,
      default: 'internal',
      index: true,
    },

    // Ownership and collaboration
    ownedBy: { type: String, required: true, index: true },
    collaborators: [CollaboratorSchema],

    // Asset lifecycle
    status: {
      type: String,
      enum: ['draft', 'review', 'approved', 'published', 'archived', 'deleted'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date, index: true },
    expiresAt: { type: Date, index: true },

    // Version control
    version: { type: Number, default: 1 },
    previousVersions: [AssetVersionSchema],

    // Metadata and context
    summary: { type: String },
    keywords: [{ type: String, index: true }],
    language: { type: String, default: 'en' },

    // Tracking and analytics
    viewCount: { type: Number, default: 0 },
    lastViewedAt: { type: Date },
    downloadCount: { type: Number, default: 0 },

    // Flags
    isTemplate: { type: Boolean, default: false, index: true },
    isFavorite: { type: Boolean, default: false, index: true },
    isArchived: { type: Boolean, default: false, index: true },

    // Audit fields
    createdBy: { type: String, required: true, index: true },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    collection: 'assets',
  },
);

// Indexes for performance
AssetSchema.index({ title: 'text', content: 'text', summary: 'text' }); // Text search
AssetSchema.index({ type: 1, status: 1 }); // Common filters
AssetSchema.index({ ownedBy: 1, status: 1 }); // Owner queries
AssetSchema.index({ 'relatedTo.entityType': 1, 'relatedTo.entityId': 1 }); // Relationship queries
AssetSchema.index({ visibility: 1, accessLevel: 1 }); // Access control
AssetSchema.index({ publishedAt: -1 }); // Publication date
AssetSchema.index({ lastViewedAt: -1 }); // Recent activity
AssetSchema.index({ createdAt: -1 }); // Chronological queries

// Pre-save middleware for validation
AssetSchema.pre('save', function (next) {
  // Ensure content XOR fileRef (exactly one should be present)
  const hasContent = Boolean(this.content && this.content.trim());
  const hasFileRef = Boolean(this.fileRef);

  if (!hasContent && !hasFileRef) {
    return next(new Error('Asset must have either content or fileRef'));
  }

  if (hasContent && hasFileRef) {
    return next(new Error('Asset cannot have both content and fileRef'));
  }

  // Auto-set asset type based on file if not specified
  if (hasFileRef && this.type === 'other' && this.fileRef?.mimeType) {
    const mimeType = this.fileRef.mimeType;
    if (mimeType.startsWith('image/')) this.type = 'image';
    else if (mimeType.startsWith('video/')) this.type = 'video';
    else if (mimeType.startsWith('audio/')) this.type = 'audio';
    else if (mimeType.includes('pdf')) this.type = 'attachment';
    else if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
      this.type = 'spreadsheet';
    else if (
      mimeType.includes('presentation') ||
      mimeType.includes('powerpoint')
    )
      this.type = 'presentation';
  }

  next();
});

// Pre-update middleware for version control
AssetSchema.pre('findOneAndUpdate', function (next) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const update = this.getUpdate() as any;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (update.$set && (update.$set.content || update.$set.fileRef)) {
    // Increment version on content changes
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    update.$inc = update.$inc || {};
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    update.$inc.version = 1;
  }
  next();
});
