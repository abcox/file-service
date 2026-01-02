import { ApiProperty } from '@nestjs/swagger';

export class CalendarEventDeleteBatchPostResponseDto {
  @ApiProperty({
    description: 'Array of results for each delete operation',
    type: [Object],
  })
  results: { eventId: string; success: boolean }[];
}
