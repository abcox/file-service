import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { SchedulerJob } from './scheduler-job.interface';

export type SchedulerRegisteredJob = {
  key: string;
  name: string;
  description: string;
};

@Injectable()
export class SchedulerJobRegistryService {
  private readonly jobsByKey = new Map<string, SchedulerJob>();
  private readonly keyByName = new Map<string, string>();

  constructor(private readonly logger: LoggerService) {}

  private static toJobKey(job: SchedulerJob): string {
    return job.key?.trim() || job.name;
  }

  register(job: SchedulerJob): void {
    const key = SchedulerJobRegistryService.toJobKey(job);
    const existingByKey = this.jobsByKey.get(key);

    if (existingByKey && existingByKey.name !== job.name) {
      this.logger.error(
        'Scheduler job registration failed due to duplicate job key',
        undefined,
        {
          jobKey: key,
          existingJobName: existingByKey.name,
          incomingJobName: job.name,
        },
      );
      throw new Error(`Duplicate scheduler job key '${key}'`);
    }

    if (this.keyByName.has(job.name)) {
      this.logger.warn('Scheduler job registration replaced existing entry', {
        jobName: job.name,
      });
    }

    this.jobsByKey.set(key, job);
    this.keyByName.set(job.name, key);

    this.logger.info('Scheduler job registered', {
      jobName: job.name,
      jobKey: key,
    });
  }

  get(jobName: string): SchedulerJob | undefined {
    const key = this.keyByName.get(jobName);
    if (!key) {
      return undefined;
    }

    return this.jobsByKey.get(key);
  }

  listJobs(): SchedulerRegisteredJob[] {
    return Array.from(this.jobsByKey.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, job]) => ({
        key,
        name: job.name,
        description: job.description || '',
      }));
  }

  listJobNames(): string[] {
    return this.listJobs().map((job) => job.name);
  }
}
