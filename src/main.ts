import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  console.log('🚀 Starting NestJS application...');
  const app = await NestFactory.create(AppModule);

  // Get config service
  const configService = app.get(AppConfigService);
  const serverConfig = configService.getServerConfig();

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('File Service API')
    .setDescription(
      'A file service API for handling file uploads and management',
    )
    .setVersion('1.0')
    .addTag('files')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(serverConfig.port, serverConfig.host);
  console.log(
    `Application is running on: http://${serverConfig.host}:${serverConfig.port}`,
  );
  console.log(
    `Swagger documentation is available at: http://${serverConfig.host}:${serverConfig.port}/api`,
  );
}
bootstrap();
