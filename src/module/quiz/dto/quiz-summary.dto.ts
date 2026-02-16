import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

/**
 * DTO for quiz summary data (used in list responses)
 */
export class QuizSummaryDto {
  @ApiProperty({
    description: 'Unique identifier for the quiz',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsString()
  _id: string;

  @ApiProperty({
    description: 'Quiz title',
    example: 'Product Development Assessment',
    type: String,
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Date when the quiz was created',
    example: '2024-01-15T10:30:00.000Z',
    type: Date,
  })
  @IsOptional()
  createdAt?: Date;

  @ApiPropertyOptional({
    description: 'Date when the quiz was last updated',
    example: '2024-01-15T10:30:00.000Z',
    type: Date,
  })
  @IsOptional()
  updatedAt?: Date;

  @ApiProperty({
    description: 'Number of questions in the quiz',
    example: 10,
    type: Number,
  })
  @IsNumber()
  questionCount: number;
}
