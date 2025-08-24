import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { FileWorkflowService } from '../../service/workflow/file-workflow.service';
import { FileService } from '../../module/file/file.service';

// TODO: refactor all these services to modules and then import to the workflow module as required
import { GptService } from '../../service/chatGpt/gpt.service';
import { LoggerService } from '../../service/logger/logger.service';
import { StorageModule } from '../../service/storage/storage.module';
import { ConfigModule } from '../../service/config/config.module';

@Module({
  imports: [StorageModule, ConfigModule, StorageModule],
  controllers: [WorkflowController],
  providers: [FileWorkflowService, FileService, GptService, LoggerService],
  exports: [FileWorkflowService],
})
export class WorkflowModule {}
