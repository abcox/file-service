import { Module } from '@nestjs/common';
import { FileService } from './file.service';
//import { KeyVaultService } from '../../config/keyvault.service';
import { LoggingModule } from '../../service/logger/logging.module';
import { StorageModule } from '../../service/storage/storage.module';
import { AuthModule } from '../../module/auth/auth.module';
import { ConfigModule } from '../../service/config/config.module';
import { FileDbService } from '../../service/database/file-db.service';
import { DatabaseModule } from '../../database/database.module';
import { FileController } from '../../module/file/file.controller';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    StorageModule,
    AuthModule,
    DatabaseModule,
  ],
  controllers: [FileController],
  providers: [FileService, FileDbService],
  exports: [FileService],
})
export class FileModule {}
