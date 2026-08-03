import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';

type SchedulerHeartbeatConfig = {
  enabled: boolean;
  cron: string;
  timeZone: string;
};

type SchedulerConfig = {
  enabled: boolean;
  heartbeat: SchedulerHeartbeatConfig;
};

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly heartbeatJobName = 'scheduler-heartbeat';
  // Default cron expression for every 5 minutes
  private readonly defaultHeartbeatCron = '*/5 * * * *';

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly logger: LoggerService,
  ) {}

  onModuleInit(): void {
    const schedulerConfig = this.getSchedulerConfig();

    if (!schedulerConfig.enabled) {
      this.logger.info('In-process scheduler disabled by configuration');
      return;
    }

    this.registerHeartbeatJob();
  }

  onModuleDestroy(): void {
    SchedulerService.stopHeartbeatJobIfExists(
      this.schedulerRegistry,
      this.heartbeatJobName,
      this.logger,
    );
  }

  static stopHeartbeatJobIfExists(
    schedulerRegistry: SchedulerRegistry,
    jobName: string,
    logger: LoggerService,
  ): void {
    if (schedulerRegistry.doesExist('cron', jobName)) {
      const job = schedulerRegistry.getCronJob(jobName);
      void job.stop();
      schedulerRegistry.deleteCronJob(jobName);
      logger.info('Scheduler heartbeat job stopped');
    } else {
      logger.info('No scheduler heartbeat job found to stop');
    }
  }

  private registerHeartbeatJob(): void {
    const heartbeat = this.getSchedulerConfig().heartbeat;

    if (!heartbeat.enabled) {
      this.logger.info('Scheduler heartbeat disabled by configuration');
      return;
    }

    const timeZone = heartbeat.timeZone;
    const cronExpression = heartbeat.cron;

    if (this.schedulerRegistry.doesExist('cron', this.heartbeatJobName)) {
      const existingJob = this.schedulerRegistry.getCronJob(
        this.heartbeatJobName,
      );
      void existingJob.stop();
      this.schedulerRegistry.deleteCronJob(this.heartbeatJobName);
    }

    let job: CronJob;
    try {
      job = new CronJob(
        cronExpression,
        () => this.runHeartbeat(),
        null,
        false,
        timeZone,
      );
    } catch (error) {
      this.logger.error(
        'Invalid scheduler heartbeat cron expression. Falling back to default.',
        error as Error,
        {
          cronExpression,
          fallbackCronExpression: this.defaultHeartbeatCron,
          timeZone,
        },
      );
      job = new CronJob(
        this.defaultHeartbeatCron,
        () => this.runHeartbeat(),
        null,
        false,
        timeZone,
      );
    }

    this.schedulerRegistry.addCronJob(this.heartbeatJobName, job);
    job.start();

    this.logger.info('Scheduler heartbeat job registered', {
      jobName: this.heartbeatJobName,
      cronExpression: job.cronTime.source,
      timeZone,
      schedulerEnabled: true,
    });
  }

  private runHeartbeat(): void {
    this.logger.info('Scheduler heartbeat executed', {
      jobName: this.heartbeatJobName,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }

  private getSchedulerConfig(): SchedulerConfig {
    const rawConfig: unknown = this.appConfigService.getConfig();
    const root = SchedulerService.asRecord(rawConfig);
    const scheduler = SchedulerService.asRecord(root.scheduler);
    const heartbeat = SchedulerService.asRecord(scheduler.heartbeat);
    const fallbackTimeZone =
      this.appConfigService.getTimeZoneConfig().effective;

    return {
      enabled: SchedulerService.asBoolean(scheduler.enabled, false),
      heartbeat: {
        enabled: SchedulerService.asBoolean(heartbeat.enabled, false),
        cron: SchedulerService.asNonEmptyString(
          heartbeat.cron,
          this.defaultHeartbeatCron,
        ),
        timeZone: SchedulerService.asNonEmptyString(
          heartbeat.timeZone,
          fallbackTimeZone,
        ),
      },
    };
  }

  private static asRecord(value: unknown): Record<string, unknown> {
    return typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)
      : {};
  }

  private static asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
  }

  private static asNonEmptyString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : fallback;
  }
}
