import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/config.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [AppConfigModule, StorageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
