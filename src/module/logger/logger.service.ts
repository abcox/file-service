import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';

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
  private readonly winston: winston.Logger;

  constructor() {
    const isDevelopment = ENVIRONMENT === 'development';

    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      defaultMeta: {
        serviceName: SERVICE_NAME,
        buildId: BUILD_ID,
        serviceVersion: SERVICE_VERSION,
        environment: ENVIRONMENT,
      },
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        isDevelopment
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.printf(
                ({ timestamp, level, message, ...meta }) => {
                  const contextStr = Object.keys(meta).length
                    ? ` ${JSON.stringify(meta)}`
                    : '';
                  return `[${timestamp as string}] [${level}] ${message as string}${contextStr}`;
                },
              ),
            )
          : winston.format.json(),
      ),
      transports: [new winston.transports.Console()],
    });
  }

  // ── Core log methods ─────────────────────────────────────────────────────

  log(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.info(message, ctx ? redact(ctx) : {});
  }

  info(message: string, context?: LogContext): void {
    this.winston.info(message, context ? redact(context) : {});
  }

  warn(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.warn(message, ctx ? redact(ctx) : {});
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
      ...(ctx ? redact(ctx) : {}),
      ...(error ? { errorMessage: error.message, stack: error.stack } : {}),
      ...(trace ? { stack: trace } : {}),
    });
  }

  debug(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.debug(message, ctx ? redact(ctx) : {});
  }

  verbose(message: string, contextOrNestContext?: LogContext | string): void {
    const ctx = this.normalizeContext(contextOrNestContext);
    this.winston.verbose(message, ctx ? redact(ctx) : {});
  }

  fatal(message: string, context?: LogContext): void {
    this.winston.error(message, {
      ...(context ? redact(context) : {}),
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
}
