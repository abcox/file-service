import { Controller, Post, Body, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { CreatePdfDto } from './dto/create-pdf.dto';
import { PdfResponseDto } from './dto/pdf-response.dto';
import { Auth } from '../../module/auth/auth.guard';

@ApiTags('PDF')
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Post('create-from-text')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Create a PDF from text content' })
  @ApiBody({ type: CreatePdfDto })
  @ApiResponse({
    status: 201,
    description: 'PDF created successfully',
    type: PdfResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createPdfFromText(
    @Body() createPdfDto: CreatePdfDto,
  ): Promise<PdfResponseDto> {
    return await this.pdfService.createPdfFromText(createPdfDto);
  }

  @Post('create-from-text/download')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Create a PDF from text and download it directly' })
  @ApiBody({ type: CreatePdfDto })
  @ApiResponse({
    status: 201,
    description: 'PDF created and downloaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createAndDownloadPdf(
    @Body() createPdfDto: CreatePdfDto,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.pdfService.createPdfFromText(createPdfDto);

    if (result.success && result.pdfBase64) {
      const pdfBuffer = Buffer.from(result.pdfBase64, 'base64');
      const filename = `${createPdfDto.title || 'document'}.pdf`;

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to create PDF',
        error: result.error,
      });
    }
  }

  @Get('health')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Check PDF service health' })
  @ApiResponse({ status: 200, description: 'PDF service is healthy' })
  healthCheck() {
    return {
      service: 'pdf',
      healthy: true,
      timestamp: new Date().toISOString(),
      features: ['create-from-text', 'download'],
    };
  }
}
