import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/* eslint-disable @typescript-eslint/no-unsafe-call */
export class QuizAnswerDto {
  @ApiProperty({ description: 'Question ID', example: 1 })
  @IsNumber()
  questionId: number;

  @ApiProperty({
    description: 'Question content',
    example: 'How do you approach leadership?',
  })
  @IsString()
  @IsNotEmpty()
  questionContent: string;

  @ApiProperty({ description: 'Selected option ID', example: 2 })
  @IsNumber()
  selectedOptionId: number;

  @ApiProperty({
    description: 'Selected option content',
    example: 'I prefer collaborative leadership',
  })
  @IsString()
  @IsNotEmpty()
  selectedOptionContent: string;

  @ApiProperty({ description: 'Archetype ID', example: 1 })
  @IsNumber()
  archetypeId: number;

  @ApiProperty({ description: 'Question dimension', example: 'Leadership' })
  @IsString()
  @IsNotEmpty()
  dimension: string;
}

export class QuizScoreDto {
  @ApiProperty({ description: 'Total number of questions', example: 10 })
  @IsNumber()
  totalQuestions: number;

  @ApiProperty({ description: 'Number of answered questions', example: 8 })
  @IsNumber()
  answeredQuestions: number;

  @ApiProperty({ description: 'Completion percentage', example: 80 })
  @IsNumber()
  completionPercentage: number;
}

export class ArchetypeResultDto {
  @ApiProperty({ description: 'Archetype ID', example: 1 })
  @IsNumber()
  archetypeId: number;

  @ApiProperty({ description: 'Archetype name', example: 'Leader' })
  @IsString()
  @IsNotEmpty()
  archetypeName: string;

  @ApiProperty({ description: 'Archetype score', example: 85 })
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Archetype percentage', example: 75 })
  @IsNumber()
  percentage: number;
}

export class DimensionResultDto {
  @ApiProperty({ description: 'Dimension name', example: 'Leadership' })
  @IsString()
  @IsNotEmpty()
  dimension: string;

  @ApiProperty({ description: 'Dimension score', example: 80 })
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Dimension percentage', example: 70 })
  @IsNumber()
  percentage: number;
}

export class QuizMetadataDto {
  @ApiProperty({ description: 'Quiz start time' })
  @IsDateString()
  timeStarted: string;

  @ApiProperty({ description: 'Quiz completion time' })
  @IsDateString()
  timeCompleted: string;

  @ApiProperty({ description: 'Duration in seconds', example: 300 })
  @IsNumber()
  durationSeconds: number;

  @ApiProperty({ description: 'User agent string', required: false })
  @IsOptional()
  @IsString()
  userAgent?: string;

  @ApiProperty({ description: 'IP address', required: false })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiProperty({ description: 'Referrer URL', required: false })
  @IsOptional()
  @IsString()
  referrer?: string;
}

export enum QuizStatus {
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

export class SubmitQuizResultDto {
  @ApiProperty({ description: 'User ID', example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Quiz ID', example: '507f1f77bcf86cd799439012' })
  @IsString()
  @IsNotEmpty()
  quizId: string;

  @ApiProperty({
    description: 'Quiz title',
    example: 'Leadership Style Assessment',
  })
  @IsString()
  @IsNotEmpty()
  quizTitle: string;

  @ApiProperty({ description: 'User email', example: 'user@example.com' })
  @IsString()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({ description: 'User name', example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiProperty({ description: 'User answers', type: [QuizAnswerDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers: QuizAnswerDto[];

  @ApiProperty({ description: 'Quiz score', type: QuizScoreDto })
  @ValidateNested()
  @Type(() => QuizScoreDto)
  score: QuizScoreDto;

  @ApiProperty({ description: 'Archetype results', type: [ArchetypeResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArchetypeResultDto)
  archetypeResults: ArchetypeResultDto[];

  @ApiProperty({ description: 'Dimension results', type: [DimensionResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionResultDto)
  dimensionResults: DimensionResultDto[];

  @ApiProperty({ description: 'Quiz metadata', type: QuizMetadataDto })
  @ValidateNested()
  @Type(() => QuizMetadataDto)
  metadata: QuizMetadataDto;

  @ApiProperty({
    description: 'Quiz status',
    enum: QuizStatus,
    example: QuizStatus.COMPLETED,
  })
  @IsEnum(QuizStatus)
  status: QuizStatus;

  @ApiProperty({ description: 'Whether report was generated', example: false })
  @IsBoolean()
  reportGenerated: boolean;

  @ApiProperty({ description: 'Report URL', required: false })
  @IsOptional()
  @IsString()
  reportUrl?: string;

  @ApiProperty({
    description: 'Whether follow-up email was sent',
    example: false,
  })
  @IsBoolean()
  followUpEmailSent: boolean;

  @ApiProperty({ description: 'Follow-up email date', required: false })
  @IsOptional()
  @IsDateString()
  followUpEmailDate?: string;
}
