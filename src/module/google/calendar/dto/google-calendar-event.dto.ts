import { ApiProperty } from '@nestjs/swagger';
import { calendar_v3 } from 'googleapis';

// DTO representing a Google Calendar Event (calendar_v3.Schema$Event)
export class GoogleCalendarEventDto
  implements Partial<calendar_v3.Schema$Event>
{
  @ApiProperty({
    description: 'The summary of the event.',
    example: 'Summary',
  })
  summary: string;

  @ApiProperty({
    description: 'The description of the event.',
  })
  description: string;

  @ApiProperty({
    description: 'The start time of the event.',
    type: Object,
  })
  start: calendar_v3.Schema$EventDateTime;

  @ApiProperty({
    description: 'The end time of the event.',
    type: Object,
  })
  end: calendar_v3.Schema$EventDateTime;

  @ApiProperty({
    description: 'The location of the event.',
  })
  location?: string;

  @ApiProperty({
    description: 'The attendees of the event.',
    type: [Object],
  })
  attendees?: calendar_v3.Schema$EventAttendee[];
}
