import { BaseEntity } from '../base.entity';

/**
 * Contact Entity - Core business aggregate for managing contacts
 *
 * This represents a person or organization contact with their basic information
 * and metadata references for extensible categorization.
 */

// Value objects for type safety and validation
export interface ContactPhone {
  number: string;
  type: 'mobile' | 'work' | 'home' | 'fax';
  isPrimary?: boolean;
}

export interface ContactEmail {
  address: string;
  type: 'work' | 'personal' | 'other';
  isPrimary?: boolean;
}

export interface ContactAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  type: 'work' | 'home' | 'billing' | 'shipping';
}

export interface SocialMedia {
  // 'linkedin', 'twitter', 'facebook', etc.
  platform: string;
  profileUrl: string;
}

// Core Contact aggregate root
export interface IContact extends BaseEntity {
  // Core identity fields
  // Full name or organization name
  name: string;
  // Individual first name
  firstName?: string;
  // Individual last name
  lastName?: string;

  // Contact information (arrays for multiple entries)
  emails: ContactEmail[];
  phones?: ContactPhone[];
  addresses?: ContactAddress[];

  // Organization context
  company?: string;
  // Job title or role
  title?: string;
  department?: string;

  // Metadata references (lookup values from metadata collection)
  // Reference to metadata: 'active', 'inactive', 'prospect', etc.
  status: string;
  // Reference to metadata: 'website', 'referral', 'conference', etc.
  source: string;
  // Array of metadata references: 'hot-lead', 'decision-maker', etc.
  tags?: string[];
  // Reference to metadata: 'technology', 'healthcare', etc.
  industry?: string;
  // Reference to metadata: 'high', 'medium', 'low'
  priority?: string;

  // Relationship and interaction tracking
  // User ID of person managing this contact
  assignedTo?: string;
  // Last interaction date
  lastContactedAt?: Date;
  // Scheduled follow-up date
  nextFollowUpAt?: Date;

  // Social and web presence
  website?: string;
  socialMedia?: SocialMedia[];

  // Additional context
  // Brief internal notes
  notes?: string;
  // Soft delete flag
  isActive: boolean;

  // Audit fields (inherited from BaseDocument)
  // User ID who created the contact
  createdBy?: string;
  // createdAt: Date; // From BaseDocument
  // updatedAt: Date; // From BaseDocument
}

// Enums for commonly used values (can also be managed via metadata)
export const ContactStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PROSPECT: 'prospect',
  CUSTOMER: 'customer',
  ARCHIVED: 'archived',
  LEAD: 'lead',
} as const;

export const ContactSource = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  CONFERENCE: 'conference',
  COLD_CALL: 'cold-call',
  SOCIAL_MEDIA: 'social-media',
  EMAIL_CAMPAIGN: 'email-campaign',
  IMPORT: 'import',
  PARTNER: 'partner',
} as const;

export const ContactTag = {
  HOT_LEAD: 'hot-lead',
  DECISION_MAKER: 'decision-maker',
  TECHNICAL: 'technical',
  BUDGET_HOLDER: 'budget-holder',
  CHAMPION: 'champion',
  INFLUENCER: 'influencer',
  BLOCKER: 'blocker',
  VIP: 'vip',
} as const;

export type ContactStatusType =
  (typeof ContactStatus)[keyof typeof ContactStatus];
export type ContactSourceType =
  (typeof ContactSource)[keyof typeof ContactSource];
export type ContactTagType = (typeof ContactTag)[keyof typeof ContactTag];
