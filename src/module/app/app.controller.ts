import { Controller, Get, Req, Res } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  //ApiBearerAuth, // use Auth decorator
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AppService } from './app.service';
import { Auth } from '../auth/auth.guard';
import { LoggerService } from '../logger/logger.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly loggerService: LoggerService,
  ) {
    this.loggerService.debug('AppController constructor called');
  }

  // required for service discovery (e.g. kubernetes, azure app service)
  @Get('health')
  @ApiExcludeEndpoint()
  @Auth({ public: true })
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health() {
    this.loggerService.info('Health check requested');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'vorba-file-service',
      version: process.env.npm_package_version || '1.0.0',
      port: process.env.PORT || 'not set',
      environment: process.env.NODE_ENV || 'not set',
    };
  }

  // TODO: repurpose this to give useful information about the service
  @ApiExcludeEndpoint()
  @Get()
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get service info' })
  @ApiResponse({
    status: 200,
    description:
      'Returns information about this service as sourced from the effective configuration. Content type varies by Accept header.',
  })
  getAppInfo(@Req() req: Request, @Res() res: Response): void {
    const appInfo = this.appService.getAppInfo();
    const acceptsHtml = req.accepts('html');
    const responseType = acceptsHtml ? 'html' : 'json';

    this.loggerService.info('Root endpoint served', {
      responseType,
      userAgent: req.get('user-agent'),
      appInfo,
    });

    if (acceptsHtml) {
      const html = this.appService.generateAppInfoHtml(appInfo);
      res.type('text/html').send(html);
    } else {
      res.json(appInfo);
    }
  }

  // TODO: remove this endpoint to new auth microservice?
  @ApiExcludeEndpoint()
  @Get('debug-jwt')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Debug JWT configuration' })
  @ApiResponse({ status: 200, description: 'JWT debug info' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token required',
  })
  debugJwt() {
    return { message: 'JWT debug endpoint - check logs for details' };
  }
}
