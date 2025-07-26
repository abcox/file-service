import { INestApplication, Injectable } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../../service/config/config.service';

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
      SwaggerModule.setup(path, app, document, {
        customCss: `
          :root {
          --text-color: #929292;
          --text-color-secondary: #cccccc;
          --text-color-tertiary: #ffffff;
          --text-color-quaternary: #ff6b6b;
          --text-color-quinary: #61affe;
          --text-color-senary: #49cc90;
          --text-color-septenary: #fca130;

          --background-color: #1a1a1a;
          --background-color-secondary: #2d2d2d;
          }
          html { background-color: var(--background-color); }
          .swagger-ui { background-color: var(--background-color); color: var(--text-color); }
          .swagger-ui .info .title { color: var(--text-color); }

          /* Buttons */
          .swagger-ui .btn { background-color: var(--background-color-secondary); color: var(--text-color); }
          .swagger-ui .btn:hover { background-color: #41444e; color: var(--text-color); }
          .swagger-ui .btn:active { background-color: var(--background-color-secondary); color: var(--text-color); }
          .swagger-ui .btn:focus { background-color: var(--background-color-secondary); color: var(--text-color); }
          .swagger-ui .btn:disabled { background-color: var(--background-color-secondary); color: var(--text-color); }
          .swagger-ui .btn:not(:disabled):not(.disabled):active { background-color: var(--background-color-secondary); color: var(--text-color); }
          .swagger-ui .btn:not(:disabled):not(.disabled):active:focus { background-color: var(--background-color-secondary); color: var(--text-color); }

          /* Button Authorize */
          .swagger-ui .btn.authorize { background-color: var(--background-color-secondary); color: #50e3c28a; border-color: #50e3c28a; }
          .swagger-ui .btn.authorize:hover {
            background-color: var(--background-color-secondary);
            color: #49cc90;
            border-color: #49cc90;
            svg {
              fill: #49cc90;
            }
          }
          .swagger-ui .btn.authorize:active {
            background-color: var(--background-color-secondary);
            color: #49cc90;
            border-color: #49cc90;
          }
          .swagger-ui .btn.authorize svg { fill: #50e3c28a; }

          /* Parameters */
          .swagger-ui .opblock .opblock-section-header h4 { color: var(--text-color); }
            
          .swagger-ui .info .description { color: var(--text-color-secondary); }
          .swagger-ui .info .version { color: var(--text-color-tertiary); }
          .swagger-ui .info .terms-of-service { color: var(--text-color-quaternary); }
          .swagger-ui .info .contact .name { color: var(--text-color-quinary); }
          .swagger-ui .info .contact .url { color: var(--text-color-senary); }
          .swagger-ui .topbar { background-color: #1a1a1a; }
          .swagger-ui .info { background-color: #1a1a1a; color: #ffffff; }
          .swagger-ui .scheme-container { background-color: #1a1a1a; }
          .swagger-ui .opblock { background-color: #1a1a1a; border-color: #404040; }
          .swagger-ui .opblock .opblock-section-header { background-color: #1a1a1a; }
          .swagger-ui .opblock .opblock-summary { background-color: #2d2d2d; }
          .swagger-ui .opblock .opblock-summary-description { color: #cccccc; }
          .swagger-ui .opblock .opblock-summary-operation-id { color: #ffffff; }
          .swagger-ui .opblock .opblock-summary-path { color: #ffffff; }
          .swagger-ui .opblock .opblock-summary-path__deprecated { color: #ff6b6b; }
          .swagger-ui .opblock .opblock-summary-method { color: #ffffff; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-get { background-color: #61affe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-post { background-color: #49cc90; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-put { background-color: #fca130; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-delete { background-color: #f93e3e; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-patch { background-color: #50e3c2; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-head { background-color: #9012fe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-options { background-color: #0d5aa7; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated { background-color: #ff6b6b; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-get { background-color: #61affe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-post { background-color: #49cc90; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-put { background-color: #fca130; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-delete { background-color: #f93e3e; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-patch { background-color: #50e3c2; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-head { background-color: #9012fe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-options { background-color: #0d5aa7; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-trace { background-color: #ebebeb; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-connect { background-color: #ebebeb; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-options { background-color: #0d5aa7; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-head { background-color: #9012fe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-patch { background-color: #50e3c2; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-delete { background-color: #f93e3e; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-put { background-color: #fca130; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-post { background-color: #49cc90; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated.opblock-summary-method-get { background-color: #61affe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-deprecated { background-color: #ff6b6b; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-options { background-color: #0d5aa7; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-head { background-color: #9012fe; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-patch { background-color: #50e3c2; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-delete { background-color: #f93e3e; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-put { background-color: #fca130; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-post { background-color: #49cc90; }
          .swagger-ui .opblock .opblock-summary-method.opblock-summary-method-get { background-color: #61affe; }
          .swagger-ui .opblock .opblock-summary-method { color: #ffffff; }
          .swagger-ui .opblock .opblock-summary-path__deprecated { color: #ff6b6b; }
          .swagger-ui .opblock .opblock-summary-path { color: #ffffff; }
          .swagger-ui .opblock .opblock-summary-operation-id { color: #ffffff; }
          .swagger-ui .opblock .opblock-summary-description { color: #cccccc; }
          .swagger-ui .opblock .opblock-summary { background-color: #2d2d2d; }
          .swagger-ui .opblock { background-color: #1a1a1a; border-color: #404040; }
          .swagger-ui .scheme-container { background-color: #1a1a1a; }
          .swagger-ui .info { background-color: #1a1a1a; color: #ffffff; }
          .swagger-ui .topbar { background-color: #1a1a1a; }
        `,
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
