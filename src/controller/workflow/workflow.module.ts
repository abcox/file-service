import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { FileWorkflowService } from '../../service/workflow/file-workflow.service';
import { FileService } from '../../service/file/file.service';
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
