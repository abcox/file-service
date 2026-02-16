import { ApiProperty } from '@nestjs/swagger';
import { people_v1 } from 'googleapis';

/**
 * DTO for a person's name from Google People API
 */
export class PersonNameDto
  implements
    Pick<people_v1.Schema$Name, 'displayName' | 'givenName' | 'familyName'>
{
  @ApiProperty({
    example: 'John Doe',
    description: 'The display name of the person',
    required: false,
  })
  displayName?: string | null;

  @ApiProperty({
    example: 'John',
    description: 'The given (first) name of the person',
    required: false,
  })
  givenName?: string | null;

  @ApiProperty({
    example: 'Doe',
    description: 'The family (last) name of the person',
    required: false,
  })
  familyName?: string | null;
}

/**
 * DTO for a person's email address from Google People API
 */
export class PersonEmailAddressDto
  implements Pick<people_v1.Schema$EmailAddress, 'value' | 'type'>
{
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'The email address',
    required: false,
  })
  value?: string | null;

  @ApiProperty({
    example: 'work',
    description: 'The type of email address (home, work, etc.)',
    required: false,
  })
  type?: string | null;
}

/**
 * DTO for a contact group member (person) from Google People API.
 * Structurally compatible with people_v1.Schema$Person for the fields we use.
 */
export class ContactGroupMemberDto {
  @ApiProperty({
    example: 'people/c8354119414991994057',
    description: 'The resource name of the person',
  })
  resourceName?: string | null;

  @ApiProperty({
    type: [PersonNameDto],
    description: 'The names associated with the person',
    required: false,
  })
  names?: PersonNameDto[];

  @ApiProperty({
    type: [PersonEmailAddressDto],
    description: 'The email addresses associated with the person',
    required: false,
  })
  emailAddresses?: PersonEmailAddressDto[];
}
