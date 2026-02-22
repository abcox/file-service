import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { ConfigModule } from '../../config/config.module';
import { DiagnosticModule } from '../../diagnostic/diagnostic.module';

@Module({
  imports: [ConfigModule, DiagnosticModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
