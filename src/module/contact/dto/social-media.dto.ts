import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { SocialMedia } from '../../db/doc/entity/contact/contact.entity';

export class SocialMediaDto implements SocialMedia {
  @ApiProperty({ example: 'linkedin' })
  @IsString()
  platform!: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe' })
  @IsString()
  profileUrl!: string;
}
