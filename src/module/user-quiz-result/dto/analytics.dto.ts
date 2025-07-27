import { ApiProperty } from '@nestjs/swagger';

// MongoDB aggregation result interfaces
export interface QuizAnalyticsAggregation {
  _id: null;
  totalAttempts: number;
  completedAttempts: number;
  abandonedAttempts: number;
  averageCompletionTime: number;
  averageScore: number;
}

export interface UserBehaviorAnalyticsAggregation {
  _id: null;
  totalQuizzes: number;
  averageTimePerQuiz: number;
  averageScore: number;
  completionRate: number;
}

export class QuizAnalyticsDto {
  @ApiProperty({ description: 'Total number of quiz attempts', example: 150 })
  totalAttempts: number;

  @ApiProperty({ description: 'Number of completed attempts', example: 120 })
  completedAttempts: number;

  @ApiProperty({ description: 'Number of abandoned attempts', example: 30 })
  abandonedAttempts: number;

  @ApiProperty({
    description: 'Average completion time in seconds',
    example: 450,
  })
  averageCompletionTime: number;

  @ApiProperty({ description: 'Average completion percentage', example: 85.5 })
  averageScore: number;

  @ApiProperty({ description: 'Completion rate percentage', example: 80 })
  completionRate: number;
}

export class UserBehaviorAnalyticsDto {
  @ApiProperty({ description: 'Total number of quizzes taken', example: 5 })
  totalQuizzes: number;

  @ApiProperty({
    description: 'Average time per quiz in seconds',
    example: 420,
  })
  averageTimePerQuiz: number;

  @ApiProperty({
    description: 'Average score across all quizzes',
    example: 78.5,
  })
  averageScore: number;

  @ApiProperty({ description: 'Completion rate percentage', example: 90 })
  completionRate: number;

  @ApiProperty({ description: 'Most recent quiz date' })
  lastQuizDate?: Date;

  @ApiProperty({ description: 'Favorite quiz type', example: 'Leadership' })
  favoriteQuizType?: string;
}

export class AnalyticsResponseDto<T> {
  @ApiProperty({ description: 'Success status', example: true })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Analytics retrieved successfully',
  })
  message: string;

  @ApiProperty({ description: 'Analytics data' })
  analytics: T;
}
