import { Module } from '@nestjs/common';
import { AssetService } from './asset.service';
import { AssetController } from './asset.controller';
import { DocDbModule } from '../db/doc/doc-db.module';
import { ContactModule } from '../contact/contact.module';

@Module({
  imports: [DocDbModule, ContactModule],
  providers: [AssetService],
  controllers: [AssetController],
  exports: [AssetService],
})
export class AssetModule {}
