import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDateString,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IContact,
  ContactPhone,
  ContactEmail,
  ContactAddress,
  SocialMedia,
} from '../../db/doc/entity/contact/contact.entity';
import { ContactEmailDto } from './contact-email.dto';
import { ContactPhoneDto } from './contact-phone.dto';
import { ContactAddressDto } from './contact-address.dto';
import { SocialMediaDto } from './social-media.dto';

// Type alias that references the entity directly - ensures perfect sync
type CreateContactData = Omit<IContact, '_id' | 'createdAt' | 'updatedAt'>;

export class CreateContactDto implements CreateContactData {
  // Fields are automatically inherited from IContact - just add validation decorators
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  declare name: string;

  @ApiProperty({ required: false, example: 'John' })
  @IsOptional()
  @IsString()
  declare firstName?: string;

  @ApiProperty({ required: false, example: 'Doe' })
  @IsOptional()
  @IsString()
  declare lastName?: string;

  @ApiProperty({
    type: [ContactEmailDto],
    description: 'Contact email addresses',
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one email address is required' })
  @ValidateNested({ each: true })
  @Type(() => ContactEmailDto)
  declare emails: ContactEmail[];

  @ApiProperty({
    type: [ContactPhoneDto],
    description: 'Contact phone numbers',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactPhoneDto)
  declare phones?: ContactPhone[];

  @ApiProperty({ type: [ContactAddressDto], description: 'Contact addresses' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContactAddressDto)
  declare addresses?: ContactAddress[];

  @ApiProperty({ required: false, example: 'Acme Corporation' })
  @IsOptional()
  @IsString()
  declare company?: string;

  @ApiProperty({ required: false, example: 'Senior Developer' })
  @IsOptional()
  @IsString()
  declare title?: string;

  @ApiProperty({ required: false, example: 'Engineering' })
  @IsOptional()
  @IsString()
  declare department?: string;

  @ApiProperty({
    example: 'active',
    description: 'Contact status (references metadata)',
  })
  @IsString()
  declare status: string;

  @ApiProperty({
    example: 'website',
    description: 'Contact source (references metadata)',
  })
  @IsString()
  declare source: string;

  @ApiProperty({ type: [String], example: ['hot-lead', 'decision-maker'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  declare tags?: string[];

  @ApiProperty({
    required: false,
    example: 'technology',
    description: 'Industry (references metadata)',
  })
  @IsOptional()
  @IsString()
  declare industry?: string;

  @ApiProperty({
    required: false,
    example: 'high',
    description: 'Priority level (references metadata)',
  })
  @IsOptional()
  @IsString()
  declare priority?: string;

  @ApiProperty({
    required: false,
    example: 'user123',
    description: 'Assigned user ID',
  })
  @IsOptional()
  @IsString()
  declare assignedTo?: string;

  @ApiProperty({
    required: false,
    type: Date,
    description: 'Last contact date',
  })
  @IsOptional()
  @IsDateString()
  declare lastContactedAt?: Date;

  @ApiProperty({
    required: false,
    type: Date,
    description: 'Next follow-up date',
  })
  @IsOptional()
  @IsDateString()
  declare nextFollowUpAt?: Date;

  @ApiProperty({ required: false, example: 'https://company.com' })
  @IsOptional()
  @IsString()
  declare website?: string;

  @ApiProperty({ type: [SocialMediaDto], description: 'Social media profiles' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SocialMediaDto)
  declare socialMedia?: SocialMedia[];

  @ApiProperty({ required: false, example: 'Important client contact' })
  @IsOptional()
  @IsString()
  declare notes?: string;

  @ApiProperty({ example: true, description: 'Active status flag' })
  @IsBoolean()
  declare isActive: boolean;

  @ApiProperty({
    required: false,
    example: 'user123',
    description: 'Creator user ID',
  })
  @IsOptional()
  @IsString()
  declare createdBy?: string;
}
