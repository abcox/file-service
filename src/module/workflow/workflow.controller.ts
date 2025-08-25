import {
  Controller,
  Get,
  Query,
  HttpException,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import {
  FileWorkflowService,
  AnalysisWorkflowRequest,
} from './file-workflow.service';
import { LoggerService } from '../logger/logger.service';
import { Auth } from '../auth/auth.guard';

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
  @Auth({ public: true })
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

  @Get('file/report/download')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Generate and download analysis report as PDF',
    description:
      'Uploads a file from blob storage to OpenAI, generates an analysis report, and returns it as a downloadable PDF',
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
    description: 'PDF report generated and downloaded successfully',
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
  async downloadFileReport(
    @Query('fileId') fileId: string,
    @Query('userId') userId: string,
    @Query('analysisType') analysisType: 'contract' | 'document' | 'general',
    @Res() res: Response,
    @Query('customPrompt') customPrompt?: string,
  ): Promise<void> {
    try {
      this.logger.info('File report download requested', {
        fileId,
        userId,
        analysisType,
        hasCustomPrompt: !!customPrompt,
      });

      // Validate required parameters
      if (!fileId || !userId || !analysisType) {
        res.status(400).json({
          success: false,
          error:
            'Missing required parameters: fileId, userId, and analysisType are required',
        });
        return;
      }

      // Validate analysis type
      if (!['contract', 'document', 'general'].includes(analysisType)) {
        res.status(400).json({
          success: false,
          error:
            'Invalid analysisType. Must be one of: contract, document, general',
        });
        return;
      }

      const request: AnalysisWorkflowRequest = {
        fileId,
        userId,
        analysisType,
        customPrompt,
      };

      const result =
        await this.workflowService.analyzeFileFromBlobStorage(request);

      if (!result.success || !result.pdfResponse?.success) {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to generate PDF report',
        });
        return;
      }

      // Extract filename from fileId
      const filename =
        fileId
          .split('/')
          .pop()
          ?.replace(/\.[^/.]+$/, '') || 'report';
      const pdfFilename = `${filename}_analysis_report.pdf`;

      // Convert base64 to buffer and send as PDF download
      if (result.pdfResponse.pdfBase64) {
        const pdfBuffer = Buffer.from(result.pdfResponse.pdfBase64, 'base64');

        res.set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${pdfFilename}"`,
          'Content-Length': pdfBuffer.length,
        });

        res.send(pdfBuffer);
      } else {
        res.status(500).json({
          success: false,
          error: 'PDF content not available',
        });
      }

      this.logger.info('File report downloaded successfully', {
        fileId,
        analysisId: result.analysisId,
        filename: pdfFilename,
      });
    } catch (error) {
      this.logger.error('File report download failed', error as Error, {
        fileId,
        userId,
        analysisType,
      });

      res.status(500).json({
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }

  @Get('file/report/download/json')
  @Auth({ public: true })
  @ApiOperation({
    summary: 'Generate analysis report and return as JSON with base64 PDF data',
    description:
      'Uploads a file from blob storage to OpenAI, generates an analysis report, and returns JSON with base64 PDF data and metadata',
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
    description: 'Analysis report generated successfully with PDF data',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        analysisId: { type: 'string' },
        filename: { type: 'string' },
        pdfData: { type: 'string', description: 'Base64 encoded PDF content' },
        fileSize: { type: 'number' },
        generatedAt: { type: 'string', format: 'date-time' },
        analysisType: {
          type: 'string',
          enum: ['contract', 'document', 'general'],
        },
        usage: {
          type: 'object',
          properties: {
            promptTokens: { type: 'number' },
            completionTokens: { type: 'number' },
            totalTokens: { type: 'number' },
          },
        },
      },
    },
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
  async downloadFileReportJson(
    @Query('fileId') fileId: string,
    @Query('userId') userId: string,
    @Query('analysisType') analysisType: 'contract' | 'document' | 'general',
    @Query('customPrompt') customPrompt?: string,
  ): Promise<object> {
    try {
      this.logger.info('File report JSON download requested', {
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

      if (!result.success || !result.pdfResponse?.success) {
        throw new HttpException(
          result.error || 'Failed to generate PDF report',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // Extract filename from fileId
      const filename =
        fileId
          .split('/')
          .pop()
          ?.replace(/\.[^/.]+$/, '') || 'report';
      const pdfFilename = `${filename}_analysis_report.pdf`;

      // Get PDF data and metadata
      if (!result.pdfResponse.pdfBase64) {
        throw new HttpException(
          'PDF content not available',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const pdfBuffer = Buffer.from(result.pdfResponse.pdfBase64, 'base64');

      this.logger.info('File report JSON generated successfully', {
        fileId,
        analysisId: result.analysisId,
        filename: pdfFilename,
        fileSize: pdfBuffer.length,
      });

      return {
        success: true,
        analysisId: result.analysisId,
        filename: pdfFilename,
        pdfData: result.pdfResponse.pdfBase64,
        fileSize: pdfBuffer.length,
        generatedAt: new Date().toISOString(),
        analysisType: analysisType,
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    } catch (error) {
      this.logger.error('File report JSON generation failed', error as Error, {
        fileId,
        userId,
        analysisType,
      });

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        error instanceof Error ? error.message : 'Unknown error occurred',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
