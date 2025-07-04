import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { StorageModule } from './storage/storage.module';
import { LoggingModule } from './logging/logging.module';
import { AuthModule } from './auth/auth.module';
import { FileController } from './controller/file/file.controller';
import { FileModule } from './controller/file/file.module';
@Module({
  imports: [ConfigModule, StorageModule, LoggingModule, AuthModule, FileModule],
  controllers: [AppController, FileController],
  providers: [AppService],
})
export class AppModule {}
