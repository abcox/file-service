import { BaseEntity } from '../base.entity';

/**
 * Metadata Entity - Centralized lookup value management
 * This entity manages all lookup values and enumeration data used across
 * the application. It provides a flexible, runtime-configurable system
 * for managing dropdown values, tags, and other categorical data.
 */

// Value objects for metadata values
export interface MetadataValue {
  id: string;
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  order: number;
  isActive: boolean;
  isDefault?: boolean;
  parentId?: string;
  properties?: Record<string, any>;
}

export interface MetadataHierarchy {
  level: number;
  parentId?: string;
  path?: string[];
}

// Core Metadata aggregate root
export interface Metadata extends BaseEntity {
  // Core identification
  category: MetadataCategoryValue;
  subcategory?: string;

  // Organizational info
  name: string;
  description?: string;

  // Configuration
  values: MetadataValue[];
  allowCustomValues?: boolean;
  isMultiSelect?: boolean;
  isRequired?: boolean;

  // Hierarchy support
  isHierarchical?: boolean;
  maxLevels?: number;

  // Version control
  version: number;

  // Usage tracking
  usageCount?: number;
  lastUsedAt?: Date;

  // Validation rules
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customValidator?: string;
  };

  // Display configuration
  displayConfig?: {
    sortBy: 'order' | 'label' | 'usage';
    groupBy?: string;
    showColors?: boolean;
    showIcons?: boolean;
  };

  // Scope and access
  scope: MetadataScopeValue;
  accessibleBy?: string[];

  // Audit and lifecycle
  isActive: boolean;
  deprecatedAt?: Date;
  replacedBy?: string;
  createdBy?: string;
  updatedBy?: string;
}

// Metadata category enumeration
export const MetadataCategory = {
  // Contact-related metadata
  CONTACT_STATUS: 'contact-status',
  CONTACT_SOURCE: 'contact-source',
  CONTACT_TAG: 'contact-tag',
  CONTACT_PRIORITY: 'contact-priority',
  INDUSTRY: 'industry',

  // Document-related metadata
  DOCUMENT_TYPE: 'document-type',
  DOCUMENT_CATEGORY: 'document-category',
  DOCUMENT_TAG: 'document-tag',
  DOCUMENT_STATUS: 'document-status',
  DOCUMENT_VISIBILITY: 'document-visibility',
  DOCUMENT_ACCESS_LEVEL: 'document-access-level',

  // User-related metadata
  USER_ROLE: 'user-role',
  USER_DEPARTMENT: 'user-department',
  USER_SKILL: 'user-skill',

  // Project-related metadata
  PROJECT_STATUS: 'project-status',
  PROJECT_TYPE: 'project-type',
  PROJECT_PRIORITY: 'project-priority',

  // System-wide metadata
  COUNTRY: 'country',
  CURRENCY: 'currency',
  TIMEZONE: 'timezone',
  LANGUAGE: 'language',

  // Custom metadata
  CUSTOM: 'custom',
} as const;

export const MetadataScope = {
  GLOBAL: 'global',
  ORGANIZATION: 'organization',
  TEAM: 'team',
  USER: 'user',
} as const;

