import { ApiProperty } from '@nestjs/swagger';

export class BookingSlotDto {
  @ApiProperty({ format: 'date-time' })
  startUtc: string;

  @ApiProperty({ format: 'date-time' })
  endUtc: string;

  @ApiProperty({ example: '9:00 AM' })
  startLabel: string;

  @ApiProperty({ example: 30 })
  durationMinutes: number;
}
