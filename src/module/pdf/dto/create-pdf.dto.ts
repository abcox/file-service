import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class CreatePdfDto {
  @ApiProperty({
    description: 'Text content to include in the PDF',
    example: 'This is the main content of the PDF document.',
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Title of the PDF document',
    example: 'Sample Document',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Author of the PDF document',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({
    description: 'Subject of the PDF document',
    example: 'Sample PDF Generation',
    required: false,
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({
    description: 'Font size for the text',
    example: 12,
    default: 12,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  fontSize?: number = 12;

  @ApiProperty({
    description: 'Font family for the text',
    example: 'Helvetica',
    default: 'Helvetica',
    required: false,
  })
  @IsOptional()
  @IsString()
  fontFamily?: string = 'Helvetica';

  @ApiProperty({
    description: 'Include page numbers',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includePageNumbers?: boolean = false;

  @ApiProperty({
    description: 'Include header with title',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeHeader?: boolean = false;

  @ApiProperty({
    description: 'Include footer with author and date',
    example: true,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeFooter?: boolean = false;
}
