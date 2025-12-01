import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ContactEmail } from '../../db/doc/entity/contact/contact.entity';

export class ContactEmailDto implements ContactEmail {
  @ApiProperty({ example: 'john.doe@company.com' })
  @IsEmail()
  address!: string;

  @ApiProperty({ enum: ['work', 'personal', 'other'], example: 'work' })
  @IsString()
  type!: 'work' | 'personal' | 'other';

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
