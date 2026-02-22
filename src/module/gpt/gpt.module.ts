import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from './gpt.service';
import { ConfigModule } from '../config/config.module';
import { AppConfigService } from '../config/config.service';
import { LoggingModule } from '../logger/logging.module';
import { LoggerService } from '../logger/logger.service';
import { DiagnosticModule } from '../diagnostic/diagnostic.module';
import { DiagnosticService } from '../diagnostic/diagnostic.service';

@Module({
  imports: [LoggingModule, ConfigModule, DiagnosticModule],
  controllers: [GptController],
  providers: [
    {
      provide: GptService,
      useFactory: (
        configService: AppConfigService,
        logger: LoggerService,
        diagnosticService: DiagnosticService,
      ) => {
        const gptService = new GptService(logger, configService);
        // Register with diagnostic service
        gptService.setDiagnosticService(diagnosticService);
        try {
          const { gptConfig } = configService.getConfig();
          if (!gptConfig) {
            logger.warn(
              'GPT config not found, service will initialize when config is available',
            );
            return gptService;
          }
          gptService.init(gptConfig);
          logger.info('GPT service initialized successfully with config');
        } catch (error) {
          logger.warn(
            'GPT service initialization delayed - config not ready yet',
            error as Error,
          );
        }
        return gptService;
      },
      inject: [AppConfigService, LoggerService, DiagnosticService],
    },
  ],
  exports: [GptService],
})
export class GptModule {}
