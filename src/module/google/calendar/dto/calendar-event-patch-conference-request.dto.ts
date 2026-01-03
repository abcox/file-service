/* {l402nn3t2jiib4fh1vrrgecjs4
  "createConference": true
} */

import { ApiProperty } from '@nestjs/swagger';

export class CalendarEventPatchConferenceRequestDto {
  @ApiProperty({
    description: 'Flag to indicate if a conference should be created',
    type: Boolean,
    required: false,
  })
  createConference: boolean;

  @ApiProperty({
    description: 'Flag to indicate if update notifications should be sent',
    type: Boolean,
    required: false,
  })
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}
