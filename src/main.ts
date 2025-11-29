import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module/app/app.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';
import { LoggerService } from './module/logger/logger.service';
import { Request, Response, NextFunction } from 'express';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { ConfigDebugService } from './module/config/config-debug.service';

async function bootstrap() {
  console.log('Starting application...');
  console.log('PORT:', process.env.PORT || 'not set');

  // Create a basic logger for startup diagnostics
  const startupLogger = new LoggerService();

  try {
    // Run startup diagnostics if DEBUG_STARTUP is enabled
    if (process.env.DEBUG_STARTUP === 'true') {
      startupLogger.info(
        '🔍 DEBUG_STARTUP enabled - running comprehensive diagnostics',
      );
      const debugService = new ConfigDebugService(startupLogger);
      await debugService.runStartupDiagnostics();
    }

    // Basic environment check
    startupLogger.info('📋 Basic Environment Check', {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET',
      cwd: process.cwd(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
    });

    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      // Increase global timeout for long-running operations
      bodyParser: true,
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Serve static files from assets directory
    app.useStaticAssets(join(__dirname, '..', 'assets'), {
      prefix: '/assets/',
    });

    // Set global timeout for requests (5 minutes)
    app.use((req: Request, res: Response, next: NextFunction) => {
      req.setTimeout(300000); // 5 minutes
      res.setTimeout(300000); // 5 minutes
      next();
    });

    // Get the logger service from the app
    const logger = app.get(LoggerService);

    // Run diagnostics after app is created if DEBUG_STARTUP is enabled
    if (process.env.DEBUG_STARTUP === 'true') {
      logger.info('🔍 Running post-bootstrap diagnostics...');
      const debugService = app.get(ConfigDebugService);
      await debugService.runStartupDiagnostics();
    }

    // Set global prefix
    app.setGlobalPrefix('api');
    logger.info('Global prefix set to: api');

    // TODO: review this middleware:
    // 1. At minimum, we should organize this somewhere else? (it clutters the main file)
    // Add request logging middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
      logger.info(`${req.method} ${req.url}`, {
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
      next();
    });

    // Setup Swagger after all modules are initialized
    app.get(SwaggerConfigService).setupSwagger(app);

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.info(`Application available at http://localhost:${port}`);
  } catch (error) {
    startupLogger.error('❌ Application startup failed', error as Error);

    // Enhanced error reporting
    const errorDetails = {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      environment: process.env.NODE_ENV || 'NOT_SET',
      cwd: process.cwd(),
      timestamp: new Date().toISOString(),
    };

    startupLogger.info('🔍 Startup Error Details', errorDetails);

    // Provide troubleshooting hints
    const troubleshootingHints = [
      'Check if all required environment variables are set',
      'Verify configuration files exist and are valid',
      'Ensure Azure services are accessible',
      'Check network connectivity',
      'Review application logs for specific error details',
    ];

    startupLogger.info('🔧 Troubleshooting Hints', {
      hints: troubleshootingHints,
    });

    process.exit(1);
  }
}

bootstrap();
