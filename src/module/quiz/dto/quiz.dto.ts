import {
  ApiProperty,
  ApiPropertyOptional,
  ApiExtraModels,
} from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizQuestionDto } from './quiz-question.dto';

/**
 * DTO for quiz data
 */
@ApiExtraModels(QuizQuestionDto)
export class QuizDto {
  @ApiPropertyOptional({
    description: 'Unique identifier for the quiz',
    example: '507f1f77bcf86cd799439011',
    type: String,
  })
  @IsOptional()
  @IsString()
  _id?: string;

  @ApiProperty({
    description: 'Quiz title',
    example: 'Product Development Assessment',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Questions in the quiz',
    type: 'array',
    items: {
      type: 'object',
      $ref: '#/components/schemas/QuizQuestionDto',
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];

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
}
