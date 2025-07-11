import { Module } from '@nestjs/common';
//import { KeyVaultService } from '../../config/keyvault.service';
import { LoggingModule } from '../../service/logger/logging.module';
import { StorageModule } from '../../service/storage/storage.module';
import { FileService } from '../../service/file/file.service';
import { AuthModule } from '../../auth/auth.module';
import { ConfigModule } from '../../service/config/config.module';
import { FileDbService } from '../../service/database/file-db.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    StorageModule,
    AuthModule,
    DatabaseModule,
  ],
  providers: [FileService, FileDbService],
  exports: [FileService],
})
export class FileModule {}
