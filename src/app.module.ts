import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { StorageModule } from './storage/storage.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [AppConfigModule, StorageModule, LoggingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
