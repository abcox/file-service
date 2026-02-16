import { ApiPropertyOptional, ApiExtraModels } from '@nestjs/swagger';
import { BaseSearchResponseDto } from '../../../shared/model/controller';
import { QuizSummaryDto } from './quiz-summary.dto';

/**
 * DTO for quiz search/list response data
 */
@ApiExtraModels(QuizSummaryDto)
export class QuizSearchResponseDto extends BaseSearchResponseDto<QuizSummaryDto> {
  @ApiPropertyOptional({
    description: 'Array of quiz summary data',
    type: 'array',
    items: {
      $ref: '#/components/schemas/QuizSummaryDto',
    },
  })
  declare data?: QuizSummaryDto[];
}
