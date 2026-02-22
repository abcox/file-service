import { Module } from '@nestjs/common';
import { DiagnosticController } from './diagnostic.controller';
import { DiagnosticService } from './diagnostic.service';
import { LoggingModule } from '../logger/logging.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [LoggingModule, ConfigModule],
  controllers: [DiagnosticController],
  providers: [DiagnosticService],
  exports: [DiagnosticService],
})
export class DiagnosticModule {}
