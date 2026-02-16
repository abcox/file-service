import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { QuizQuestionDto } from './quiz-question.dto';

/**
 * DTO for creating a new quiz
 */
export class CreateQuizDto {
  @ApiProperty({
    description: 'Quiz title',
    example: 'Product Development Assessment',
    type: String,
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Array of quiz questions',
    type: 'array',
    items: {
      $ref: '#/components/schemas/QuizQuestionDto',
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  questions: QuizQuestionDto[];
}
