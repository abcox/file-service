import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { AppException } from './app.exception';
import { ErrorCode } from './error-codes.enum';
import { LoggerService } from '../../module/logger/logger.service';
import {
  REQUEST_ID_HEADER,
  BUILD_ID_HEADER,
  REQUEST_ID_KEY,
  BUILD_ID_KEY,
} from '../interceptors/request-context.interceptor';

export interface ErrorResponseBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    statusCode: number;
  };
  meta: {
    requestId: string;
    timestamp: string;
    path: string;
    method: string;
    buildId: string;
  };
}

/**
 * Global exception filter — the single location where:
 *  1. Every unhandled exception is normalized to ErrorResponseBody
 *  2. The exception is logged once with request correlation context
 *
 * Log level:
 *  - warn  → operational AppException (expected failure, e.g. not found)
 *  - error → unexpected / unknown errors, or non-operational AppException
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & Record<string, unknown>>();
    const res = ctx.getResponse<Response>();

    const requestId =
      (req[REQUEST_ID_KEY] as string | undefined) ||
      (req.headers[REQUEST_ID_HEADER] as string | undefined) ||
      randomUUID();
    const buildId =
      (req[BUILD_ID_KEY] as string | undefined) ||
      (req.headers[BUILD_ID_HEADER] as string | undefined) ||
      process.env.GITHUB_RUN_ID ||
      'local';

    req[REQUEST_ID_KEY] = requestId;
    req[BUILD_ID_KEY] = buildId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    const { statusCode, code, message, details, isOperational } =
      this.resolveException(exception);

    const meta = {
      requestId,
      buildId,
      timestamp: new Date().toISOString(),
      path: req.url,
      method: req.method,
    };

    const logContext = {
      ...meta,
      statusCode,
      code,
      details,
      stack:
        !isOperational && exception instanceof Error
          ? exception.stack
          : undefined,
    };

    if (isOperational) {
      this.logger.warn(`[${code}] ${message}`, logContext);
    } else {
      this.logger.error(
        `[${code}] ${message}`,
        exception instanceof Error ? exception : undefined,
        logContext,
      );
    }

    const body: ErrorResponseBody = {
      success: false,
      error: { code, message, statusCode, ...(details ? { details } : {}) },
      meta: {
        requestId: meta.requestId,
        timestamp: meta.timestamp,
        path: meta.path,
        method: meta.method,
        buildId: meta.buildId,
      },
    };

    res.status(statusCode).json(body);
  }

  private resolveException(exception: unknown): {
    statusCode: number;
    code: string;
    message: string;
    details?: Record<string, unknown>;
    isOperational: boolean;
  } {
    // AppException — our own structured type
    if (exception instanceof AppException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        details: Object.keys(exception.details).length
          ? (exception.details as Record<string, unknown>)
          : undefined,
        isOperational: exception.isOperational,
      };
    }

    // NestJS built-in HttpException (including ValidationPipe errors)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // ValidationPipe returns an object with `message` array
      if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>;
        const validationMessages = Array.isArray(r['message'])
          ? (r['message'] as string[])
          : undefined;

        return {
          statusCode: status,
          code: validationMessages
            ? ErrorCode.VALIDATION_FAILED
            : this.httpStatusToCode(status),
          message: validationMessages
            ? 'Validation failed'
            : ((r['message'] as string | undefined) ?? exception.message),
          details: validationMessages
            ? { validationErrors: validationMessages }
            : undefined,
          isOperational: status < 500,
        };
      }

      return {
        statusCode: status,
        code: this.httpStatusToCode(status),
        message: typeof response === 'string' ? response : exception.message,
        isOperational: status < 500,
      };
    }

    // Unknown / unhandled error
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      isOperational: false,
    };
  }

  private httpStatusToCode(status: number): ErrorCode {
    switch (status) {
      case 400:
        return ErrorCode.BAD_REQUEST;
      case 401:
        return ErrorCode.UNAUTHORIZED;
      case 403:
        return ErrorCode.FORBIDDEN;
      case 404:
        return ErrorCode.NOT_FOUND;
      case 422:
        return ErrorCode.VALIDATION_FAILED;
      default:
        return ErrorCode.INTERNAL_SERVER_ERROR;
    }
  }
}
