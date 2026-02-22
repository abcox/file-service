import { Module } from '@nestjs/common';
import { PeopleService } from './people.service';
import { PeopleController } from './people.controller';
import { ConfigModule } from '../../config/config.module';
import { DiagnosticModule } from '../../diagnostic/diagnostic.module';

@Module({
  imports: [ConfigModule, DiagnosticModule],
  controllers: [PeopleController],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class PeopleModule {}
