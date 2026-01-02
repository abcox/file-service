import { ApiProperty } from '@nestjs/swagger';
import { GoogleCalendarEventDto } from './google-calendar-event.dto';

export class CalendarEventCreatePostResponseDto {
  @ApiProperty({
    description: 'The ID of the created calendar event',
  })
  event: GoogleCalendarEventDto;

  @ApiProperty({
    description: 'Array of results for each create operation',
    type: [Object],
  })
  meta: { message: string; success: boolean };
}
