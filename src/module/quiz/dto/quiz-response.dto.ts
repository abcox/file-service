import { ApiPropertyOptional } from '@nestjs/swagger';
import { BaseResponseDto } from '../../../shared/model/controller';
import { QuizDto } from './quiz.dto';

/**
 * DTO for quiz response data
 */
export class QuizResponseDto extends BaseResponseDto<QuizDto> {
  @ApiPropertyOptional({
    description: 'Quiz data object containing questions and options',
    type: QuizDto,
  })
  declare data?: QuizDto;
}
