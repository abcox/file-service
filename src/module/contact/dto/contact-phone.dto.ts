import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ContactPhone } from '../../db/doc/entity/contact/contact.entity';

export class ContactPhoneDto implements ContactPhone {
  @ApiProperty({ example: '+1-555-123-4567' })
  @IsString()
  number!: string;

  @ApiProperty({ enum: ['mobile', 'work', 'home', 'fax'], example: 'work' })
  @IsString()
  type!: 'mobile' | 'work' | 'home' | 'fax';

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
