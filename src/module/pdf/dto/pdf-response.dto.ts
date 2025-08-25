import { ApiProperty } from '@nestjs/swagger';

export class PdfResponseDto {
  @ApiProperty({
    description: 'Whether the PDF was created successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'PDF created successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Generated PDF as base64 string',
    example: 'JVBERi0xLjQKJcOkw7zDtsO...',
    required: false,
  })
  pdfBase64?: string;

  @ApiProperty({
    description: 'PDF file size in bytes',
    example: 12345,
    required: false,
  })
  fileSize?: number;

  @ApiProperty({
    description: 'Number of pages in the PDF',
    example: 3,
    required: false,
  })
  pageCount?: number;

  @ApiProperty({
    description: 'Error details if creation failed',
    example: 'Invalid text content provided',
    required: false,
  })
  error?: string;
}
