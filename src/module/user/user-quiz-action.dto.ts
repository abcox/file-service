import { ApiProperty } from '@nestjs/swagger';
import {
  UserQuizAction,
  UserQuizActionMetadata,
} from '../../module/db/doc/entity/user/user-quiz-result';

export class UserQuizActionMetadataDto implements UserQuizActionMetadata {
  @ApiProperty({ required: true })
  timeStarted: Date;

  @ApiProperty({ required: true })
  timeCompleted: Date;

  @ApiProperty({ required: true })
  durationSeconds: number;
}

// Option 1: Create a DTO specifically for the API
export class SubmitQuizActionDto implements Partial<UserQuizAction> {
  @ApiProperty({ required: true })
  userId: string;

  @ApiProperty({ required: true })
  quizId: string;

  @ApiProperty({ required: true })
  sessionId: string;

  @ApiProperty({
    required: true,
    enum: ['start', 'answer', 'skip', 'complete', 'abandon'],
  })
  action: string;

  @ApiProperty({ required: false })
  questionId?: number;

  @ApiProperty({ required: false })
  selectedOptionId?: number;

  // metadata
  @ApiProperty({ required: false })
  metadata?: UserQuizActionMetadataDto;
}
