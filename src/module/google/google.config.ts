import { GoogleApisEmailServiceOptions } from '../gmail/gmail.service';
import { GoogleApisCalendarServiceOptions } from './calendar/calendar.service';
import { GoogleApisPeopleServiceOptions } from './people/people.service';

export interface GoogleApis {
  calendarServiceOptions?: GoogleApisCalendarServiceOptions;
  emailServiceOptions?: GoogleApisEmailServiceOptions;
  peopleServiceOptions?: GoogleApisPeopleServiceOptions;
  serviceAccountJsonContent?: string;
  serviceAccountJsonKeyFilePathname?: string;
  userEmail?: string; // For domain-wide delegation
}
