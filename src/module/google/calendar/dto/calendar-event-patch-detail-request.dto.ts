/* {l402nn3t2jiib4fh1vrrgecjs4
  "createConference": true
} */

import { ApiProperty } from '@nestjs/swagger';
import { GoogleCalendarEventDto } from './google-calendar-event.dto';

export class CalendarEventPatchDetailRequestDto {
  @ApiProperty({
    description: 'Calendar Event fields to be updated',
    type: GoogleCalendarEventDto,
  })
  event: Partial<GoogleCalendarEventDto>;

  @ApiProperty({
    description: 'Flag to indicate if update notifications should be sent',
    type: Boolean,
    required: false,
  })
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}
