import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from './error-codes.enum';

export interface AppExceptionDetails {
  [key: string]: unknown;
}

/**
 * Application exception that extends NestJS HttpException.
 *
 * Provides a structured error with:
 * - `code`        — machine-readable error code from ErrorCode enum
 * - `details`     — optional structured context about the failure
 * - `isOperational` — true = expected, known application failure (e.g. not found).
 *                     false = unexpected/programmer error. Global filter uses
 *                     this to decide log level (warn vs error).
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly details: AppExceptionDetails;
  readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    details: AppExceptionDetails = {},
    isOperational = true,
  ) {
    super(message, statusCode);
    this.code = code;
    this.details = details;
    this.isOperational = isOperational;
  }
}

// ── Domain-specific factory helpers ─────────────────────────────────────────

export function notFoundException(
  resource: string,
  identifier?: string,
): AppException {
  const message = identifier
    ? `${resource} '${identifier}' not found`
    : `${resource} not found`;
  return new AppException(ErrorCode.NOT_FOUND, message, HttpStatus.NOT_FOUND);
}

export function validationException(
  message: string,
  details: AppExceptionDetails = {},
): AppException {
  return new AppException(
    ErrorCode.VALIDATION_FAILED,
    message,
    HttpStatus.UNPROCESSABLE_ENTITY,
    details,
  );
}

export function unauthorizedException(
  code: ErrorCode = ErrorCode.UNAUTHORIZED,
  message = 'Unauthorized',
): AppException {
  return new AppException(code, message, HttpStatus.UNAUTHORIZED);
}
