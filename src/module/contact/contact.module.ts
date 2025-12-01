import { Module } from '@nestjs/common';
import { DocDbModule } from '../db/doc/doc-db.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [DocDbModule],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
