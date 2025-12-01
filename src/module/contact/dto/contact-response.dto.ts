import { ApiProperty } from '@nestjs/swagger';
import { IContact } from '../../db/doc/entity/contact/contact.entity';
import { GetContactListResponse } from '../contact.service';

export class ContactResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Contact created successfully' })
  message!: string;

  @ApiProperty({ description: 'Contact data' })
  data?: IContact;

  @ApiProperty({
    type: [String],
    example: ['Validation error'],
  })
  errors?: string[];
}

export class ContactListResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Found 10 contacts (25 total)' })
  message!: string;

  @ApiProperty({ description: 'Paginated contact list data' })
  data?: GetContactListResponse;

  @ApiProperty({ type: [String], example: ['Database error'] })
  errors?: string[];
}
