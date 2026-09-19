import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SchedulerJobConfigDocument } from './scheduler-job-config.schema';

export const SCHEDULER_JOB_CONFIG_MODEL = 'SchedulerJobConfig';

export type SchedulerJobConfigRecord = {
  jobKey: string;
  jobName: string;
  description: string;
  enabled: boolean;
  cron: string;
  timeZone: string;
  deprecatedOn?: Date | null;
  discoveredOn?: Date;
  lastSeenOn?: Date;
  updatedAt?: Date;
  version: number;
};

export type SchedulerJobImplementationRecordInput = {
  jobKey: string;
  jobName: string;
  description: string;
  enabled: boolean;
  cron: string;
  timeZone: string;
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

  async listActive(): Promise<SchedulerJobConfigRecord[]> {
    const docs = await this.schedulerJobConfigModel
      .find({ deprecatedOn: null })
      .sort({ jobName: 1 })
      .exec();
    return docs.map((doc) => SchedulerConfigStoreService.toRecord(doc));
  }

  async getByJobName(
    jobName: string,
  ): Promise<SchedulerJobConfigRecord | null> {
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

  async syncFromImplementations(input: {
    jobs: SchedulerJobImplementationRecordInput[];
  }): Promise<{
    upsertedCount: number;
    deprecatedCount: number;
  }> {
    const now = new Date();
    const activeKeys = input.jobs.map((job) => job.jobKey);

    for (const job of input.jobs) {
      await this.schedulerJobConfigModel
        .findOneAndUpdate(
          {
            $or: [{ jobKey: job.jobKey }, { jobName: job.jobName }],
          },
          {
            $set: {
              jobKey: job.jobKey,
              jobName: job.jobName,
              description: job.description,
              enabled: job.enabled,
              cron: job.cron,
              timeZone: job.timeZone,
              lastSeenOn: now,
              deprecatedOn: null,
            },
            $setOnInsert: {
              discoveredOn: now,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();
    }

    let deprecatedCount = 0;
    if (activeKeys.length > 0) {
      const deprecatedResult = await this.schedulerJobConfigModel
        .updateMany(
          {
            jobKey: { $nin: activeKeys },
            deprecatedOn: null,
          },
          {
            $set: {
              deprecatedOn: now,
            },
          },
        )
        .exec();
      deprecatedCount = deprecatedResult.modifiedCount;
    }

    return {
      upsertedCount: input.jobs.length,
      deprecatedCount,
    };
  }

  private static toRecord(
    doc: SchedulerJobConfigDocument,
  ): SchedulerJobConfigRecord {
    return {
      jobKey: doc.jobKey || doc.jobName,
      jobName: doc.jobName,
      description: doc.description || '',
      enabled: doc.enabled,
      cron: doc.cron,
      timeZone: doc.timeZone,
      deprecatedOn: doc.deprecatedOn ?? null,
      discoveredOn: doc.discoveredOn,
      lastSeenOn: doc.lastSeenOn,
      updatedAt: doc.updatedAt,
      version: typeof doc.__v === 'number' ? doc.__v : 0,
    };
  }
}
