import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { FileService } from '../file/file.service';
import { GptService } from '../gpt/gpt.service';
//import { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { PdfService } from '../pdf/pdf.service';
import { PdfResponseDto } from '../pdf/dto/pdf-response.dto';

export type FileContent = {
  type: string;
  file: {
    file_id: string;
    filename?: string;
    bytes?: number;
  };
};

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
  pdfResponse?: PdfResponseDto;
}

@Injectable()
export class FileWorkflowService {
  constructor(
    private readonly logger: LoggerService,
    private readonly fileService: FileService,
    private readonly gptService: GptService,
    private readonly pdfService: PdfService,
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
          file_id: fileId,
          filename: fileInfo.filename,
          bytes: fileInfo.size,
        },
      };
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

      console.log('analysisResponse', analysisResponse);

      const pdfResponse = await this.pdfService.createPdfFromText({
        text: analysisResponse.content || '',
        title: fileInfo.filename,
      });

      return {
        success: true,
        analysisId: FileUploadResponse.fileId,
        status: {
          status: 'completed',
          step: 'analysis-completed',
          progress: 100,
        } as WorkflowStatus,
        pdfResponse,
      } as AnalysisWorkflowResponse;
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
