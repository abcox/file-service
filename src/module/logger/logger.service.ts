import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { getRequestContext } from '../../core/request-context/request-context.storage';

export interface LogContext {
  [key: string]: unknown;
}

// ── Build-time metadata injected once at startup ─────────────────────────────
const SERVICE_NAME = 'file-service';
const BUILD_ID = process.env.GITHUB_RUN_ID || process.env.BUILD_ID || 'local';
const SERVICE_VERSION =
  process.env.npm_package_version || process.env.SERVICE_VERSION || 'unknown';
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Sensitive fields that must never appear in log output
const REDACT_FIELDS = new Set([
  'password',
  'passwordHash',
  'secret',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'apiKey',
  'connectionString',
]);

function redact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      REDACT_FIELDS.has(k.toLowerCase()) ? '[REDACTED]' : v,
    ]),
  );
}

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose';

type RuntimeLoggingConfig = {
  level: LogLevel;
  consoleEnabled: boolean;
  file: {
    enabled: boolean;
    path: string;
    // These modes describe startup behavior plus what happens as the file grows.
    mode: 'clean' | 'rolling-size';
    roll: {
      maxSizeBytes: number;
      maxFiles: number;
      tailable: boolean;
    };
  };
};

const loggingConfigSchema = z.object({
  level: z.enum(['error', 'warn', 'info', 'debug', 'verbose']),
  consoleEnabled: z.boolean(),
  file: z.object({
    enabled: z.boolean(),
    path: z.string().refine((value) => value.trim().length > 0, {
      message: 'logging.file.path must be a non-empty string',
    }),
    mode: z.enum(['clean', 'rolling-size']),
    roll: z.object({
      strategy: z.literal('size'),
      maxSizeBytes: z.number().finite(),
      maxFiles: z.number().finite(),
      tailable: z.boolean().optional().default(true),
    }),
  }),
});

function resolveConfigPath(): string {
  const environment = process.env.NODE_ENV || 'development';
  const isDevOrTest = ['development', 'test'].includes(environment);
  const configDir = isDevOrTest ? 'src/config' : 'dist';

  if (isDevOrTest) {
    const localDevConfigPath = path.join(
      process.cwd(),
      configDir,
      'config.local-dev.json',
    );
    if (fs.existsSync(localDevConfigPath)) {
      return localDevConfigPath;
    }
  }

  return path.join(process.cwd(), configDir, 'config.json');
}

function loadLoggingConfig(): RuntimeLoggingConfig {
  const configPath = resolveConfigPath();
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const root = z
    .object({
      logging: z.unknown(),
    })
    .parse(parsed);
  const logging = loggingConfigSchema.parse(root.logging);

  return {
    level: logging.level as LogLevel,
    consoleEnabled: logging.consoleEnabled,
    file: {
      enabled: logging.file.enabled,
      path: logging.file.path,
      mode: logging.file.mode,
      roll: {
        maxSizeBytes: logging.file.roll.maxSizeBytes,
        maxFiles: logging.file.roll.maxFiles,
        tailable: logging.file.roll.tailable,
      },
    },
  };
}

