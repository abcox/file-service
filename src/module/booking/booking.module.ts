import { Module } from '@nestjs/common';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { ConfigModule } from '../config/config.module';
import { CalendarModule } from '../google/calendar/calendar.module';

@Module({
  imports: [ConfigModule, CalendarModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