// Predefined metadata configurations
export const DefaultMetadataConfigs = {
  [MetadataCategory.CONTACT_STATUS]: {
    name: 'Contact Status',
    description: 'Status categories for contacts',
    values: [
      {
        id: 'active',
        label: 'Active',
        color: '#22c55e',
        order: 1,
        isActive: true,
        isDefault: true,
      },
      {
        id: 'inactive',
        label: 'Inactive',
        color: '#6b7280',
        order: 2,
        isActive: true,
      },
      {
        id: 'prospect',
        label: 'Prospect',
        color: '#3b82f6',
        order: 3,
        isActive: true,
      },
      {
        id: 'customer',
        label: 'Customer',
        color: '#10b981',
        order: 4,
        isActive: true,
      },
      {
        id: 'lead',
        label: 'Lead',
        color: '#f59e0b',
        order: 5,
        isActive: true,
      },
      {
        id: 'archived',
        label: 'Archived',
        color: '#ef4444',
        order: 6,
        isActive: true,
      },
    ],
  },

  [MetadataCategory.CONTACT_SOURCE]: {
    name: 'Contact Source',
    description: 'How the contact was acquired',
    values: [
      { id: 'website', label: 'Website', order: 1, isActive: true },
      { id: 'referral', label: 'Referral', order: 2, isActive: true },
      { id: 'conference', label: 'Conference', order: 3, isActive: true },
      { id: 'cold-call', label: 'Cold Call', order: 4, isActive: true },
      {
        id: 'social-media',
        label: 'Social Media',
        order: 5,
        isActive: true,
      },
      {
        id: 'email-campaign',
        label: 'Email Campaign',
        order: 6,
        isActive: true,
      },
      { id: 'partner', label: 'Partner', order: 7, isActive: true },
      { id: 'import', label: 'Import', order: 8, isActive: true },
    ],
  },

  [MetadataCategory.CONTACT_TAG]: {
    name: 'Contact Tags',
    description: 'Categorization tags for contacts',
    isMultiSelect: true,
    values: [
      {
        id: 'hot-lead',
        label: 'Hot Lead',
        color: '#ef4444',
        order: 1,
        isActive: true,
      },
      {
        id: 'decision-maker',
        label: 'Decision Maker',
        color: '#8b5cf6',
        order: 2,
        isActive: true,
      },
      {
        id: 'technical',
        label: 'Technical Contact',
        color: '#06b6d4',
        order: 3,
        isActive: true,
      },
      {
        id: 'budget-holder',
        label: 'Budget Holder',
        color: '#10b981',
        order: 4,
        isActive: true,
      },
      {
        id: 'champion',
        label: 'Champion',
        color: '#f59e0b',
        order: 5,
        isActive: true,
      },
      {
        id: 'influencer',
        label: 'Influencer',
        color: '#ec4899',
        order: 6,
        isActive: true,
      },
      {
        id: 'blocker',
        label: 'Blocker',
        color: '#ef4444',
        order: 7,
        isActive: true,
      },
      { id: 'vip', label: 'VIP', color: '#7c3aed', order: 8, isActive: true },
    ],
  },

  [MetadataCategory.DOCUMENT_TYPE]: {
    name: 'Document Types',
    description: 'Types of documents in the system',
    values: [
      { id: 'note', label: 'Note', order: 1, isActive: true },
      { id: 'attachment', label: 'Attachment', order: 2, isActive: true },
      { id: 'email', label: 'Email', order: 3, isActive: true },
      { id: 'meeting-notes', label: 'Meeting Notes', order: 4, isActive: true },
      { id: 'contract', label: 'Contract', order: 5, isActive: true },
      { id: 'proposal', label: 'Proposal', order: 6, isActive: true },
      { id: 'invoice', label: 'Invoice', order: 7, isActive: true },
      { id: 'report', label: 'Report', order: 8, isActive: true },
      { id: 'presentation', label: 'Presentation', order: 9, isActive: true },
      { id: 'spreadsheet', label: 'Spreadsheet', order: 10, isActive: true },
      { id: 'image', label: 'Image', order: 11, isActive: true },
      { id: 'video', label: 'Video', order: 12, isActive: true },
      { id: 'audio', label: 'Audio', order: 13, isActive: true },
      { id: 'template', label: 'Template', order: 14, isActive: true },
      { id: 'other', label: 'Other', order: 15, isActive: true },
    ],
  },

  [MetadataCategory.DOCUMENT_STATUS]: {
    name: 'Document Status',
    description: 'Lifecycle status of documents',
    values: [
      {
        id: 'draft',
        label: 'Draft',
        color: '#6b7280',
        order: 1,
        isActive: true,
        isDefault: true,
      },
      {
        id: 'review',
        label: 'In Review',
        color: '#f59e0b',
        order: 2,
        isActive: true,
      },
      {
        id: 'approved',
        label: 'Approved',
        color: '#10b981',
        order: 3,
        isActive: true,
      },
      {
        id: 'published',
        label: 'Published',
        color: '#3b82f6',
        order: 4,
        isActive: true,
      },
      {
        id: 'archived',
        label: 'Archived',
        color: '#8b5cf6',
        order: 5,
        isActive: true,
      },
      {
        id: 'deleted',
        label: 'Deleted',
        color: '#ef4444',
        order: 6,
        isActive: true,
      },
    ],
  },

  [MetadataCategory.DOCUMENT_CATEGORY]: {
    name: 'Document Category',
    description: 'Business categories for documents',
    values: [
      {
        id: 'legal',
        label: 'Legal',
        color: '#7c3aed',
        order: 1,
        isActive: true,
      },
      {
        id: 'finance',
        label: 'Finance',
        color: '#10b981',
        order: 2,
        isActive: true,
      },
      {
        id: 'hr',
        label: 'Human Resources',
        color: '#ec4899',
        order: 3,
        isActive: true,
      },
      {
        id: 'marketing',
        label: 'Marketing',
        color: '#f59e0b',
        order: 4,
        isActive: true,
      },
      {
        id: 'sales',
        label: 'Sales',
        color: '#3b82f6',
        order: 5,
        isActive: true,
      },
      {
        id: 'technical',
        label: 'Technical',
        color: '#06b6d4',
        order: 6,
        isActive: true,
      },
      {
        id: 'operations',
        label: 'Operations',
        color: '#8b5cf6',
        order: 7,
        isActive: true,
      },
      {
        id: 'compliance',
        label: 'Compliance',
        color: '#ef4444',
        order: 8,
        isActive: true,
      },
      {
        id: 'general',
        label: 'General',
        color: '#6b7280',
        order: 9,
        isActive: true,
      },
    ],
  },

  [MetadataCategory.DOCUMENT_TAG]: {
    name: 'Document Tags',
    description: 'Tagging system for documents',
    isMultiSelect: true,
    values: [
      {
        id: 'important',
        label: 'Important',
        color: '#ef4444',
        order: 1,
        isActive: true,
      },
      {
        id: 'urgent',
        label: 'Urgent',
        color: '#f59e0b',
        order: 2,
        isActive: true,
      },
      {
        id: 'confidential',
        label: 'Confidential',
        color: '#7c3aed',
        order: 3,
        isActive: true,
      },
      {
        id: 'public',
        label: 'Public',
        color: '#10b981',
        order: 4,
        isActive: true,
      },
      {
        id: 'template',
        label: 'Template',
        color: '#3b82f6',
        order: 5,
        isActive: true,
      },
      {
        id: 'training',
        label: 'Training',
        color: '#06b6d4',
        order: 6,
        isActive: true,
      },
      {
        id: 'policy',
        label: 'Policy',
        color: '#8b5cf6',
        order: 7,
        isActive: true,
      },
      {
        id: 'procedure',
        label: 'Procedure',
        color: '#ec4899',
        order: 8,
        isActive: true,
      },
    ],
  },

  [MetadataCategory.DOCUMENT_VISIBILITY]: {
    name: 'Document Visibility',
    description: 'Who can see the document',
    values: [
      {
        id: 'private',
        label: 'Private',
        description: 'Only the owner can see',
        color: '#ef4444',
        order: 1,
        isActive: true,
        isDefault: true,
      },
      {
        id: 'team',
        label: 'Team',
        description: 'Team members can see',
        color: '#f59e0b',
        order: 2,
        isActive: true,
      },
      {
        id: 'organization',
        label: 'Organization',
        description: 'All organization members can see',
        color: '#3b82f6',
        order: 3,
        isActive: true,
      },
      {
        id: 'public',
        label: 'Public',
        description: 'Everyone can see',
        color: '#10b981',
        order: 4,
        isActive: true,
      },
    ],
  },

  [MetadataCategory.DOCUMENT_ACCESS_LEVEL]: {
    name: 'Document Access Level',
    description: 'Security classification of documents',
    values: [
      {
        id: 'restricted',
        label: 'Restricted',
        description: 'Highest security level',
        color: '#ef4444',
        order: 1,
        isActive: true,
      },
      {
        id: 'confidential',
        label: 'Confidential',
        description: 'Confidential information',
        color: '#f59e0b',
        order: 2,
        isActive: true,
      },
      {
        id: 'internal',
        label: 'Internal',
        description: 'Internal use only',
        color: '#3b82f6',
        order: 3,
        isActive: true,
        isDefault: true,
      },
      {
        id: 'public',
        label: 'Public',
        description: 'Public information',
        color: '#10b981',
        order: 4,
        isActive: true,
      },
    ],
  },
} as const;

export type MetadataCategoryValue =
  (typeof MetadataCategory)[keyof typeof MetadataCategory];
export type MetadataScopeValue =
  (typeof MetadataScope)[keyof typeof MetadataScope];
