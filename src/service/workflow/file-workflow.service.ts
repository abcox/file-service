import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { FileService } from '../../module/file/file.service'; // TODO: refactor this service to workflow module and then import file.module (and remove this reference)
import { GptService } from '../chatGpt/gpt.service';
import { ChatCompletionContentPart } from 'openai/resources/chat/completions';

export interface WorkflowStatus {
  status:
    | 'pending'
    | 'downloading'
    | 'uploading'
    | 'analyzing'
    | 'completed'
    | 'failed';
  step: string;
  progress: number;
  error?: string;
}

export interface AnalysisWorkflowRequest {
  fileId: string;
  userId: string;
  analysisType: 'contract' | 'document' | 'general';
  customPrompt?: string;
}

export interface AnalysisWorkflowResponse {
  success: boolean;
  analysisId?: string;
  status?: WorkflowStatus;
  error?: string;
}

@Injectable()
export class FileWorkflowService {
  constructor(
    private readonly logger: LoggerService,
    private readonly fileService: FileService,
    private readonly gptService: GptService,
  ) {}

  // Goal: Analyze a file from blob storage and return a report
  // Steps:
  // 1. Get file from blob storage
  // 2. Upload to OpenAI
  // 3. Analyze with GPT
  // 4. Store results
  // 5. Clean up (delete file from OpenAI)
  async analyzeFileFromBlobStorage(
    request: AnalysisWorkflowRequest,
  ): Promise<AnalysisWorkflowResponse> {
    try {
      this.logger.info('Starting file analysis workflow', {
        fileId: request.fileId,
        userId: request.userId,
        analysisType: request.analysisType,
      });

      // Get file from blob storage
      const fileInfo = await this.fileService.getFile(request.fileId);
      const fileContent = await this.fileService.getFileContent(fileInfo);

      // Upload file to OpenAI
      const FileUploadResponse = await this.gptService.uploadFile(
        fileContent,
        fileInfo.filename,
      );

      const { success, fileId, error } = FileUploadResponse;
      if (!success || !fileId) {
        throw new Error(`Failed to upload file to OpenAI: ${error}`);
      }

      // Analyze the uploaded file using the file ID
      const file = {
        type: 'file',
        file: {
          id: fileId,
          filename: fileInfo.filename,
          bytes: fileInfo.size,
        },
      } as ChatCompletionContentPart.File;
      const analysisResponse = await this.gptService.analyzeFile(
        file,
        request.customPrompt ||
          //'Please analyze this document and provide insights.',
          'Summarize the document in 100 words.',
        {
          model: 'gpt-4o-mini',
          maxTokens: 1000,
          temperature: 0.5,
        },
      );

      if (!analysisResponse.success) {
        throw new Error(`Analysis failed: ${analysisResponse.error}`);
      }

      return {
        success: true,
        analysisId: FileUploadResponse.fileId,
        status: {
          status: 'completed',
          step: 'analysis-completed',
          progress: 100,
        },
      };
    } catch (error) {
      this.logger.error('File analysis workflow failed', error as Error, {
        fileId: request.fileId,
        userId: request.userId,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /* async getWorkflowStatus(analysisId: string): Promise<WorkflowStatus | null> {
    // TODO: Implement status tracking
    this.logger.info('Getting workflow status', { analysisId });
    return null;
  } */

  /* async cancelWorkflow(analysisId: string): Promise<boolean> {
    // TODO: Implement workflow cancellation
    this.logger.info('Cancelling workflow', { analysisId });
    return false;
  } */
}
