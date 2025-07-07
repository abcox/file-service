import { Module } from '@nestjs/common';
import { AppController } from './controller/app/app.controller';
import { AppService } from './service/app/app.service';
import { ConfigModule } from './service/config/config.module';
import { SwaggerConfigModule } from './config/swagger/swagger-config.module';
import { StorageModule } from './service/storage/storage.module';
import { LoggingModule } from './service/logger/logging.module';
import { AuthModule } from './auth/auth.module';
import { FileController } from './controller/file/file.controller';
import { FileModule } from './controller/file/file.module';
import { SwaggerConfigService } from './config/swagger/swagger-config.service';
import { ConfigController } from './controller/config/config.controller';

@Module({
  imports: [
    ConfigModule,
    SwaggerConfigModule,
    StorageModule,
    LoggingModule,
    AuthModule,
    FileModule,
  ],
  controllers: [AppController, FileController, ConfigController],
  providers: [AppService, SwaggerConfigService],
})
export class AppModule {}
