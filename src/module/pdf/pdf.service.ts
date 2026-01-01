import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { chromium } from 'playwright';
/* import * as fs from 'fs';
import * as path from 'path'; */
import * as Handlebars from 'handlebars';

import { LoggerService } from '../logger/logger.service';
import { CreatePdfDto } from './dto/create-pdf.dto';
import { CreatePdfFromHtmlDto } from './dto/create-pdf-from-html.dto';
import { PdfResponseDto } from './dto/pdf-response.dto';
import {
  AnalysisContentDto,
  AnalysisSection,
} from './dto/analysis-content.dto';
import { readPdfTemplate } from '../../shared/util';

interface TemplateData {
  title: string;
  summary: string;
  keyFindings: string[];
  sections: AnalysisSection[];
  recommendations: string[];
}
@Injectable()
export class PdfService {
  constructor(private readonly logger: LoggerService) {}

  async createPdfFromText(createPdfDto: CreatePdfDto): Promise<PdfResponseDto> {
    try {
      this.logger.log('Creating PDF from text', {
        textLength: createPdfDto.text.length,
        title: createPdfDto.title,
      });

      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: createPdfDto.title || 'Generated PDF',
          Author: createPdfDto.author || 'PDF Service',
          Subject: createPdfDto.subject || 'Generated Document',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];

      // Collect PDF data chunks
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Add header if requested
      if (createPdfDto.includeHeader && createPdfDto.title) {
        this.addHeader(doc, createPdfDto.title);
      }

      // Add text content
      this.addTextContent(doc, createPdfDto.text);

      // Add footer if requested
      if (createPdfDto.includeFooter) {
        this.addFooter(doc, createPdfDto.author);
      }

      // Add page numbers if requested
      if (createPdfDto.includePageNumbers) {
        this.addPageNumbers(doc);
      }

      // Finalize the PDF
      doc.end();

      // Wait for the PDF to be generated
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const pdfBase64 = pdfBuffer.toString('base64');

            this.logger.log('PDF created successfully from text', {
              fileSize: pdfBuffer.length,
              pageCount: doc.bufferedPageRange().count,
            });

            const response: PdfResponseDto = {
              success: true,
              message: 'PDF created successfully from text',
              pdfBase64,
              fileSize: pdfBuffer.length,
              pageCount: doc.bufferedPageRange().count,
            };

            resolve(response);
          } catch (error) {
            this.logger.error('Error processing PDF buffer', error);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });

        doc.on('error', (error) => {
          this.logger.error('Error generating PDF from text', error);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    } catch (error) {
      this.logger.error('Error creating PDF from text', error);

      return {
        success: false,
        message: 'Failed to create PDF from text',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  getHtmlFromTemplate(
    templateSource: string,
    templateData: TemplateData,
  ): string {
    const template = Handlebars.compile(templateSource);
    return template(templateData);
  }

  async createPdfFromAnalysisContent(
    analysisContent: AnalysisContentDto,
    options?: {
      title?: string;
      author?: string;
      subject?: string;
      includeHeader?: boolean;
      includeFooter?: boolean;
      includePageNumbers?: boolean;
    },
    templateFilename = 'analysis-report.template.html',
  ): Promise<PdfResponseDto> {
    try {
      this.logger.log('Creating PDF from analysis content', {
        title: analysisContent.title,
        sectionsCount: analysisContent.sections.length,
      });

      // Load and compile the template
      /* const templatePath = path.join(
          process.cwd(),
          'assets',
          'templates',
          'analysis-report.template.html',
        );
        const templateSource = fs.readFileSync(templatePath, 'utf8'); */
      const templateSource = readPdfTemplate(templateFilename);
      if (!templateSource) {
        throw new Error(`Template not found: ${templateFilename}`);
      }

      // Prepare template data
      const templateData = {
        title: options?.title || analysisContent.title,
        summary: analysisContent.summary,
        keyFindings: analysisContent.keyFindings,
        sections: analysisContent.sections,
        recommendations: analysisContent.recommendations,
        generatedAt: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        metadata: analysisContent.metadata,
      };

      const html = this.getHtmlFromTemplate(templateSource, templateData);

      // Create PDF from the generated HTML using PDFKit for PoC
      // TODO: review this, and revert to createPdfFromHtml (Playwright) when ACI is ready?
      return this.createPdfFromHtmlWithPdfKit({
        html,
        title: options?.title || analysisContent.title,
        author: options?.author || 'AI Analysis Service',
        subject: options?.subject || 'Document Analysis Report',
        includeHeader: options?.includeHeader ?? true,
        includeFooter: options?.includeFooter ?? true,
        includePageNumbers: options?.includePageNumbers ?? true,
      });
    } catch (error) {
      this.logger.error('Error creating PDF from analysis content', error);

      return {
        success: false,
        message: 'Failed to create PDF from analysis content',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createPdfFromHtml(
    createPdfDto: CreatePdfFromHtmlDto,
  ): Promise<PdfResponseDto> {
    try {
      this.logger.log('Creating PDF from HTML with Playwright', {
        htmlLength: createPdfDto.html.length,
        title: createPdfDto.title,
      });

      // Launch browser and create PDF with proper CSS rendering
      const browser = await chromium.launch({
        headless: true,
        executablePath: process.env.PLAYWRIGHT_BROWSER_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
        ],
      });
      const page = await browser.newPage();

      // Set content and wait for it to load
      await page.setContent(createPdfDto.html, { waitUntil: 'networkidle' });

      // Generate PDF with proper styling
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        printBackground: true, // This ensures CSS backgrounds and colors are included
        preferCSSPageSize: true,
      });

      await browser.close();

      const pdfBase64 = pdfBuffer.toString('base64');

      this.logger.log('PDF created successfully from HTML with Playwright', {
        fileSize: pdfBuffer.length,
      });

      const response: PdfResponseDto = {
        success: true,
        message: 'PDF created successfully from HTML with CSS styling',
        pdfBase64,
        fileSize: pdfBuffer.length,
        pageCount: 1, // Playwright doesn't provide page count easily
      };

      return response;
    } catch (error) {
      this.logger.error('Error creating PDF from HTML with Playwright', error);

      return {
        success: false,
        message: 'Failed to create PDF from HTML',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async createPdfFromHtmlWithPdfKit(
    createPdfDto: CreatePdfFromHtmlDto,
  ): Promise<PdfResponseDto> {
    try {
      this.logger.log('Creating PDF from HTML with PDFKit', {
        htmlLength: createPdfDto.html.length,
        title: createPdfDto.title,
      });

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
        info: {
          Title: createPdfDto.title || 'Generated PDF',
          Author: createPdfDto.author || 'PDF Service',
          Subject: createPdfDto.subject || 'Generated Document',
          CreationDate: new Date(),
        },
      });

      const chunks: Buffer[] = [];

      // Collect PDF data chunks
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      // Convert HTML to styled text content
      const styledContent = this.convertHtmlToStyledText(createPdfDto.html);

      // Add styled content to PDF
      this.addStyledContent(doc, styledContent);

      // Finalize the PDF
      doc.end();

      // Wait for the PDF to be generated
      return new Promise((resolve, reject) => {
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const pdfBase64 = pdfBuffer.toString('base64');

            this.logger.log('PDF created successfully from HTML with PDFKit', {
              fileSize: pdfBuffer.length,
              pageCount: doc.bufferedPageRange().count,
            });

            const response: PdfResponseDto = {
              success: true,
              message: 'PDF created successfully from HTML with PDFKit',
              pdfBase64,
              fileSize: pdfBuffer.length,
              pageCount: doc.bufferedPageRange().count,
            };

            resolve(response);
          } catch (error) {
            this.logger.error('Error processing PDF buffer', error);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        });

        doc.on('error', (error) => {
          this.logger.error('Error generating PDF from HTML', error);
          reject(error instanceof Error ? error : new Error(String(error)));
        });
      });
    } catch (error) {
      this.logger.error('Error creating PDF from HTML with PDFKit', error);

      return {
        success: false,
        message: 'Failed to create PDF from HTML with PDFKit',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private convertHtmlToStyledText(
    html: string,
  ): Array<{ type: string; value: string | number }> {
    // Simple HTML to styled text conversion
    // This is a basic implementation - you can enhance it for more complex styling
    const styledContent: Array<{ type: string; value: string | number }> = [];

    // Remove HTML tags and extract text with basic styling
    const textContent = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove style tags
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove script tags
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n') // Convert h1 to markdown-style
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n') // Convert h2 to markdown-style
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n') // Convert h3 to markdown-style
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n') // Convert p tags
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n• $1') // Convert li tags
      .replace(/<ul[^>]*>|<\/ul>/gi, '\n') // Remove ul tags
      .replace(/<ol[^>]*>|<\/ol>/gi, '\n') // Remove ol tags
      .replace(/<[^>]*>/g, '') // Remove all other HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Split into lines and add styling
    const lines = textContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        styledContent.push({ type: 'spacing', value: 0.5 });
        continue;
      }

      if (trimmedLine.startsWith('# ')) {
        styledContent.push({
          type: 'heading1',
          value: trimmedLine.substring(2),
        });
      } else if (trimmedLine.startsWith('## ')) {
        styledContent.push({
          type: 'heading2',
          value: trimmedLine.substring(3),
        });
      } else if (trimmedLine.startsWith('### ')) {
        styledContent.push({
          type: 'heading3',
          value: trimmedLine.substring(4),
        });
      } else if (trimmedLine.startsWith('• ')) {
        styledContent.push({ type: 'bullet', value: trimmedLine.substring(2) });
      } else {
        styledContent.push({ type: 'text', value: trimmedLine });
      }
    }

    return styledContent;
  }

  private addStyledContent(
    doc: PDFKit.PDFDocument,
    styledContent: Array<{ type: string; value: string | number }>,
  ): void {
    for (const item of styledContent) {
      switch (item.type) {
        case 'heading1':
          doc
            .fontSize(24)
            .font('Helvetica-Bold')
            .text(item.value as string, { align: 'center' });
          doc.moveDown(1);
          break;
        case 'heading2':
          doc
            .fontSize(18)
            .font('Helvetica-Bold')
            .text(item.value as string);
          doc.moveDown(0.5);
          break;
        case 'heading3':
          doc
            .fontSize(14)
            .font('Helvetica-Bold')
            .text(item.value as string);
          doc.moveDown(0.5);
          break;
        case 'bullet':
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(`• ${item.value as string}`);
          doc.moveDown(0.3);
          break;
        case 'text':
          doc
            .fontSize(12)
            .font('Helvetica')
            .text(item.value as string);
          doc.moveDown(0.5);
          break;
        case 'spacing':
          doc.moveDown(item.value as number);
          break;
      }
    }
  }

  private addTextContent(doc: PDFKit.PDFDocument, text: string): void {
    const lines = text.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        doc.moveDown(0.5);
        continue;
      }
      doc.fontSize(12).font('Helvetica').text(trimmedLine);
      doc.moveDown(0.5);
    }
  }

  private addHeader(doc: PDFKit.PDFDocument, title: string): void {
    const originalFontSize = 12; // Default font size
    doc.fontSize(18).font('Helvetica-Bold').text(title, {
      align: 'center',
    });
    doc.fontSize(originalFontSize).font('Helvetica');
    doc.moveDown(2);
  }

  private addFooter(doc: PDFKit.PDFDocument, author?: string): void {
    const originalFontSize = 12; // Default font size
    const footerText = author
      ? `Generated by ${author}`
      : 'Generated by PDF Service';
    doc.fontSize(10).font('Helvetica').text(footerText, {
      align: 'center',
    });
    doc.fontSize(originalFontSize).font('Helvetica');
  }

  private addPageNumbers(doc: PDFKit.PDFDocument): void {
    // Add page number to current page only - will be applied to all pages
    doc.fontSize(10).text(`Page 1`, 0, doc.page.height - 30, {
      align: 'center',
      width: doc.page.width,
    });
  }

  getPdfInfo(pdfBuffer: Buffer): {
    pageCount: number;
    fileSize: number;
    isValid: boolean;
  } {
    try {
      // Basic validation - check if it's a valid PDF by looking for PDF header
      const header = pdfBuffer.toString('ascii', 0, 4);
      const isValid = header === '%PDF';

      // For a more complete implementation, you might want to use a library like pdf-parse
      // to get actual page count and other metadata

      return {
        pageCount: 0, // Would need pdf-parse or similar to get actual count
        fileSize: pdfBuffer.length,
        isValid,
      };
    } catch (error) {
      this.logger.error('Error getting PDF info', error);
      return {
        pageCount: 0,
        fileSize: 0,
        isValid: false,
      };
    }
  }
}
