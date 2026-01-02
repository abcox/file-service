import { ApiProperty } from '@nestjs/swagger';
import { GoogleCalendarEventDto } from './google-calendar-event.dto';

export class CalendarEventCreatePostRequestDto {
  @ApiProperty({
    description: 'Calendar Event to be created',
    type: GoogleCalendarEventDto,
  })
  event: GoogleCalendarEventDto;

  @ApiProperty({
    description:
      'Whether to send update notifications to attendees. Default is false.',
    example: false,
  })
  sendUpdates?: boolean;
}
