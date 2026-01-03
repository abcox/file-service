/* {l402nn3t2jiib4fh1vrrgecjs4
  "createConference": true
} */

import { ApiProperty } from '@nestjs/swagger';
import { GoogleCalendarEventDto } from './google-calendar-event.dto';

export class CalendarEventPatchRequestDto {
  @ApiProperty({
    description: 'Calendar Event fields to be updated',
    type: GoogleCalendarEventDto,
    required: false,
  })
  event?: Partial<GoogleCalendarEventDto>;

  @ApiProperty({
    description: 'Flag to indicate if a conference should be created',
    type: Boolean,
    required: false,
  })
  createConference?: boolean;

  @ApiProperty({
    description: 'Flag to indicate if update notifications should be sent',
    enum: ['all', 'externalOnly', 'none'],
    type: String,
    required: false,
  })
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}
