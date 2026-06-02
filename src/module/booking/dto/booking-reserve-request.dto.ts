import { ApiProperty } from '@nestjs/swagger';

export class BookingReserveRequestDto {
  @ApiProperty({ format: 'date-time' })
  startUtc: string;

  @ApiProperty({ required: false, example: 30 })
  durationMinutes?: number;

  @ApiProperty({ required: false, example: 'America/Toronto' })
  timezone?: string;

  @ApiProperty({ example: 'Ada Lovelace' })
  name: string;

  @ApiProperty({ example: 'ada@example.com' })
  email: string;

  @ApiProperty({ required: false, example: '555-123-4567' })
  phone?: string;

  @ApiProperty({ required: false, example: 'Discovery Call' })
  subject?: string;

  @ApiProperty({ required: false, example: 'Looking forward to connecting.' })
  comments?: string;
}
