import { GoogleApisEmailServiceOptions } from '../gmail/gmail.service';
import { GoogleApisPeopleServiceOptions } from './people/people.service';

export interface GoogleApis {
  emailServiceOptions?: GoogleApisEmailServiceOptions;
  peopleServiceOptions?: GoogleApisPeopleServiceOptions;
  serviceAccountJsonKeyFilePathname?: string;
  userEmail?: string; // For domain-wide delegation
}
