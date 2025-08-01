import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';
import { LoggerService } from './service/logger/logger.service';
import { Request, Response, NextFunction } from 'express';
import { AppConfigService } from './service/config/config.service';

async function bootstrap() {
  console.log('Starting application...');

  const { PORT = '8080' } = process.env;
  console.log(`PORT: ${PORT}`);

  const app = await NestFactory.create(AppModule);
  console.log('Application created.');

  const configSvc = app.get(AppConfigService);
  console.log('Config service:', configSvc);
  const config = configSvc.getConfig();
  console.log('Config:', config);
  if (!config) {
    throw new Error('Api configuration not found');
  }
  const { api: apiCfg } = config;

  /* app.enableCors({
    origin: '*', // TODO: add to environment variable like allowedOrigins: ['http://localhost:4200', 'http://localhost:3000']
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }); */
  if (!apiCfg) {
    console.log('Api configuration not found');
  } else {
    if (apiCfg.cors.enabled) {
      app.enableCors(apiCfg.cors);
    } else {
      console.warn('CORS is disabled');
    }
    app.setGlobalPrefix(apiCfg.path);
    console.log(`Global prefix set to: ${apiCfg.path}`);
  }

  // TODO: review this middleware:
  // 1. At minimum, we should organize this somewhere else? (it clutters the main file)
  // Add request logging middleware
  const logger = app.get(LoggerService);
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

  await app.listen(PORT);
  console.log(`Application available at http://localhost:${PORT}`);
  console.log('Application startup complete!');
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
