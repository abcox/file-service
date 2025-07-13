import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import {
  FileWorkflowService,
  AnalysisWorkflowRequest,
} from '../../service/workflow/file-workflow.service';
import { LoggerService } from '../../service/logger/logger.service';

export interface FileReportRequest {
  fileId: string;
  userId: string;
  analysisType: 'contract' | 'document' | 'general';
  customPrompt?: string;
}

export interface FileReportResponse {
  success: boolean;
  analysisId?: string;
  report?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

@ApiTags('Workflow')
@Controller('workflow')
export class WorkflowController {
  constructor(
    private readonly workflowService: FileWorkflowService,
    private readonly logger: LoggerService,
  ) {}

  @Get('file/report')
  @ApiOperation({
    summary: 'Generate analysis report for a file',
    description:
      'Uploads a file from blob storage to OpenAI and generates an analysis report',
  })
  @ApiQuery({
    name: 'fileId',
    description: 'The ID of the file to analyze',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'userId',
    description: 'The ID of the user requesting the analysis',
    type: String,
    required: true,
  })
  @ApiQuery({
    name: 'analysisType',
    description: 'Type of analysis to perform',
    enum: ['contract', 'document', 'general'],
    required: true,
  })
  @ApiQuery({
    name: 'customPrompt',
    description: 'Custom prompt for the analysis (optional)',
    type: String,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Analysis report generated successfully',
    type: Object,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing required parameters',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error during analysis',
  })
  async generateFileReport(
    @Query('fileId') fileId: string,
    @Query('userId') userId: string,
    @Query('analysisType') analysisType: 'contract' | 'document' | 'general',
    @Query('customPrompt') customPrompt?: string,
  ): Promise<FileReportResponse> {
    try {
      this.logger.info('File report generation requested', {
        fileId,
        userId,
        analysisType,
        hasCustomPrompt: !!customPrompt,
      });

      // Validate required parameters
      if (!fileId || !userId || !analysisType) {
        throw new HttpException(
          'Missing required parameters: fileId, userId, and analysisType are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate analysis type
      if (!['contract', 'document', 'general'].includes(analysisType)) {
        throw new HttpException(
          'Invalid analysisType. Must be one of: contract, document, general',
          HttpStatus.BAD_REQUEST,
        );
      }

      const request: AnalysisWorkflowRequest = {
        fileId,
        userId,
        analysisType,
        customPrompt,
      };

      const result =
        await this.workflowService.analyzeFileFromBlobStorage(request);

      if (!result.success) {
        throw new HttpException(
          result.error || 'Analysis failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.info('File report generated successfully', {
        fileId,
        analysisId: result.analysisId,
      });

      return {
        success: true,
        analysisId: result.analysisId,
        report: 'Analysis completed successfully', // TODO: Return actual analysis content
        usage: {
          promptTokens: 0, // TODO: Get from GPT response
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      this.logger.error('File report generation failed', error as Error, {
        fileId,
        userId,
        analysisType,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
