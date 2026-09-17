import { LoggerService } from '../logger/logger.service';

export type SchedulerJobTrigger = 'cron' | 'manual';

export type SchedulerJobEventType =
  | 'job_started'
  | 'job_progress'
  | 'job_completed'
  | 'job_failed';

export interface SchedulerJobProgress {
  eventType?: SchedulerJobEventType;
  step: string;
  message?: string;
  processed?: number;
  total?: number;
  meta?: Record<string, unknown>;
}

export interface SchedulerJobContext {
  runId: string;
  scheduledAt: Date;
  trigger: SchedulerJobTrigger;
  logger: LoggerService;
  reportProgress: (progress: SchedulerJobProgress) => void;
}

export interface SchedulerJob {
  readonly name: string;
  execute(context: SchedulerJobContext): Promise<void>;
}
