import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Asset,
  AssetRelationship,
  AssetFileReference,
  AssetCollaborator,
} from '../../db/doc/entity/asset/asset.entity';

// Entity-reference approach for type safety
type CreateAssetData = Omit<
  Asset,
  | '_id'
  | 'createdAt'
  | 'updatedAt'
  | 'version'
  | 'previousVersions'
  | 'viewCount'
  | 'lastViewedAt'
  | 'downloadCount'
>;

export class AssetRelationshipDto implements AssetRelationship {
  @ApiProperty({ enum: ['contact', 'user', 'project', 'organization'] })
  @IsEnum(['contact', 'user', 'project', 'organization'])
  entityType: 'contact' | 'user' | 'project' | 'organization';

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiProperty({ enum: ['about', 'from', 'to', 'shared-with', 'attached-to'] })
  @IsEnum(['about', 'from', 'to', 'shared-with', 'attached-to'])
  relationshipType: 'about' | 'from' | 'to' | 'shared-with' | 'attached-to';
}

export class AssetFileReferenceDto implements AssetFileReference {
  @ApiProperty()
  @IsString()
  fileId: string;

  @ApiProperty()
  @IsString()
  filename: string;

  @ApiProperty()
  @IsString()
  mimeType: string;

  @ApiPropertyOptional()
  @IsOptional()
  size?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  uploadedAt?: Date;
}

export class AssetCollaboratorDto implements AssetCollaborator {
  @ApiProperty()
  @IsString()
  userId: string;

  @ApiProperty({ enum: ['viewer', 'editor', 'commenter'], default: 'viewer' })
  @IsEnum(['viewer', 'editor', 'commenter'])
  role: 'viewer' | 'editor' | 'commenter';

  @ApiProperty()
  @IsDateString()
  addedAt: Date;
}

export class CreateAssetDto implements CreateAssetData {
  @ApiProperty({ description: 'Asset title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Asset type (metadata reference)' })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    description: 'Text content (either content or fileRef, not both)',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'File reference (either content or fileRef, not both)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssetFileReferenceDto)
  fileRef?: AssetFileReferenceDto;

  @ApiPropertyOptional({ description: 'Asset category (metadata reference)' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Asset tags (metadata references)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Relationships to other entities',
    type: [AssetRelationshipDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetRelationshipDto)
  relatedTo?: AssetRelationshipDto[];

  @ApiProperty({
    description: 'Asset visibility (metadata reference)',
    default: 'private',
  })
  @IsString()
  visibility: string;

  @ApiProperty({
    description: 'Asset access level (metadata reference)',
    default: 'internal',
  })
  @IsString()
  accessLevel: string;

  @ApiProperty({ description: 'Asset owner user ID' })
  @IsString()
  ownedBy: string;

  @ApiPropertyOptional({
    description: 'Asset collaborators',
    type: [AssetCollaboratorDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetCollaboratorDto)
  collaborators?: AssetCollaboratorDto[];

  @ApiProperty({
    enum: ['draft', 'review', 'approved', 'published', 'archived', 'deleted'],
    default: 'draft',
  })
  @IsEnum(['draft', 'review', 'approved', 'published', 'archived', 'deleted'])
  status: string;

  @ApiPropertyOptional({ description: 'Published date' })
  @IsOptional()
  @IsDateString()
  publishedAt?: Date;

  @ApiPropertyOptional({ description: 'Expiry date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Asset summary' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ description: 'Asset keywords', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({ description: 'Asset language', default: 'en' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ description: 'Is template flag', default: false })
  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @ApiPropertyOptional({ description: 'Is favorite flag', default: false })
  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;

  @ApiPropertyOptional({ description: 'Is archived flag', default: false })
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @ApiProperty({ description: 'Created by user ID' })
  @IsString()
  createdBy: string;
}
