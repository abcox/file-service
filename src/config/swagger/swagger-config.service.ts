import { INestApplication, Injectable } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../../service/config/config.service';

interface SwaggerConfig {
  enabled: boolean;
  path: string;
  title: string;
  description: string;
  version: string;
}

@Injectable()
export class SwaggerConfigService {
  private config: SwaggerConfig;

  constructor(private configService: AppConfigService) {
    this.config = this.configService.getConfig().swagger;
  }

  setupSwagger(app: INestApplication): void {
    const { enabled, path } = this.config;
    if (enabled) {
      console.log('Setting up Swagger documentation...');
      const documentBuilder = this.createDocumentBuilder();
      const document = SwaggerModule.createDocument(
        app,
        documentBuilder.build(),
      );
      SwaggerModule.setup(path, app, document);
      console.log(`Swagger documentation configured at /${path}`);
    } else {
      console.log('Swagger disabled in configuration');
    }
  }

  createDocumentBuilder(): DocumentBuilder {
    return new DocumentBuilder()
      .setTitle(this.config.title)
      .setDescription(this.config.description)
      .setVersion(this.config.version)
      .addBearerAuth();
  }
}
