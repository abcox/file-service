import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { Request } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
export const BUILD_ID_HEADER = 'x-build-id';
export const REQUEST_ID_KEY = 'requestId';
export const BUILD_ID_KEY = 'buildId';

/**
 * Interceptor that attaches correlation context to every incoming request.
 *
 * Sets on req object (readable by the global exception filter and logger):
 *   - requestId  — from incoming header x-request-id, or generated uuid
 *   - buildId    — from GITHUB_RUN_ID env var (injected at deploy time)
 *   - serviceVersion — from npm_package_version env or fallback
 *
 * Also echoes requestId back on the response header so clients can correlate.
 */
@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  private readonly buildId: string;
  private readonly serviceVersion: string;

  constructor() {
    this.buildId = process.env.GITHUB_RUN_ID || process.env.BUILD_ID || 'local';
    this.serviceVersion =
      process.env.npm_package_version ||
      process.env.SERVICE_VERSION ||
      'unknown';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request & Record<string, unknown>>();
    const res = ctx.getResponse<{
      setHeader: (k: string, v: string) => void;
    }>();

    const requestId =
      (req.headers[REQUEST_ID_HEADER] as string | undefined) || randomUUID();

    req[REQUEST_ID_KEY] = requestId;
    req[BUILD_ID_KEY] = this.buildId;
    req['serviceVersion'] = this.serviceVersion;

    res.setHeader(REQUEST_ID_HEADER, requestId);

    return next.handle();
  }
}
