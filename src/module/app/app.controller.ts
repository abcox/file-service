import {
  Controller,
  Get,
  //LoggerService,
  //Post,
  //UploadedFile,
  //UseInterceptors,
  //Param,
  //Delete,
  //Res,
  //Query,
} from '@nestjs/common';
import {
  //ApiTags,
  ApiOperation,
  //ApiConsumes,
  //ApiBody,
  //ApiParam,
  ApiResponse,
  //ApiQuery,
  //ApiBearerAuth, // use Auth decorator
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
//import { Response } from 'express';
import { AppService } from './app.service';
import { Auth } from '../auth/auth.guard';
import { LoggerService } from '../../service/logger/logger.service';

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
      'Returns information about this service as sourced from the effective configuration.',
  })
  getAppInfo(): string {
    this.loggerService.debug('Root endpoint requested');
    return this.appService.getAppInfo();
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
