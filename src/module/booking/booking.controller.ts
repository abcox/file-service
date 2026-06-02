import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../auth';
import { BookingService } from './booking.service';
import { BookingAvailabilityResponseDto } from './dto/booking-availability-response.dto';
import { BookingReserveRequestDto } from './dto/booking-reserve-request.dto';
import { BookingReserveResponseDto } from './dto/booking-reserve-response.dto';

@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get('availability')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Get booking config and available slots',
    description:
      'Returns effective booking configuration and available slots for a requested date.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Date in YYYY-MM-DD format. Defaults to current date.',
  })
  @ApiResponse({
    status: 200,
    description: 'Booking availability response',
    type: BookingAvailabilityResponseDto,
  })
  async getAvailability(
    @Query('date') date?: string,
  ): Promise<BookingAvailabilityResponseDto> {
    return this.bookingService.getAvailability(date);
  }

  @Post('reserve')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Reserve a booking slot',
    description:
      'Validates selected slot is still available and creates calendar event if valid.',
  })
  @ApiBody({ type: BookingReserveRequestDto })
  @ApiResponse({
    status: 201,
    description: 'Booking reserved successfully',
    type: BookingReserveResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Requested slot is no longer available. Response includes refreshed slots.',
  })
  async reserve(
    @Body() request: BookingReserveRequestDto,
  ): Promise<BookingReserveResponseDto> {
    return this.bookingService.reserve(request);
  }
}
