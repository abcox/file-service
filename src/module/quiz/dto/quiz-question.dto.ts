import { ApiProperty, ApiExtraModels } from '@nestjs/swagger';
import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizQuestionOptionDto } from './quiz-question-option.dto';

/**
 * DTO for quiz question
 */
@ApiExtraModels(QuizQuestionOptionDto)
export class QuizQuestionDto {
  @ApiProperty({
    description: 'Unique identifier for the question',
    example: 1,
    type: Number,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Question text content',
    example: 'How do you typically approach problem-solving?',
    type: String,
  })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Question dimension/category',
    example: 'Problem Solving',
    type: String,
  })
  @IsString()
  dimension: string;

  @ApiProperty({
    description: 'Available options for this question',
    type: 'array',
    items: {
      $ref: '#/components/schemas/QuizQuestionOptionDto',
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionOptionDto)
  options: QuizQuestionOptionDto[];
}
