import { Module } from '@nestjs/common';
//import { KeyVaultService } from '../../config/keyvault.service';
import { LoggingModule } from '../../logging/logging.module';
import { StorageModule } from '../../storage/storage.module';
import { FileService } from '../../service/file.service';
import { AuthModule } from '../../auth/auth.module';
import { ConfigModule } from '../../config/config.module';

@Module({
  imports: [ConfigModule, LoggingModule, StorageModule, AuthModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
