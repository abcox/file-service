import { ApiProperty } from '@nestjs/swagger';

export class CalendarEventDeleteBatchPostRequestDto {
  @ApiProperty({
    description: 'Array of Calendar Event IDs to be deleted',
    type: [String],
  })
  eventIds: string[];
}
