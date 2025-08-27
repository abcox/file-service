import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray } from 'class-validator';

export class AnalysisSection {
  @ApiProperty({ description: 'Section title', example: 'Executive Summary' })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Section content',
    example: 'This document provides a comprehensive analysis...',
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'List of key points',
    example: ['Point 1', 'Point 2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyPoints?: string[];
}

export class AnalysisContentDto {
  @ApiProperty({
    description: 'Document title',
    example: 'Contract Analysis Report',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Executive summary',
    example: 'This contract analysis reveals...',
  })
  @IsString()
  summary: string;

  @ApiProperty({
    description: 'Key findings',
    example: ['Finding 1', 'Finding 2'],
  })
  @IsArray()
  @IsString({ each: true })
  keyFindings: string[];

  @ApiProperty({ description: 'Analysis sections', type: [AnalysisSection] })
  @IsArray()
  sections: AnalysisSection[];

  @ApiProperty({
    description: 'Recommendations',
    example: ['Recommendation 1', 'Recommendation 2'],
  })
  @IsArray()
  @IsString({ each: true })
  recommendations: string[];

  @ApiProperty({
    description: 'Analysis metadata',
    example: { analyzedAt: '2025-01-27', model: 'gpt-4o-mini' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
