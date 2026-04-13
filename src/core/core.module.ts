import { Global, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingModule } from '../module/logger/logging.module';
import { GlobalExceptionFilter } from './errors/global-exception.filter';
import { RequestContextInterceptor } from './interceptors/request-context.interceptor';

/**
 * CoreModule — global infrastructure module.
 *
 * Registered once in AppModule. Provides:
 *  - GlobalExceptionFilter  — normalizes all exceptions to a structured
 *    error response and logs them once with request correlation.
 *  - RequestContextInterceptor — attaches requestId + buildId to every
 *    request so they are available to the filter and logger.
 *
 * Import LoggingModule so LoggerService is available for injection into
 * GlobalExceptionFilter.
 */
@Global()
@Module({
  imports: [LoggingModule],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestContextInterceptor,
    },
  ],
})
export class CoreModule {}
