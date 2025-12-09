import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { ConfigModule } from '../../module/config/config.module';
import { LoggingModule } from '../../module/logger/logging.module';

@Module({
  imports: [
    ConfigModule, // Provides AppConfigService
    LoggingModule, // Provides Logger
  ],
  providers: [GmailService],
  exports: [GmailService], // Make GmailService available to other modules
})
export class GmailModule {}
