import { INestApplication, Injectable } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../../service/config/config.service';
import { readAssetFile } from '../../shared/util';

interface SwaggerConfig {
  enabled: boolean;
  path: string;
}

@Injectable()
export class SwaggerConfigService {
  constructor(private configService: AppConfigService) {}

  setupSwagger(app: INestApplication): void {
    const { enabled, path } = this.configService.getConfig()
      .swagger as SwaggerConfig;
    if (enabled) {
      console.log('Setting up Swagger documentation...');
      const documentBuilder = this.createDocumentBuilder();
      const document = SwaggerModule.createDocument(
        app,
        documentBuilder.build(),
      );
      const css = readAssetFile('swagger-dark.css');
      SwaggerModule.setup(path, app, document, {
        customCss: css,
        customSiteTitle: 'API Documentation - Dark Mode',
      });
      console.log(`Swagger documentation configured at /${path}`);
    } else {
      console.log('Swagger disabled in configuration');
    }
  }

  createDocumentBuilder(): DocumentBuilder {
    const {
      name,
      description = '',
      version = '',
    } = this.configService.getConfig().info;
    return new DocumentBuilder()
      .setTitle(name)
      .setDescription(description)
      .setVersion(version)
      .addBearerAuth();
  }
}
