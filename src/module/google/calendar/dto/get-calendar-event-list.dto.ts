import { calendar_v3 } from 'googleapis';

export class GetGoogleCalendarListDto {
  items: calendar_v3.Schema$Events[];
  length: number;
}
