import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';
import { LoggerService } from './service/logger/logger.service';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  console.log('Starting application...');

  const { PORT = '8080' } = process.env;
  console.log(`PORT: ${PORT}`);

  const app = await NestFactory.create(AppModule);
  console.log('Application created.');

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
