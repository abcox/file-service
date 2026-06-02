import { ApiProperty } from '@nestjs/swagger';
import { BookingSlotDto } from './booking-slot.dto';
import { GoogleCalendarEventDto } from '../../google/calendar/dto/google-calendar-event.dto';

export class BookingReserveResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: BookingSlotDto })
  slot: BookingSlotDto;

  @ApiProperty({
    description: 'Created calendar event payload from Google Calendar API',
    type: GoogleCalendarEventDto,
  })
  event: GoogleCalendarEventDto;
}