/**
 * Shared application logger.
 *
 * - Implements NestJS LoggerService interface so it can be passed to
 *   app.useLogger() and replace Nest's internal logger.
 * - Backed by Winston for structured JSON output.
 * - Injects build metadata (serviceName, buildId, serviceVersion, environment)
 *   on every log entry automatically.
 * - Redacts known sensitive field names before output.
 *
 * Usage in services (injected):
 *   this.logger.info('Contact created', { contactId });
 *
 * Usage as Nest framework logger (in main.ts):
 *   app.useLogger(app.get(LoggerService));
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private static processBridgesInitialized = false;
  private readonly winston: winston.Logger;

  constructor() {
    const loggingConfig = loadLoggingConfig();
    const consoleEnabled = loggingConfig.consoleEnabled;
    const fileConfig = loggingConfig.file;
    const transports: winston.transport[] = [];

    if (consoleEnabled) {
      transports.push(new winston.transports.Console());
    }

    if (fileConfig.enabled) {
      fs.mkdirSync(path.dirname(fileConfig.path), { recursive: true });
      if (fileConfig.mode === 'clean') {
        fs.writeFileSync(fileConfig.path, '', { encoding: 'utf8' });
      }
      transports.push(
        new winston.transports.File({
          filename: fileConfig.path,
          options: fileConfig.mode === 'clean' ? { flags: 'w' } : undefined,
          maxsize:
            fileConfig.mode === 'rolling-size'
              ? fileConfig.roll.maxSizeBytes
              : undefined,
          maxFiles:
            fileConfig.mode === 'rolling-size'
              ? fileConfig.roll.maxFiles
              : undefined,
          tailable:
            fileConfig.mode === 'rolling-size'
              ? (fileConfig.roll.tailable ?? true)
              : undefined,
        }),
      );
    }

    if (transports.length === 0) {
      transports.push(new winston.transports.Console());
    }

    this.winston = winston.createLogger({
      level: loggingConfig.level,
      defaultMeta: {
        serviceName: SERVICE_NAME,
        buildId: BUILD_ID,
        serviceVersion: SERVICE_VERSION,
        environment: ENVIRONMENT,
      },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
      ),
      transports,
    });

    this.initializeProcessTroubleBridges();
  }

  // ── Core log methods ─────────────────────────────────────────────────────

  log(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.info(message, this.buildLogMeta(ctx));
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, this.buildLogMeta(context));
  }

  warn(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.warn(message, this.buildLogMeta(ctx));
  }

  error(
    message: string,
    errorOrNestTrace?: Error | string,
    contextOrNestContext?: LogContext | string,
  ): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    const error =
      errorOrNestTrace instanceof Error ? errorOrNestTrace : undefined;
    const trace =
      typeof errorOrNestTrace === 'string' ? errorOrNestTrace : undefined;

    this.winston.error(message, {
      ...this.buildLogMeta(ctx),
      ...(error ? { errorMessage: error.message, stack: error.stack } : {}),
      ...(trace ? { stack: trace } : {}),
    });
  }

  debug(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.debug(message, this.buildLogMeta(ctx));
  }

  verbose(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.verbose(message, this.buildLogMeta(ctx));
  }

  fatal(message: string, context?: LogContext): void {
    this.winston.error(message, {
      ...this.buildLogMeta(context),
      fatal: true,
    });
  }

  // ── Convenience helpers (preserve existing call-sites) ───────────────────

  logFileOperation(
    operation: string,
    filename: string,
    context?: LogContext,
  ): void {
    this.info(`File ${operation}`, { operation, filename, ...context });
  }

  logStorageOperation(
    operation: string,
    storageType: string,
    context?: LogContext,
  ): void {
    this.info(`Storage ${operation}`, { operation, storageType, ...context });
  }

  logError(operation: string, error: Error, context?: LogContext): void {
    this.error(`Error during ${operation}`, error, { operation, ...context });
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  /**
   * NestJS passes either a plain string (class name context) or a LogContext
   * object as the second argument. Normalize both to LogContext | undefined.
   */
  private normalizeContext(
    value: LogContext | string | undefined,
  ): LogContext | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string') return { context: value };
    return value;
  }

  private buildLogMeta(context?: LogContext): Record<string, unknown> {
    const requestContext = getRequestContext();
    return redact({
      ...(requestContext ?? {}),
      ...(context ?? {}),
    });
  }

  /**
   * Forward process-level warnings/failures into Winston so they land in
   * structured logs alongside app logs.
   */
  private initializeProcessTroubleBridges(): void {
    if (LoggerService.processBridgesInitialized) {
      return;
    }
    LoggerService.processBridgesInitialized = true;

    process.on('warning', (warning) => {
      this.winston.warn('Node process warning', {
        warningName: warning.name,
        warningMessage: warning.message,
        warningCode: (warning as NodeJS.ErrnoException).code,
        stack: warning.stack,
      });
    });

    process.on('unhandledRejection', (reason) => {
      const err = reason instanceof Error ? reason : undefined;
      this.winston.error('Unhandled promise rejection', {
        ...(err
          ? {
              errorMessage: err.message,
              stack: err.stack,
            }
          : {
              reason,
            }),
      });
    });

    process.on('uncaughtExceptionMonitor', (error) => {
      this.winston.error('Uncaught exception (monitor)', {
        errorMessage: error.message,
        stack: error.stack,
      });
    });
  }
}
