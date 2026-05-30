import { INestApplication, Injectable } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppConfigService } from '../../module/config/config.service';
import { readAssetFile } from '../../shared/util';

interface SwaggerConfig {
  enabled: boolean;
  path: string;
}

interface BuildContext {
  buildSource: string;
  buildId: string;
  serviceVersion: string;
  buildTimeUtc: string;
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
    const build = this.getBuildContext();
    const descriptionWithBuildInfo = [
      description,
      `Build Source: ${build.buildSource}`,
      `Build ID: ${build.buildId}`,
      `Build Time (UTC): ${build.buildTimeUtc}`,
      `Service Version: ${build.serviceVersion}`,
    ]
      .filter((line) => line.trim().length > 0)
      .join('\n\n');
    return new DocumentBuilder()
      .setTitle(name)
      .setDescription(descriptionWithBuildInfo)
      .setVersion(build.serviceVersion || version)
      .addBearerAuth();
  }

  private getBuildContext(): BuildContext {
    const firstNonEmpty = (...values: Array<string | undefined>): string => {
      for (const value of values) {
        if (value && value.trim()) {
          return value;
        }
      }

      return '';
    };

    const buildSource = firstNonEmpty(
      process.env.BUILD_SOURCE,
      process.env.SERVICE_VERSION,
      process.env.BUILD_ID,
      process.env.GITHUB_RUN_ID,
      'local',
    );

    const serviceVersion = firstNonEmpty(
      process.env.SERVICE_VERSION,
      process.env.APP_VERSION,
      process.env.npm_package_version,
      this.configService.getConfig().info.version,
      '1.0.0',
    );

    const buildTimeUtc = firstNonEmpty(
      process.env.BUILD_TIME_UTC,
      process.env.BUILD_TIMESTAMP,
      new Date().toISOString(),
    );

    const buildId = firstNonEmpty(
      process.env.BUILD_ID,
      process.env.GITHUB_RUN_ID,
      'local',
    );

    return {
      buildSource,
      buildId,
      serviceVersion,
      buildTimeUtc,
    };
  }
}
