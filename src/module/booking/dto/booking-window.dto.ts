import { ApiProperty } from '@nestjs/swagger';

export class BookingWindowDto {
  @ApiProperty({
    description: 'Day of week where 0=Sunday and 6=Saturday',
    minimum: 0,
    maximum: 6,
    example: 1,
  })
  dayOfWeek: number;

  @ApiProperty({
    description: 'Window start hour in 24-hour time',
    minimum: 0,
    maximum: 23,
    example: 9,
  })
  startHour24: number;

  @ApiProperty({
    description: 'Window end hour in 24-hour time',
    minimum: 1,
    maximum: 24,
    example: 17,
  })
  endHour24: number;

  @ApiProperty({
    description: 'Optional max duration for bookings in this window',
    required: false,
    example: 60,
  })
  maxMinutesPerBooking?: number;
}
