import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './service/config/config.module';
import { SwaggerConfigModule } from './config/swagger/swagger-config.module';
import { StorageModule } from './service/storage/storage.module';
import { LoggingModule } from './service/logger/logging.module';
import { AuthModule } from './auth/auth.module';
import { FileController } from './controller/file/file.controller';
import { FileModule } from './controller/file/file.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';

@Module({
  imports: [
    ConfigModule,
    SwaggerConfigModule,
    StorageModule,
    LoggingModule,
    AuthModule,
    FileModule,
  ],
  controllers: [AppController, FileController],
  providers: [AppService, SwaggerConfigService],
})
export class AppModule {}
