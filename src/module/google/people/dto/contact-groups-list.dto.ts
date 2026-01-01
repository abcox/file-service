import { people_v1 } from 'googleapis';

export class ContactGroupDto {
  resourceName: string;
  etag: string;
  name: string;
  memberCount: number;

  constructor(group: people_v1.Schema$ContactGroup) {
    this.resourceName = group.resourceName || '';
    this.etag = group.etag || '';
    this.name = group.name || '';
    this.memberCount = group.memberCount || 0;
  }
}

export class ContactGroupsListDto {
  contactGroups: ContactGroupDto[];
  nextPageToken?: string | null;
  totalItems?: number | null;

  constructor(response: people_v1.Schema$ListContactGroupsResponse) {
    this.contactGroups = (response.contactGroups || []).map(
      (g) => new ContactGroupDto(g),
    );
    this.nextPageToken = response.nextPageToken;
    this.totalItems = response.totalItems;
  }
}
