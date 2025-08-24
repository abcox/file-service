import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigModule } from '../config/config.module';
import { LoggingModule } from '../../service/logger/logging.module';

@Module({
  imports: [ConfigModule, LoggingModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
