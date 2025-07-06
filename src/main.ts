import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';

async function bootstrap() {
  console.log('Starting application...');

  const { PORT = '8080' } = process.env;
  console.log(`PORT: ${PORT}`);

  const app = await NestFactory.create(AppModule);
  console.log('Application created.');

  // Setup Swagger after all modules are initialized
  app.get(SwaggerConfigService).setupSwagger(app);

  await app.listen(PORT);
  console.log(`Application available at http://localhost:${PORT}`);
  console.log('Application startup complete!');
}

bootstrap().catch((error) => {
  console.error('💥 Application failed to start:', error);
  process.exit(1);
});
