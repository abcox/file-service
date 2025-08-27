import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { FileService } from '../file/file.service';
import { GptService, GptAnalysisResponse } from '../gpt/gpt.service';
//import { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { PdfService } from '../pdf/pdf.service';
import { PdfResponseDto } from '../pdf/dto/pdf-response.dto';
import { AnalysisContentDto } from '../pdf/dto/analysis-content.dto';
import { UserService } from '../user/user.service';
import { AuthService } from '../auth/auth.service';

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
    private readonly userService: UserService,
    private readonly gptService: GptService,
    private readonly pdfService: PdfService,
    private readonly authService: AuthService,
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

      // Create a structured analysis prompt
      const analysisPrompt =
        request.customPrompt ||
        `Analyze this document and provide a comprehensive professional report. Focus on:

1. **Executive Summary**: Brief overview of the document's key points
2. **Key Findings**: Most important discoveries or insights
3. **Detailed Analysis**: Break down the document into logical sections
4. **Recommendations**: Actionable insights and next steps

For each section, provide clear, concise content that would be suitable for a professional report.`;

      // Try structured analysis first, fallback to text if it fails
      let analysisResponse: GptAnalysisResponse;
      let analysisContent: AnalysisContentDto | null = null;

      try {
        analysisResponse = await this.gptService.analyzeFileAsStructured(
          file,
          analysisPrompt,
          {
            model: 'gpt-4o-mini',
            maxTokens: 2000, // Increased for structured content
            temperature: 0.3,
          },
        );

        if (analysisResponse.success && analysisResponse.content) {
          // TODO: remove this after testing
          const responseBuffer = Buffer.from(analysisResponse.content);
          const user = this.authService.getUser();
          console.log('analyzeFileFromBlobStorage user:', { user });
          await this.userService.uploadFile(
            user,
            'analysis-report.json',
            responseBuffer,
            true,
          );

          // Debug: Log the original content
          this.logger.info('Original GPT response content', {
            contentLength: analysisResponse.content.length,
            startsWithBackticks: analysisResponse.content
              .trim()
              .startsWith('```'),
            endsWithBackticks: analysisResponse.content.trim().endsWith('```'),
            first50Chars: analysisResponse.content.substring(0, 50),
            last50Chars: analysisResponse.content.substring(
              analysisResponse.content.length - 50,
            ),
          });

          // Clean the response content - remove markdown code block markers
          let cleanContent = analysisResponse.content.trim();

          // Remove markdown code block markers if present
          if (cleanContent.startsWith('```json')) {
            cleanContent = cleanContent.replace(/^```json\s*/, '');
          }
          if (cleanContent.startsWith('```')) {
            cleanContent = cleanContent.replace(/^```\s*/, '');
          }
          if (cleanContent.endsWith('```')) {
            cleanContent = cleanContent.replace(/\s*```$/, '');
          }

          // Debug: Log the cleaned content
          this.logger.info('Cleaned content for JSON parsing', {
            cleanContentLength: cleanContent.length,
            startsWithBrace: cleanContent.trim().startsWith('{'),
            endsWithBrace: cleanContent.trim().endsWith('}'),
            first50Chars: cleanContent.substring(0, 50),
            last50Chars: cleanContent.substring(cleanContent.length - 50),
          });

          try {
            // Parse the JSON response
            analysisContent = JSON.parse(cleanContent) as AnalysisContentDto;
            this.logger.info(
              'Successfully parsed structured analysis content',
              {
                title: analysisContent.title,
                sectionsCount: analysisContent.sections?.length || 0,
              },
            );
          } catch (parseError) {
            this.logger.warn(
              'Failed to parse structured JSON, falling back to text analysis',
              {
                error:
                  parseError instanceof Error
                    ? parseError.message
                    : 'Unknown error',
                cleanContentLength: cleanContent.length,
                cleanContentStart: cleanContent.substring(0, 100),
                cleanContentEnd: cleanContent.substring(
                  cleanContent.length - 100,
                ),
              },
            );
            // Fallback to text analysis
            analysisResponse = await this.gptService.analyzeFile(
              file,
              'Provide a concise summary of this document with key points and recommendations.',
              {
                model: 'gpt-4o-mini',
                maxTokens: 800,
                temperature: 0.3,
              },
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          'Structured analysis failed, falling back to text analysis',
          {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        );

        // Fallback to simpler text analysis
        analysisResponse = await this.gptService.analyzeFile(
          file,
          'Provide a concise summary of this document with key points and recommendations.',
          {
            model: 'gpt-4o-mini',
            maxTokens: 800,
            temperature: 0.3,
          },
        );
      }

      if (!analysisResponse.success) {
        throw new Error(`Analysis failed: ${analysisResponse.error}`);
      }

      this.logger.info('Analysis completed successfully', {
        responseLength: analysisResponse.content?.length || 0,
        hasContent: !!analysisResponse.content,
        isStructured: !!analysisContent,
      });

      let pdfResponse: PdfResponseDto;

      if (analysisContent) {
        // Use structured content with template
        this.logger.info('Creating PDF from structured analysis content', {
          title: analysisContent.title,
          sectionsCount: analysisContent.sections?.length || 0,
        });

        pdfResponse = await this.pdfService.createPdfFromAnalysisContent(
          analysisContent,
          {
            title: `${fileInfo.filename} - Analysis Report`,
            author: 'AI Analysis Service',
            subject: 'Document Analysis Report',
            includeHeader: true,
            includeFooter: true,
            includePageNumbers: true,
          },
        );

        this.logger.info('PDF generation result', {
          success: pdfResponse.success,
          hasPdfBase64: !!pdfResponse.pdfBase64,
          fileSize: pdfResponse.fileSize,
          error: pdfResponse.error,
        });
      } else {
        // Fallback to HTML generation
        this.logger.info('Using fallback HTML generation path');

        const htmlPrompt = `Analyze this document and provide a professional report with:
        <h1>Document Analysis Report</h1>
        <h2>Executive Summary</h2>
        <p>[Brief overview]</p>
        <h2>Key Findings</h2>
        <ul>
        <li>[Main point 1]</li>
        <li>[Main point 2]</li>
        </ul>
        <h2>Important Details</h2>
        <p>[Critical information]</p>
        <h2>Recommendations</h2>
        <p>[Actionable insights]</p>
        Keep it concise but comprehensive.`;

        const htmlResponse = await this.gptService.analyzeFileAsHtml(
          file,
          htmlPrompt,
          {
            model: 'gpt-4o-mini',
            maxTokens: 1500,
            temperature: 0.3,
          },
        );

        if (!htmlResponse.success) {
          throw new Error(`HTML analysis failed: ${htmlResponse.error}`);
        }

        pdfResponse = await this.pdfService.createPdfFromHtml({
          html: htmlResponse.content || '',
          title: `${fileInfo.filename} - Analysis Report`,
          author: 'AI Analysis Service',
          subject: 'Document Analysis Report',
          includeHeader: true,
          includeFooter: true,
          includePageNumbers: true,
        });
      }

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
