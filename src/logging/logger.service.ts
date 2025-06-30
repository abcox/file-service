import { Injectable } from '@nestjs/common';

export interface LogContext {
  [key: string]: any;
}

@Injectable()
export class LoggerService {
  private formatMessage(
    level: string,
    message: string,
    context?: LogContext,
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  log(message: string, context?: LogContext): void {
    console.log(this.formatMessage('info', message, context));
  }

  info(message: string, context?: LogContext): void {
    console.info(this.formatMessage('info', message, context));
  }

  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      error: error?.message,
      stack: error?.stack,
    };
    console.error(this.formatMessage('error', message, errorContext));
  }

  debug(message: string, context?: LogContext): void {
    console.debug(this.formatMessage('debug', message, context));
  }

  // Convenience methods for common operations
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
}
