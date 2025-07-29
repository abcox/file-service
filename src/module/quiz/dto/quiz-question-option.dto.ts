import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

/* eslint-disable @typescript-eslint/no-unsafe-call */

/**
 * DTO for quiz question option
 */
export class QuizQuestionOptionDto {
  @ApiProperty({
    description: 'Unique identifier for the option',
    example: 1,
    type: Number,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Option text content',
    example: 'Analytical approach',
    type: String,
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Archetype identifier for the option',
    example: 1,
    type: Number,
  })
  @IsNumber()
  archetypeId: number;

  @ApiPropertyOptional({
    description: 'Additional context for the option',
    example: 'This option indicates a systematic problem-solving approach',
    type: String,
  })
  @IsOptional()
  @IsString()
  context?: string;
} 