import { Module } from '@nestjs/common';
//import { KeyVaultService } from '../../config/keyvault.service';
import { LoggingModule } from '../../service/logger/logging.module';
import { StorageModule } from '../../service/storage/storage.module';
import { FileService } from '../../service/file/file.service';
import { AuthModule } from '../../auth/auth.module';
import { ConfigModule } from '../../service/config/config.module';

@Module({
  imports: [ConfigModule, LoggingModule, StorageModule, AuthModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
