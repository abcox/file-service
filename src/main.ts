import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  console.log('🚀 Starting NestJS application...');
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(AppConfigService);
  const port = configService.getPort();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('File Service API')
    .setDescription('A file service supporting local and Azure Blob Storage')
    .setVersion('1.0')
    .addTag('files')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
