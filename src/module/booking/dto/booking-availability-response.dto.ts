import { ApiProperty } from '@nestjs/swagger';
import { BookingConfigDto } from './booking-config.dto';
import { BookingSlotDto } from './booking-slot.dto';

export class BookingAvailabilityResponseDto {
  @ApiProperty({ type: BookingConfigDto })
  config: BookingConfigDto;

  @ApiProperty({ example: '2026-06-02' })
  date: string;

  @ApiProperty({ type: [BookingSlotDto] })
  availableSlots: BookingSlotDto[];

  @ApiProperty({ format: 'date-time' })
  generatedAtUtc: string;

  @ApiProperty({ required: false })
  message?: string;
}
