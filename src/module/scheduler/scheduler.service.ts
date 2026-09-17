import {
  BadRequestException,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import { SchedulerJobRegistryService } from './scheduler-job-registry.service';
import {
  SchedulerJob,
  SchedulerJobContext,
  SchedulerJobEventType,
  SchedulerJobProgress,
} from './scheduler-job.interface';
import {
  resolveSchedulerConfig,
  SchedulerConfigResolved,
  SchedulerJobScheduleResolved,
} from './scheduler-config.resolver';
import {
  SchedulerConfigStoreService,
  SchedulerJobConfigRecord,
} from './scheduler-config-store.service';

@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly heartbeatJobName = 'scheduler-heartbeat';

  private getScheduledJobName(jobName: string): string {
    return `scheduler-job:${jobName}`;
  }

  constructor(
    private readonly appConfigService: AppConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly logger: LoggerService,
    private readonly schedulerJobRegistry: SchedulerJobRegistryService,
    private readonly schedulerConfigStore: SchedulerConfigStoreService,
  ) {}

  async onModuleInit(): Promise<void> {
    const schedulerConfig = this.getSchedulerConfig();

    if (!schedulerConfig.enabled) {
      this.logger.info('In-process scheduler disabled by configuration');
      return;
    }

    this.registerHeartbeatJob();
    await this.reloadJobSchedules();
  }

  async getStatus(): Promise<{
    schedulerEnabled: boolean;
    heartbeat: {
      enabled: boolean;
      cron: string;
      timeZone: string;
      registered: boolean;
    };
    dbConfig: {
      recordCount: number;
      latestUpdatedAt?: string;
      maxVersion: number;
    };
    registeredImplementations: string[];
    scheduledCronJobs: string[];
  }> {
    const config = this.getSchedulerConfig();
    const dbConfigs = await this.schedulerConfigStore.listAll();
    const latestUpdatedAt = dbConfigs
      .map((item) => item.updatedAt)
      .filter((value): value is Date => value instanceof Date)
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const maxVersion = dbConfigs.reduce(
      (max, item) => Math.max(max, item.version),
      0,
    );

    return {
      schedulerEnabled: config.enabled,
      heartbeat: {
        enabled: config.heartbeat.enabled,
        cron: config.heartbeat.cron,
        timeZone: config.heartbeat.timeZone,
        registered: this.schedulerRegistry.doesExist(
          'cron',
          this.heartbeatJobName,
        ),
      },
      dbConfig: {
        recordCount: dbConfigs.length,
        latestUpdatedAt: latestUpdatedAt?.toISOString(),
        maxVersion,
      },
      registeredImplementations: this.schedulerJobRegistry.listJobNames(),
      scheduledCronJobs: Array.from(
        this.schedulerRegistry.getCronJobs().keys(),
      ),
    };
  }

  async listJobs(): Promise<
    Array<{
      key?: string;
      name: string;
      description?: string;
      configured: boolean;
      configuredEnabled: boolean;
      cron: string;
      timeZone: string;
      dbConfigured: boolean;
      dbEnabled: boolean;
      dbCron: string;
      dbTimeZone: string;
      dbUpdatedAt?: string;
      dbVersion?: number;
      deprecatedOn?: string | null;
      implementationRegistered: boolean;
      scheduled: boolean;
      lifecycleState:
        | 'active'
        | 'unscheduled'
        | 'deprecated'
        | 'misconfigured'
        | 'missing-implementation';
      unscheduledReason?: string;
    }>
  > {
    const config = this.getSchedulerConfig();
    const byName = new Map(config.jobs.map((job) => [job.name, job]));
    const dbRecords = await this.schedulerConfigStore.listAll();
    const dbByName = new Map(dbRecords.map((job) => [job.jobName, job]));
    const registered = this.schedulerJobRegistry.listJobs();
    const registeredByName = new Map(registered.map((job) => [job.name, job]));
    const names = new Set<string>([
      ...byName.keys(),
      ...dbByName.keys(),
      ...registeredByName.keys(),
    ]);

    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => {
        const configured = byName.get(name);
        const dbConfigured = dbByName.get(name);
        const implementation = registeredByName.get(name);
        const scheduled = this.schedulerRegistry.doesExist(
          'cron',
          this.getScheduledJobName(name),
        );
        const deprecated = dbConfigured?.deprecatedOn ?? null;
        const hasCron = Boolean(dbConfigured?.cron || configured?.cron);
        const hasValidCron = Boolean(
          (dbConfigured?.cron || configured?.cron) &&
            SchedulerService.isValidCron(
              (dbConfigured?.cron || configured?.cron) ?? '',
              (dbConfigured?.timeZone || configured?.timeZone || 'UTC') ??
                'UTC',
            ),
        );

        let lifecycleState:
          | 'active'
          | 'unscheduled'
          | 'deprecated'
          | 'misconfigured'
          | 'missing-implementation';
        let unscheduledReason: string | undefined;

        if (deprecated) {
          lifecycleState = 'deprecated';
          unscheduledReason = 'deprecated';
        } else if (!implementation) {
          lifecycleState = 'missing-implementation';
          unscheduledReason = 'missing-implementation';
        } else if (!scheduled) {
          lifecycleState = 'unscheduled';
          unscheduledReason = hasCron
            ? 'implemented-but-not-scheduled'
            : 'missing-cron';
        } else if (!hasCron || !hasValidCron) {
          lifecycleState = 'misconfigured';
          unscheduledReason = !hasCron ? 'missing-cron' : 'invalid-cron';
        } else {
          lifecycleState = 'active';
        }

        return {
          key: implementation?.key,
          name,
          description: implementation?.description,
          configured: Boolean(configured),
          configuredEnabled: configured?.enabled ?? false,
          cron: configured?.cron ?? '',
          timeZone: configured?.timeZone ?? '',
          dbConfigured: Boolean(dbConfigured),
          dbEnabled: dbConfigured?.enabled ?? false,
          dbCron: dbConfigured?.cron ?? '',
          dbTimeZone: dbConfigured?.timeZone ?? '',
          dbUpdatedAt: dbConfigured?.updatedAt?.toISOString(),
          dbVersion: dbConfigured?.version,
          deprecatedOn: deprecated ? deprecated.toISOString() : null,
          implementationRegistered: Boolean(implementation),
          scheduled,
          lifecycleState,
          unscheduledReason,
        };
      });
  }

  async reloadJobSchedules(): Promise<{
    configuredJobCount: number;
    dbRecordCount: number;
    dbOverrides: number;
    scheduledCount: number;
    skippedDisabledCount: number;
    skippedInvalidCount: number;
    skippedMissingImplementationCount: number;
  }> {
    this.clearConfiguredJobs();

    await this.syncRegisteredJobsWithConfigStore();

    const effective = await this.getEffectiveJobSchedules();
    const knownJobs = this.schedulerJobRegistry.listJobNames();

    this.logger.info('Scheduler applying effective job configuration', {
      knownJobs,
      configuredJobs: effective.schedules.map((job) => job.name),
      dbRecordCount: effective.dbRecordCount,
      dbOverrides: effective.dbOverrides,
    });

    let scheduledCount = 0;
    let skippedDisabledCount = 0;
    let skippedInvalidCount = 0;
    let skippedMissingImplementationCount = 0;

    for (const jobSchedule of effective.schedules) {
      const jobName = jobSchedule.name;

      if (!jobSchedule.enabled) {
        skippedDisabledCount += 1;
        this.logger.info('Scheduler job disabled by effective configuration', {
          jobName,
        });
        continue;
      }

      if (!this.schedulerJobRegistry.get(jobName)) {
        skippedMissingImplementationCount += 1;
        this.logger.warn('Scheduler job skipped: implementation not found', {
          jobName,
        });
        continue;
      }

      if (!jobSchedule.cron) {
        skippedInvalidCount += 1;
        this.logger.error(
          'Scheduler job configuration is invalid: cron is required',
          undefined,
          {
            jobName,
          },
        );
        continue;
      }

      if (!SchedulerService.isValidTimeZone(jobSchedule.timeZone)) {
        skippedInvalidCount += 1;
        this.logger.error(
          'Scheduler job configuration is invalid: timeZone is invalid',
          undefined,
          {
            jobName,
            timeZone: jobSchedule.timeZone,
          },
        );
        continue;
      }

      if (
        !SchedulerService.isValidCron(jobSchedule.cron, jobSchedule.timeZone)
      ) {
        skippedInvalidCount += 1;
        this.logger.error(
          'Scheduler job configuration is invalid: cron is invalid',
          undefined,
          {
            jobName,
            cronExpression: jobSchedule.cron,
            timeZone: jobSchedule.timeZone,
          },
        );
        continue;
      }

      this.logger.info('Scheduler job configuration validated', {
        jobName,
        cronExpression: jobSchedule.cron,
        timeZone: jobSchedule.timeZone,
      });

      const scheduledJobName = this.getScheduledJobName(jobName);
      this.registerCronJob(
        scheduledJobName,
        jobSchedule.cron,
        jobSchedule.timeZone,
        () => {
          void this.executeScheduledJobByName(jobName, 'cron');
        },
      );
      scheduledCount += 1;
    }

    return {
      configuredJobCount: effective.schedules.length,
      dbRecordCount: effective.dbRecordCount,
      dbOverrides: effective.dbOverrides,
      scheduledCount,
      skippedDisabledCount,
      skippedInvalidCount,
      skippedMissingImplementationCount,
    };
  }

  async upsertJobConfig(
    jobName: string,
    updates: {
      enabled?: boolean;
      cron?: string;
      timeZone?: string;
    },
  ): Promise<{
    config: SchedulerJobConfigRecord;
    reload: {
      configuredJobCount: number;
      dbRecordCount: number;
      dbOverrides: number;
      scheduledCount: number;
      skippedDisabledCount: number;
      skippedInvalidCount: number;
      skippedMissingImplementationCount: number;
    };
  }> {
    const current = await this.schedulerConfigStore.getByJobName(jobName);
    if (current?.deprecatedOn) {
      throw new BadRequestException(
        `Job '${jobName}' is deprecated and cannot be updated via scheduler config. Update the implementation or remove the deprecated record first.`,
      );
    }

    const configured = this.getSchedulerConfig().jobs.find(
      (job) => job.name === jobName,
    );
    const fallbackTimeZone =
      this.appConfigService.getTimeZoneConfig().effective;

    const next = {
      enabled:
        updates.enabled ?? current?.enabled ?? configured?.enabled ?? false,
      cron: updates.cron ?? current?.cron ?? configured?.cron ?? '',
      timeZone:
        updates.timeZone ??
        current?.timeZone ??
        configured?.timeZone ??
        fallbackTimeZone,
    };

    if (next.enabled && !next.cron) {
      throw new BadRequestException(
        'Cannot enable job without a valid cron expression',
      );
    }

    if (next.cron && !SchedulerService.isValidCron(next.cron, next.timeZone)) {
      throw new BadRequestException(
        `Invalid cron '${next.cron}' for time zone '${next.timeZone}'`,
      );
    }

    if (!SchedulerService.isValidTimeZone(next.timeZone)) {
      throw new BadRequestException(`Invalid time zone '${next.timeZone}'`);
    }

    const config = await this.schedulerConfigStore.upsertJobConfig({
      jobName,
      ...next,
    });
    const reload = await this.reloadJobSchedules();

    return {
      config,
      reload,
    };
  }

  async setJobEnabled(
    jobName: string,
    enabled: boolean,
  ): Promise<{
    config: SchedulerJobConfigRecord;
    reload: {
      configuredJobCount: number;
      dbRecordCount: number;
      dbOverrides: number;
      scheduledCount: number;
      skippedDisabledCount: number;
      skippedInvalidCount: number;
      skippedMissingImplementationCount: number;
    };
  }> {
    return this.upsertJobConfig(jobName, { enabled });
  }

  async syncRegisteredJobsMetadata(): Promise<{
    upsertedCount: number;
    deprecatedCount: number;
  }> {
    return this.syncRegisteredJobsWithConfigStore();
  }

  async runJobNow(
    jobName: string,
  ): Promise<{ jobName: string; trigger: 'manual' }> {
    await this.executeScheduledJobByName(jobName, 'manual');
    return {
      jobName,
      trigger: 'manual',
    };
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

    if (!heartbeat.cron) {
      this.logger.error(
        'Scheduler heartbeat configuration is invalid: cron is required',
        undefined,
        {
          jobName: this.heartbeatJobName,
        },
      );
      return;
    }

    const timeZone = heartbeat.timeZone;
    const cronExpression = heartbeat.cron;
    const onHeartbeatTick = (): void => {
      this.runHeartbeat();
    };

    this.registerCronJob(
      this.heartbeatJobName,
      cronExpression,
      timeZone,
      onHeartbeatTick,
    );
  }

  private async syncRegisteredJobsWithConfigStore(): Promise<{
    upsertedCount: number;
    deprecatedCount: number;
  }> {
    // TODO: Move this reconciliation to code-first job defaults. Startup should
    // create missing DB config records from implementation defaults, refresh
    // code-owned metadata, and avoid overwriting existing DB schedule overrides.
    const jobs = this.schedulerJobRegistry.listJobs();
    const result = await this.schedulerConfigStore.syncFromImplementations({
      jobs: jobs.map((job) => ({
        jobKey: job.key,
        jobName: job.name,
        description: job.description,
        enabled: false,
        cron: '',
        timeZone: 'UTC',
      })),
    });

    this.logger.info('Scheduler jobs synced from registry to config store', {
      upsertedCount: result.upsertedCount,
      deprecatedCount: result.deprecatedCount,
    });

    return result;
  }

  private clearConfiguredJobs(): void {
    const allCronJobNames = Array.from(
      this.schedulerRegistry.getCronJobs().keys(),
    );
    for (const cronJobName of allCronJobNames) {
      if (cronJobName === this.heartbeatJobName) {
        continue;
      }

      if (this.schedulerRegistry.doesExist('cron', cronJobName)) {
        const existingJob = this.schedulerRegistry.getCronJob(cronJobName);
        void existingJob.stop();
        this.schedulerRegistry.deleteCronJob(cronJobName);
      }
    }
  }

  private async getEffectiveJobSchedules(): Promise<{
    schedules: SchedulerJobScheduleResolved[];
    dbRecordCount: number;
    dbOverrides: number;
  }> {
    // TODO: Resolve schedules from implementation-defined defaults first, then
    // overlay non-deprecated DB overrides. Keep config JSON as transitional
    // bootstrap input only until all scheduler jobs expose code-owned defaults.
    const schedulerConfig = this.getSchedulerConfig();
    const map = new Map(
      schedulerConfig.jobs.map((job) => [job.name, { ...job }]),
    );

    const dbRecords = await this.schedulerConfigStore.listAll();
    for (const dbRecord of dbRecords) {
      map.set(dbRecord.jobName, {
        name: dbRecord.jobName,
        enabled: dbRecord.enabled,
        cron: dbRecord.cron,
        timeZone: dbRecord.timeZone,
      });
    }

    return {
      schedules: Array.from(map.values()),
      dbRecordCount: dbRecords.length,
      dbOverrides: dbRecords.length,
    };
  }

  private static isValidTimeZone(timeZone: string): boolean {
    if (!timeZone || typeof timeZone !== 'string') {
      return false;
    }

    try {
      Intl.DateTimeFormat(undefined, { timeZone });
      return true;
    } catch {
      return false;
    }
  }

  private static isValidCron(
    cronExpression: string,
    timeZone: string,
  ): boolean {
    if (!cronExpression || typeof cronExpression !== 'string') {
      return false;
    }

    try {
      const candidate = new CronJob(
        cronExpression,
        () => undefined,
        null,
        false,
        timeZone,
      );
      void candidate.stop();
      return true;
    } catch {
      return false;
    }
  }

  private registerCronJob(
    jobName: string,
    cronExpression: string,
    timeZone: string,
    onTick: () => void,
  ): void {
    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      const existingJob = this.schedulerRegistry.getCronJob(jobName);
      void existingJob.stop();
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    let job: CronJob;
    try {
      job = new CronJob(cronExpression, onTick, null, false, timeZone);
    } catch (error) {
      this.logger.error(
        'Invalid scheduler cron expression. Job registration skipped.',
        error as Error,
        {
          jobName,
          cronExpression,
          timeZone,
        },
      );
      return;
    }

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.info('Scheduler cron job registered', {
      jobName,
      cronExpression: job.cronTime.source,
      timeZone,
      schedulerEnabled: true,
    });
  }

  private async executeScheduledJobByName(
    jobName: string,
    trigger: 'cron' | 'manual',
  ): Promise<void> {
    const job = this.schedulerJobRegistry.get(jobName);

    if (!job) {
      this.logger.warn('Scheduler could not find job implementation', {
        jobName,
      });
      return;
    }

    const runId = `${jobName}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const startedAt = new Date();

    this.logger.info('Scheduler job execution started', {
      jobName,
      runId,
      trigger,
      startedAt: startedAt.toISOString(),
    });

    const reportProgress = (
      progress: SchedulerJobProgress,
      defaultEventType: SchedulerJobEventType = 'job_progress',
    ): void => {
      this.logger.info('Scheduler job progress', {
        jobName,
        runId,
        eventType: progress.eventType || defaultEventType,
        ...progress,
      });
    };

    reportProgress(
      {
        eventType: 'job_started',
        step: 'job_started',
        message: 'Scheduler job execution started',
        meta: {
          trigger,
          scheduledAt: startedAt.toISOString(),
        },
      },
      'job_started',
    );

    const context: SchedulerJobContext = {
      runId,
      scheduledAt: startedAt,
      trigger,
      logger: this.logger,
      reportProgress: (progress: SchedulerJobProgress) =>
        reportProgress(progress, 'job_progress'),
    };

    try {
      await this.executeJob(job, context);
      reportProgress(
        {
          eventType: 'job_completed',
          step: 'job_completed',
          message: 'Scheduler job execution completed',
          meta: {
            durationMs: Date.now() - startedAt.getTime(),
          },
        },
        'job_completed',
      );
      this.logger.info('Scheduler job execution completed', {
        jobName,
        runId,
        durationMs: Date.now() - startedAt.getTime(),
      });
    } catch (error) {
      reportProgress(
        {
          eventType: 'job_failed',
          step: 'job_failed',
          message: 'Scheduler job execution failed',
          meta: {
            durationMs: Date.now() - startedAt.getTime(),
            errorMessage:
              error instanceof Error ? error.message : String(error),
          },
        },
        'job_failed',
      );
      this.logger.error('Scheduler job execution failed', error as Error, {
        jobName,
        runId,
        durationMs: Date.now() - startedAt.getTime(),
      });
    }
  }

  private async executeJob(
    job: SchedulerJob,
    context: SchedulerJobContext,
  ): Promise<void> {
    await job.execute(context);
  }

  private runHeartbeat(): void {
    this.logger.info('Scheduler heartbeat executed', {
      jobName: this.heartbeatJobName,
      timestamp: new Date().toISOString(),
      pid: process.pid,
      uptimeSeconds: Math.floor(process.uptime()),
    });
  }

  private getSchedulerConfig(): SchedulerConfigResolved {
    const rawConfig = this.appConfigService.getConfig();
    const fallbackTimeZone =
      this.appConfigService.getTimeZoneConfig().effective;

    return resolveSchedulerConfig(rawConfig, fallbackTimeZone);
  }
}
