import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '../config/config.module';
import { DocDbModule } from '../db/doc/doc-db.module';
import { GmailModule } from '../gmail/gmail.module';
import { SchedulerService } from './scheduler.service';
import { SchedulerJobRegistryService } from './scheduler-job-registry.service';
import { InvitePilotSchedulerJob } from './jobs/invite-pilot.scheduler-job';
import { SchedulerController } from './scheduler.controller';
import {
  SCHEDULER_JOB_CONFIG_MODEL,
  SchedulerConfigStoreService,
} from './scheduler-config-store.service';
import { SchedulerJobConfigSchema } from './scheduler-job-config.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    GmailModule,
    DocDbModule,
    MongooseModule.forFeature([
      {
        name: SCHEDULER_JOB_CONFIG_MODEL,
        schema: SchedulerJobConfigSchema,
      },
    ]),
  ],
  controllers: [SchedulerController],
  providers: [
    SchedulerService,
    SchedulerJobRegistryService,
    SchedulerConfigStoreService,
    InvitePilotSchedulerJob,
  ],
  exports: [SchedulerService, SchedulerJobRegistryService],
})
export class SchedulerAppModule {
  constructor(
    private readonly schedulerService: SchedulerService,
    private readonly invitePilotSchedulerJob: InvitePilotSchedulerJob,
  ) {}
}
