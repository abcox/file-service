import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { FileWorkflowService } from './file-workflow.service';
import { FileModule } from '../file/file.module';

// TODO: refactor all these services to modules and then import to the workflow module as required
import { GptModule } from '../gpt/gpt.module';
import { LoggerService } from '../logger/logger.service';
import { StorageModule } from '../storage/storage.module';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [StorageModule, ConfigModule, StorageModule, FileModule, GptModule],
  controllers: [WorkflowController],
  providers: [FileWorkflowService, LoggerService],
  exports: [FileWorkflowService],
})
export class WorkflowModule {}
