import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { LoggerService } from './logging/logger.service';
import { AppConfig } from './config/config.interface';

async function bootstrap() {
  // Use a simple logger for pre-bootstrap
  const preLogger = new LoggerService();
  let config: AppConfig;
  try {
    config = await AppConfigService.init(preLogger);
  } catch (err) {
    preLogger.error('Failed to load config/secrets:', err as Error);
    process.exit(1); // Fail fast
  }

  // Set JWT secret as environment variable before app creation
  if (config.auth?.secret) {
    process.env.JWT_SECRET = config.auth.secret;
  }

  const app = await NestFactory.create(AppModule);

  // Set the loaded config on the AppConfigService instance
  const configService = app.get(AppConfigService);
  configService.setConfig(config);
  const port = configService.getPort();

  // Swagger configuration
  const configSwagger = new DocumentBuilder()
    .setTitle('File Service API')
    .setDescription('A file service supporting local and Azure Blob Storage')
    .setVersion('1.0')
    .addTag('files')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}

bootstrap().catch((error) => {
  console.error('Application failed to start:', error);
  process.exit(1);
});
