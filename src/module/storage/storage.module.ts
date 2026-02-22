import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigModule } from '../config/config.module';
import { LoggingModule } from '../logger/logging.module';
import { DiagnosticModule } from '../diagnostic/diagnostic.module';

@Module({
  imports: [ConfigModule, LoggingModule, DiagnosticModule],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
