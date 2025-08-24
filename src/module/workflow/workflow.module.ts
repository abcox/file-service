import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { FileWorkflowService } from './file-workflow.service';
import { FileModule } from '../file/file.module';

// TODO: refactor all these services to modules and then import to the workflow module as required
import { GptModule } from '../../module/gpt/gpt.module';
import { LoggerService } from '../../service/logger/logger.service';
import { StorageModule } from '../../module/storage/storage.module';
import { ConfigModule } from '../../service/config/config.module';

@Module({
  imports: [StorageModule, ConfigModule, StorageModule, FileModule, GptModule],
  controllers: [WorkflowController],
  providers: [FileWorkflowService, LoggerService],
  exports: [FileWorkflowService],
})
export class WorkflowModule {}
