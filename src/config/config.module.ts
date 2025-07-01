import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import { KeyVaultService } from './keyvault.service';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
    }),
    LoggingModule,
  ],
  providers: [AppConfigService, KeyVaultService],
  exports: [AppConfigService, KeyVaultService],
})
export class ConfigModule {}
