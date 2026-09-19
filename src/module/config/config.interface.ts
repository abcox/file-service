import { GoogleApis } from '../google/google.config';
import { GptConfig } from '../gpt/gpt.service';
import { StripeOptions } from '../payment/stripe/stripe.service';

export interface SchedulerJobConfig {
  name: string;
  enabled?: boolean;
  cron?: string;
  timeZone?: string;
}

export interface SchedulerHeartbeatConfig {
  enabled?: boolean;
  cron?: string;
  timeZone?: string;
}

export interface SchedulerInvitePilotConfig {
  enabled?: boolean;
  recipientEmail?: string;
  senderEmail?: string;
  funnelBaseUrl?: string;
  campaignType?: string;
  campaignId?: string;
  channel?: 'campaign' | 'organic';
  subjectPrefix?: string;
}

export interface FunnelInvitationConfig {
  enabled?: boolean;
  recipientEmail?: string;
  senderEmail?: string;
  funnelBaseUrl?: string;
  campaignType?: string;
  campaignId?: string;
  channel?: 'campaign' | 'organic';
  subjectPrefix?: string;
}

export interface SchedulerConfig {
  enabled?: boolean;
  heartbeat?: SchedulerHeartbeatConfig;
  jobs?: SchedulerJobConfig[];
  // Legacy location for invite pilot config. Prefer funnel.invitation.
  invitePilot?: SchedulerInvitePilotConfig;
}

export interface AppConfig {
  scheduler?: SchedulerConfig;
  funnel?: {
    invitation?: FunnelInvitationConfig;
  };
  booking?: {
    enabled?: boolean;
    includeWeekendDays?: boolean;
    minBusinessDaysInFuture?: number;
    calendarId?: string;
    timezone?: string;
    maxDaysInFuture?: number;
    slotIntervalMinutes?: number;
    defaultMeetingDurationMinutes?: number;
    maxMinutesPerBooking?: number;
    workingWindows?: Array<{
      dayOfWeek: number; // 0=Sunday ... 6=Saturday
      startHour24: number;
      endHour24: number;
      maxMinutesPerBooking?: number;
    }>;
  };
  azure: {
    tenantId: string;
    subscriptionId: string;
    keyVaultUrl: string;
    database?: {
      type?: 'azureSql' | 'local-sql-express';
      azureSql?: {
        host?: string;
        port?: number;
        name?: string;
        username?: string;
        password?: string;
        connectionString?: string;
        description?: string;
        portalUrl?: string;
      };
      'local-sql-express'?: {
        host?: string;
        port?: number;
        name?: string;
        username?: string;
        password?: string;
        connectionString?: string;
      };
    };
    cosmosDb?: {
      name?: string;
      description?: string;
      portalUrl?: string;
      connectionString?: string;
      database?: string;
    };
  };
  info: {
    name: string;
    description?: string;
    version?: string;
  };
  auth?: {
    enabled: boolean;
    session: {
      secret: string;
      name: string;
      cookie: {
        secure: boolean;
      };
      accessTokenDurationSeconds?: number; // Default: 3600 (1 hour)
      refreshTokenDurationSeconds?: number; // Default: 604800 (7 days)
      proactiveRefreshLeadSeconds?: number; // Frontend hint: refresh this many seconds before access token expiry
      idleSessionConfig?: {
        inactivityWarningSeconds?: number; // Default: 600 (10 minutes) - Show warning after X seconds of inactivity
        warningCountdownSeconds?: number; // Default: 300 (5 minutes) - Warning dialog countdown before logout
      };
    };
  };
  api: {
    path: string;
    port: number;
    cors: {
      enabled: boolean;
      origin: string;
      methods: string[];
      allowedHeaders: string[];
    };
    timeZone?: string;
  };
  environment: 'development' | 'production';
  keyVault?: { vaultUrl: string };
  gptConfig?: GptConfig;
  googleApis?: GoogleApis;
  payment?: {
    stripe: StripeOptions;
  };
  storage: {
    type: 'local' | 'azure' | 'emulator';
    local: { subfolderPath: string };
    azure: { connectionString: string; containerName: string };
    emulator: { connectionString: string; containerName: string };
    options: { safeMode: boolean };
  };
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
    path: string;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug' | 'verbose';
    consoleEnabled: boolean;
    file: {
      enabled: boolean;
      path: string;
      // These modes describe what happens at startup and as the current log file grows.
      mode: 'clean' | 'rolling-size';
      roll: {
        strategy: 'size';
        maxSizeBytes: number;
        maxFiles: number;
        tailable?: boolean;
      };
    };
    azureMonitor?: {
      connectionString?: string;
    };
  };
}
