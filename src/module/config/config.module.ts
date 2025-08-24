import { Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService as NestConfigService,
} from '@nestjs/config';
import { AppConfigService } from './config.service';
import { KeyVaultService } from '../../service/keyvault/keyvault.service';
import { LoggingModule } from '../../service/logger/logging.module';
import { LoggerService } from '../../service/logger/logger.service';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule,
  ],
  providers: [
    {
      provide: AppConfigService,
      useFactory: async (
        nestConfigService: NestConfigService,
        keyVaultService: KeyVaultService,
        logger: LoggerService,
      ) => {
        console.log('Initializing AppConfigService...');
        const config = await AppConfigService.init(logger);
        const configService = new AppConfigService(
          nestConfigService,
          keyVaultService,
          logger,
        );
        configService.setConfig(config);

        // Set the config in KeyVaultService after AppConfigService is initialized
        keyVaultService.setConfig(config.azure.keyVaultUrl);

        console.log('AppConfigService initialized successfully');
        return configService;
      },
      inject: [NestConfigService, KeyVaultService, LoggerService],
    },
    KeyVaultService,
  ],
  exports: [AppConfigService, KeyVaultService],
})
export class ConfigModule {}
