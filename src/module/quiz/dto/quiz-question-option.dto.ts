import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

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

  @ApiProperty({
    description: 'Additional context for the option',
    example: 'This option indicates a systematic problem-solving approach',
    type: String,
  })
  @IsString()
  context: string;
}
