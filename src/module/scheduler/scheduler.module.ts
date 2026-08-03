import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '../config/config.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), ConfigModule],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerAppModule {}
