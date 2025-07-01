import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigModule } from '../config/config.module';
import { LoggingModule } from '../logging/logging.module';

@Module({
  imports: [ConfigModule, LoggingModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
