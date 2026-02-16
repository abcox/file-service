import { ApiProperty } from '@nestjs/swagger';
import { people_v1 } from 'googleapis';

export class ContactGroupDto {
  @ApiProperty({
    example: 'contactGroups/0123456789abcdef',
    description: 'The resource name of the contact group',
  })
  resourceName: string;

  @ApiProperty({
    example: 'etag-value',
    description: 'The ETag of the contact group',
  })
  etag: string;

  @ApiProperty({
    example: 'Friends',
    description: 'The name of the contact group',
  })
  name: string;

  @ApiProperty({
    example: 42,
    description: 'The number of members in the contact group',
  })
  memberCount: number;

  constructor(group: people_v1.Schema$ContactGroup) {
    this.resourceName = group.resourceName || '';
    this.etag = group.etag || '';
    this.name = group.name || '';
    this.memberCount = group.memberCount || 0;
  }
}

export class ContactGroupsListDto {
  @ApiProperty({
    description: 'List of contact groups',
    type: [ContactGroupDto],
  })
  contactGroups: ContactGroupDto[];

  @ApiProperty({
    //example: 'token-for-next-page',
    description: 'Token to retrieve the next page of results, if any',
    required: false,
  })
  nextPageToken?: string | null;

  @ApiProperty({
    example: 5,
    description: 'Total number of contact groups available',
    required: false,
  })
  totalItems?: number | null;

  constructor(response: people_v1.Schema$ListContactGroupsResponse) {
    this.contactGroups = (response.contactGroups || []).map(
      (g) => new ContactGroupDto(g),
    );
    this.nextPageToken = response.nextPageToken;
    this.totalItems = response.totalItems;
  }
}
