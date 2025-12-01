import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  ContactPhone as IContactPhone,
  ContactEmail as IContactEmail,
  ContactAddress as IContactAddress,
  SocialMedia as ISocialMedia,
} from '../../entity/contact/contact.entity';

// Nested class schemas that implement interfaces
@Schema({ _id: false })
export class ContactPhone implements IContactPhone {
  @Prop({ required: true })
  number: string;

  @Prop({
    enum: ['mobile', 'work', 'home', 'fax'],
    default: 'mobile',
  })
  type: 'mobile' | 'work' | 'home' | 'fax';

  @Prop({ default: false })
  isPrimary?: boolean;
}

export const ContactPhoneSchema = SchemaFactory.createForClass(ContactPhone);

@Schema({ _id: false })
export class ContactEmail implements IContactEmail {
  @Prop({ required: true })
  address: string;

  @Prop({
    enum: ['work', 'personal', 'other'],
    default: 'work',
  })
  type: 'work' | 'personal' | 'other';

  @Prop({ default: false })
  isPrimary?: boolean;
}

export const ContactEmailSchema = SchemaFactory.createForClass(ContactEmail);

@Schema({ _id: false })
export class ContactAddress implements IContactAddress {
  @Prop()
  street?: string;

  @Prop()
  city?: string;

  @Prop()
  state?: string;

  @Prop()
  postalCode?: string;

  @Prop()
  country?: string;

  @Prop({
    enum: ['work', 'home', 'billing', 'shipping'],
    default: 'work',
  })
  type: 'work' | 'home' | 'billing' | 'shipping';
}

export const ContactAddressSchema =
  SchemaFactory.createForClass(ContactAddress);

@Schema({ _id: false })
export class SocialMedia implements ISocialMedia {
  @Prop({ required: true })
  platform: string;

  @Prop({ required: true })
  profileUrl: string;
}

export const SocialMediaSchema = SchemaFactory.createForClass(SocialMedia);

@Schema({
  timestamps: true,
  collection: 'contacts',
})
export class Contact extends Document {
  // Core identity fields
  @Prop({ required: true, index: true })
  name: string;

  @Prop({ index: true })
  firstName?: string;

  @Prop({ index: true })
  lastName?: string;

  // Contact information arrays
  @Prop({
    type: [ContactEmailSchema],
    required: true,
    validate: [
      {
        validator: function (emails: ContactEmail[]) {
          return emails && emails.length > 0;
        },
        message: 'At least one email is required',
      },
    ],
  })
  emails: ContactEmail[];

  @Prop({ type: [ContactPhoneSchema] })
  phones?: ContactPhone[];

  @Prop({ type: [ContactAddressSchema] })
  addresses?: ContactAddress[];

  // Organization context
  @Prop({ index: true })
  company?: string;

  @Prop()
  title?: string;

  @Prop()
  department?: string;

  // Metadata references (stored as strings, validated by application)
  @Prop({ required: true, default: 'active', index: true })
  status: string;

  @Prop({ required: true, index: true })
  source: string;

  @Prop({ type: [String], index: true })
  tags?: string[];

  @Prop({ index: true })
  industry?: string;

  @Prop({ index: true })
  priority?: string;

  // Relationship and interaction tracking
  @Prop({ index: true })
  assignedTo?: string;

  @Prop({ index: true })
  lastContactedAt?: Date;

  @Prop({ index: true })
  nextFollowUpAt?: Date;

  // Social and web presence
  @Prop()
  website?: string;

  @Prop({ type: [SocialMediaSchema] })
  socialMedia?: SocialMedia[];

  // Additional context
  @Prop()
  notes?: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  // Audit fields
  @Prop({ index: true })
  createdBy?: string;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Add indexes and middleware after schema creation
ContactSchema.index({ name: 'text', company: 'text' }); // Text search
ContactSchema.index({ 'emails.address': 1 }, { unique: true }); // Unique email
ContactSchema.index({ status: 1, isActive: 1 }); // Common filters
ContactSchema.index({ assignedTo: 1, status: 1 }); // Assignment queries
ContactSchema.index({ lastContactedAt: -1 }); // Recent activity
ContactSchema.index({ createdAt: -1 }); // Chronological queries

// Pre-save middleware for validation and data consistency
ContactSchema.pre('save', function (this: Contact, next) {
  // Ensure at least one primary email
  if (this.emails && this.emails.length > 0) {
    const hasPrimary = this.emails.some(
      (email: ContactEmail) => email.isPrimary,
    );
    if (!hasPrimary) {
      this.emails[0].isPrimary = true;
    }
  }

  // Ensure at least one primary phone if phones exist
  if (this.phones && this.phones.length > 0) {
    const hasPrimaryPhone = this.phones.some(
      (phone: ContactPhone) => phone.isPrimary,
    );
    if (!hasPrimaryPhone) {
      this.phones[0].isPrimary = true;
    }
  }

  next();
});
