import { BaseEntity } from '../base.entity';

/**
 * Asset Entity - Aggregate root for managing assets and attachments
 *
 * Assets can be standalone or related to other entities like contacts.
 * They support both text content and file attachments through references
 * to the existing FileEntity system.
 */

// Value objects for asset relationships
export interface AssetRelationship {
  entityType: 'contact' | 'user' | 'project' | 'organization';
  entityId: string;
  relationshipType: 'about' | 'from' | 'to' | 'shared-with' | 'attached-to';
}

export interface AssetFileReference {
  fileId: string;
  filename: string;
  mimeType: string;
  size?: number;
  uploadedAt?: Date;
}

export interface AssetVersion {
  version: number;
  content?: string;
  fileRef?: AssetFileReference;
  modifiedBy: string;
  modifiedAt: Date;
  changeNote?: string;
}

export interface AssetCollaborator {
  userId: string;
  role: 'viewer' | 'editor' | 'commenter';
  addedAt: Date;
}

// Core Asset aggregate root
export interface Asset extends BaseEntity {
  // Core asset properties
  title: string;
  // Reference to metadata: 'asset-type'
  type: string;

  // Content (either text or file reference, not both)
  content?: string;
  fileRef?: AssetFileReference;

  // Asset classification and organization (metadata references)
  // Reference to metadata: 'asset-category'
  category?: string;
  // Array of metadata references: 'asset-tag'
  tags?: string[];

  // Relationships to other entities (weak references for NoSQL)
  relatedTo?: AssetRelationship[];

  // Access control and visibility (metadata references)
  // Reference to metadata: 'asset-visibility'
  visibility: string;
  // Reference to metadata: 'asset-access-level'
  accessLevel: string;

  // Ownership and collaboration
  ownedBy: string;
  collaborators?: AssetCollaborator[];

  // Asset lifecycle (metadata reference)
  // Reference to metadata: 'asset-status'
  status: string;
  publishedAt?: Date;
  expiresAt?: Date;

  // Version control
  version: number;
  previousVersions?: AssetVersion[];

  // Metadata and context
  summary?: string;
  keywords?: string[];
  language?: string;

  // Tracking and analytics
  viewCount?: number;
  lastViewedAt?: Date;
  downloadCount?: number;

  // Flags
  isTemplate?: boolean;
  isFavorite?: boolean;
  isArchived?: boolean;

  // Audit fields
  createdBy?: string;
}
