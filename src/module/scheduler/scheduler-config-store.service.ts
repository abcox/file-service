import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SchedulerJobConfigDocument,
} from './scheduler-job-config.schema';

export const SCHEDULER_JOB_CONFIG_MODEL = 'SchedulerJobConfig';

export type SchedulerJobConfigRecord = {
  jobName: string;
  enabled: boolean;
  cron: string;
  timeZone: string;
  updatedAt?: Date;
  version: number;
};

@Injectable()
export class SchedulerConfigStoreService {
  constructor(
    @InjectModel(SCHEDULER_JOB_CONFIG_MODEL)
    private readonly schedulerJobConfigModel: Model<SchedulerJobConfigDocument>,
  ) {}

  async listAll(): Promise<SchedulerJobConfigRecord[]> {
    const docs = await this.schedulerJobConfigModel
      .find({})
      .sort({ jobName: 1 })
      .exec();
    return docs.map((doc) => SchedulerConfigStoreService.toRecord(doc));
  }

  async getByJobName(jobName: string): Promise<SchedulerJobConfigRecord | null> {
    const doc = await this.schedulerJobConfigModel.findOne({ jobName }).exec();
    return doc ? SchedulerConfigStoreService.toRecord(doc) : null;
  }

  async upsertJobConfig(input: {
    jobName: string;
    enabled: boolean;
    cron: string;
    timeZone: string;
  }): Promise<SchedulerJobConfigRecord> {
    const doc = await this.schedulerJobConfigModel
      .findOneAndUpdate(
        { jobName: input.jobName },
        {
          $set: {
            enabled: input.enabled,
            cron: input.cron,
            timeZone: input.timeZone,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      )
      .exec();

    return SchedulerConfigStoreService.toRecord(doc);
  }

  private static toRecord(
    doc: SchedulerJobConfigDocument,
  ): SchedulerJobConfigRecord {
    return {
      jobName: doc.jobName,
      enabled: doc.enabled,
      cron: doc.cron,
      timeZone: doc.timeZone,
      updatedAt: doc.updatedAt,
      version: typeof doc.__v === 'number' ? doc.__v : 0,
    };
  }
}
