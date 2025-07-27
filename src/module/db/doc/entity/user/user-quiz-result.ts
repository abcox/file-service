import { BaseDocument } from '../base-document';

export interface QuizAnswer {
  questionId: number;
  questionContent: string;
  selectedOptionId: number;
  selectedOptionContent: string;
  archetypeId: number;
  dimension: string;
}

export interface QuizScore {
  totalQuestions: number;
  answeredQuestions: number;
  completionPercentage: number;
}

export interface ArchetypeResult {
  archetypeId: number;
  archetypeName: string;
  score: number;
  percentage: number;
}

export interface DimensionResult {
  dimension: string;
  score: number;
  percentage: number;
}

export interface QuizMetadata {
  timeStarted: Date;
  timeCompleted: Date;
  durationSeconds: number;
  userAgent?: string;
  ipAddress?: string;
  referrer?: string;
}

export type QuizStatus = 'in_progress' | 'completed' | 'abandoned';

export interface UserQuizResult extends BaseDocument {
  userId: string;
  quizId: string;
  quizTitle: string;
  userEmail: string;
  userName: string;
  answers: QuizAnswer[];
  score: QuizScore;
  archetypeResults: ArchetypeResult[];
  dimensionResults: DimensionResult[];
  metadata: QuizMetadata;
  status: QuizStatus;
  reportGenerated: boolean;
  reportUrl?: string;
  followUpEmailSent: boolean;
  followUpEmailDate?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
