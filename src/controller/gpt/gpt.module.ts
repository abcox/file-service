import { Module } from '@nestjs/common';
import { GptController } from './gpt.controller';
import { GptService } from '../../service/chatGpt/gpt.service';
import { LoggingModule } from '../../service/logger/logging.module';
import { ConfigModule } from '../../service/config/config.module';
import { AppConfigService } from '../../service/config/config.service';
import { LoggerService } from '../../service/logger/logger.service';

@Module({
  imports: [LoggingModule, ConfigModule],
  controllers: [GptController],
  providers: [
    {
      provide: GptService,
      useFactory: (configService: AppConfigService, logger: LoggerService) => {
        const gptService = new GptService(logger, configService);
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
      inject: [AppConfigService, LoggerService],
    },
  ],
  exports: [GptService],
})
export class GptModule {}
