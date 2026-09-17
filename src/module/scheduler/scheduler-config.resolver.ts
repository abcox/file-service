import {
  AppConfig,
  FunnelInvitationConfig,
  SchedulerConfig,
  SchedulerInvitePilotConfig,
} from '../config/config.interface';

export type SchedulerHeartbeatConfigResolved = {
  enabled: boolean;
  cron: string;
  timeZone: string;
};

export type SchedulerJobScheduleResolved = {
  name: string;
  enabled: boolean;
  cron: string;
  timeZone: string;
};

export type SchedulerConfigResolved = {
  enabled: boolean;
  heartbeat: SchedulerHeartbeatConfigResolved;
  jobs: SchedulerJobScheduleResolved[];
};

export type InvitePilotConfigResolved = {
  enabled: boolean;
  recipientEmail: string;
  senderEmail: string;
  funnelBaseUrl: string;
  campaignType: string;
  campaignId: string;
  channel: 'campaign' | 'organic';
  subjectPrefix: string;
};

export function resolveSchedulerConfig(
  config: AppConfig,
  fallbackTimeZone: string,
): SchedulerConfigResolved {
  const scheduler = asRecord(config.scheduler);
  const heartbeat = asRecord((scheduler as SchedulerConfig).heartbeat);
  const jobs = asArray((scheduler as SchedulerConfig).jobs);

  return {
    enabled: asBoolean((scheduler as SchedulerConfig).enabled, false),
    heartbeat: {
      enabled: asBoolean(heartbeat.enabled, false),
      cron: asNonEmptyString(heartbeat.cron, ''),
      timeZone: asNonEmptyString(heartbeat.timeZone, fallbackTimeZone),
    },
    jobs: jobs
      .map((value: unknown) => asRecord(value))
      .map((jobRecord) =>
        resolveSchedulerJobConfig(jobRecord, fallbackTimeZone),
      )
      .filter((job) => job.name.length > 0),
  };
}

export function resolveInvitePilotConfig(
  config: AppConfig,
): InvitePilotConfigResolved {
  const root = asRecord(config);
  const funnel = asRecord(root.funnel);
  const invitation = asRecord(
    (funnel as { invitation?: FunnelInvitationConfig }).invitation,
  );

  const scheduler = asRecord(root.scheduler);
  const legacyInvitePilot = asRecord(
    (scheduler as SchedulerConfig).invitePilot as SchedulerInvitePilotConfig,
  );

  // Prefer the feature-owned funnel.invitation block and fall back to legacy
  // scheduler.invitePilot to preserve backward compatibility.
  const source =
    Object.keys(invitation).length > 0 ? invitation : legacyInvitePilot;

  return {
    enabled: asBoolean(source.enabled, false),
    recipientEmail: asNonEmptyString(source.recipientEmail, ''),
    senderEmail: asNonEmptyString(source.senderEmail, ''),
    funnelBaseUrl: asNonEmptyString(source.funnelBaseUrl, ''),
    campaignType: asNonEmptyString(source.campaignType, 'email'),
    campaignId: asNonEmptyString(source.campaignId, 'invite-pilot'),
    channel: asChannel(source.channel, 'campaign'),
    subjectPrefix: asNonEmptyString(source.subjectPrefix, '[PILOT]'),
  };
}

function resolveSchedulerJobConfig(
  job: Record<string, unknown>,
  fallbackTimeZone: string,
): SchedulerJobScheduleResolved {
  return {
    name: asNonEmptyString(job.name, ''),
    enabled: asBoolean(job.enabled, false),
    cron: asNonEmptyString(job.cron, ''),
    timeZone: asNonEmptyString(job.timeZone, fallbackTimeZone),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asNonEmptyString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : fallback;
}

function asChannel(
  value: unknown,
  fallback: 'campaign' | 'organic',
): 'campaign' | 'organic' {
  return value === 'campaign' || value === 'organic' ? value : fallback;
}
