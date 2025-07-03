import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { LoggerService } from './logging/logger.service';
import { AppConfig } from './config/config.interface';

async function bootstrap() {
  console.log('🚀 Starting file-service application...');

  // Use a simple logger for pre-bootstrap
  const preLogger = new LoggerService();
  let config: AppConfig;
  try {
    console.log('📋 Loading configuration...');
    config = await AppConfigService.init(preLogger);
    console.log('✅ Configuration loaded successfully');
  } catch (err) {
    console.error('❌ Failed to load config/secrets:', err);
    preLogger.error('Failed to load config/secrets:', err as Error);
    process.exit(1); // Fail fast
  }
  preLogger.info('JWT_SECRET', { JWT_SECRET: process.env.JWT_SECRET });

  // Set JWT secret as environment variable before app creation
  if (config.auth?.secret) {
    //process.env.JWT_SECRET = config.auth.secret;
  }

  console.log('🏗️  Creating NestJS application...');
  const app = await NestFactory.create(AppModule);
  console.log('✅ NestJS application created');

  // Set the loaded config on the AppConfigService instance
  const configService = app.get(AppConfigService);
  configService.setConfig(config);

  // Debug port information
  console.log('🔍 PORT DEBUG INFO:');
  console.log(`  process.env.PORT: ${process.env.PORT || 'undefined'}`);
  console.log(`  configService.getPort(): ${configService.getPort()}`);
  console.log(`  config.port: ${config.port}`);

  const port = process.env.PORT || configService.getPort() || 3000;
  console.log(
    `🔧 Using port: ${port} (from ${process.env.PORT ? 'process.env.PORT' : 'config service'})`,
  );

  // Swagger configuration
  console.log('📚 Setting up Swagger documentation...');
  const configSwagger = new DocumentBuilder()
    .setTitle('File Service API')
    .setDescription('A file service supporting local and Azure Blob Storage')
    .setVersion('1.0')
    .addTag('files')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, configSwagger);
  SwaggerModule.setup('api', app, document);
  console.log('✅ Swagger documentation configured');

  console.log(`🌐 Starting server on port ${port}...`);
  await app.listen(port);

  console.log(`✅ Application is running on: http://localhost:${port}`);
  console.log(`📖 Swagger documentation: http://localhost:${port}/api`);
  console.log('🎉 File service startup complete!');
}

bootstrap().catch((error) => {
  console.error('💥 Application failed to start:', error);
  process.exit(1);
});
