import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreatePdfFromHtmlDto {
  @ApiProperty({
    description: 'HTML content to convert to PDF',
    example: '<h1>Document Title</h1><p>This is the content...</p>',
  })
  @IsString()
  html: string;

  @ApiProperty({
    description: 'Title of the PDF document',
    example: 'Analysis Report',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Author of the PDF document',
    example: 'PDF Service',
    required: false,
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({
    description: 'Subject of the PDF document',
    example: 'Generated Document',
    required: false,
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Include header in the PDF',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean;

  @ApiProperty({
    description: 'Include footer in the PDF',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeFooter?: boolean;

  @ApiProperty({
    description: 'Include page numbers in the PDF',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includePageNumbers?: boolean;
}
