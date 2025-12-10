import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { GmailController } from './gmail.controller';
import { ConfigModule } from '../config/config.module';
import { LoggingModule } from '../logger/logging.module';

@Module({
  imports: [
    ConfigModule, // Provides AppConfigService
    LoggingModule, // Provides Logger
  ],
  providers: [GmailService],
  controllers: [GmailController],
  exports: [GmailService], // Make GmailService available to other modules
})
export class GmailModule {}
