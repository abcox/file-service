import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { SchedulerJob } from './scheduler-job.interface';

@Injectable()
export class SchedulerJobRegistryService {
  private readonly jobs = new Map<string, SchedulerJob>();

  constructor(private readonly logger: LoggerService) {}

  register(job: SchedulerJob): void {
    if (this.jobs.has(job.name)) {
      this.logger.warn('Scheduler job registration replaced existing entry', {
        jobName: job.name,
      });
    }
    this.jobs.set(job.name, job);
    this.logger.info('Scheduler job registered', { jobName: job.name });
  }

  get(jobName: string): SchedulerJob | undefined {
    return this.jobs.get(jobName);
  }

  listJobNames(): string[] {
    return Array.from(this.jobs.keys());
  }
}
