import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { ContactAddress } from '../../db/doc/entity/contact/contact.entity';

export class ContactAddressDto implements ContactAddress {
  @ApiProperty({ required: false, example: '123 Main St' })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiProperty({ required: false, example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ required: false, example: 'NY' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false, example: '10001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiProperty({ required: false, example: 'USA' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({
    enum: ['work', 'home', 'billing', 'shipping'],
    example: 'work',
  })
  @IsString()
  type!: 'work' | 'home' | 'billing' | 'shipping';
}
