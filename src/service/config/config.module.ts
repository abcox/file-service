import { Module } from '@nestjs/common';
import {
  ConfigModule as NestConfigModule,
  ConfigService as NestConfigService,
} from '@nestjs/config';
import { AppConfigService } from './config.service';
import { KeyVaultService } from '../keyvault/keyvault.service';
import { LoggingModule } from '../logger/logging.module';
import { LoggerService } from '../logger/logger.service';
import { JwtAuthService } from '../../auth/jwt-auth.service';

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
        jwtAuthService: JwtAuthService,
      ) => {
        console.log('Initializing AppConfigService...');
        const config = await AppConfigService.init(logger);
        const configService = new AppConfigService(
          nestConfigService,
          keyVaultService,
          logger,
          jwtAuthService,
        );
        configService.setConfig(config);

        // Set the config in KeyVaultService after AppConfigService is initialized
        keyVaultService.setConfig(config.azure.keyVaultUrl);

        jwtAuthService.setConfig(config);

        console.log('AppConfigService initialized successfully');
        return configService;
      },
      inject: [
        NestConfigService,
        KeyVaultService,
        LoggerService,
        JwtAuthService,
      ],
    },
    KeyVaultService,
  ],
  exports: [AppConfigService, KeyVaultService],
})
export class ConfigModule {}
