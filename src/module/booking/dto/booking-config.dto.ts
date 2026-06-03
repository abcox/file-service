import { ApiProperty } from '@nestjs/swagger';
import { BookingWindowDto } from './booking-window.dto';

export class BookingConfigDto {
  @ApiProperty({ example: true })
  enabled: boolean;

  @ApiProperty({ example: false })
  includeWeekendDays: boolean;

  @ApiProperty({ required: false })
  calendarId?: string;

  @ApiProperty({ example: 'America/Toronto' })
  timezone: string;

  @ApiProperty({ example: 21 })
  maxDaysInFuture: number;

  @ApiProperty({ example: 15 })
  slotIntervalMinutes: number;

  @ApiProperty({ example: 30 })
  defaultMeetingDurationMinutes: number;

  @ApiProperty({ example: 60 })
  maxMinutesPerBooking: number;

  @ApiProperty({ type: [BookingWindowDto] })
  workingWindows: BookingWindowDto[];
}
