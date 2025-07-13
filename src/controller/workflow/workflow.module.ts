import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { FileWorkflowService } from '../../service/workflow/file-workflow.service';
import { FileService } from '../../service/file/file.service';
import { GptService } from '../../service/chatGpt/gpt.service';
import { LoggerService } from '../../service/logger/logger.service';
import { AppConfigService } from '../../service/config/config.service';
import { StorageModule } from '../../service/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [WorkflowController],
  providers: [
    FileWorkflowService,
    FileService,
    GptService,
    LoggerService,
    AppConfigService,
  ],
  exports: [FileWorkflowService],
})
export class WorkflowModule {}
