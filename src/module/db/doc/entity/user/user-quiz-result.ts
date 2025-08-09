import { BaseDocument } from '../base-document';

/**
 * UserQuizResult Data Structure Example:
 *
 * {
 *   _id: "507f1f77bcf86cd799439011",
 *   userId: "user123",
 *   quizId: "quiz456",
 *   quizTitle: "Leadership Style Assessment",
 *   userEmail: "john.doe@example.com",
 *   userName: "John Doe",
 *   answers: [
 *     {
 *       questionId: 1,
 *       questionContent: "How do you prefer to lead a team?",
 *       selectedOptionId: 2,
 *       selectedOptionContent: "I encourage collaboration and input from team members",
 *       archetypeId: 1,
 *       dimension: "Leadership"
 *     },
 *     {
 *       questionId: 2,
 *       questionContent: "When making decisions, you typically:",
 *       selectedOptionId: 3,
 *       selectedOptionContent: "Analyze data and consider multiple perspectives",
 *       archetypeId: 2,
 *       dimension: "Decision Making"
 *     }
 *   ],
 *   score: {
 *     totalQuestions: 10,
 *     answeredQuestions: 10,
 *     completionPercentage: 100
 *   },
 *   archetypeResults: [
 *     {
 *       archetypeId: 1,
 *       archetypeName: "Collaborative Leader",
 *       score: 85,
 *       percentage: 75
 *     },
 *     {
 *       archetypeId: 2,
 *       archetypeName: "Analytical Thinker",
 *       score: 90,
 *       percentage: 80
 *     }
 *   ],
 *   dimensionResults: [
 *     {
 *       dimension: "Leadership",
 *       score: 85,
 *       percentage: 75
 *     },
 *     {
 *       dimension: "Decision Making",
 *       score: 90,
 *       percentage: 80
 *     }
 *   ],
 *   metadata: {
 *     timeStarted: "2024-01-15T10:30:00Z",
 *     timeCompleted: "2024-01-15T10:45:00Z",
 *     durationSeconds: 900,
 *     userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
 *     ipAddress: "192.168.1.100",
 *     referrer: "https://example.com/quiz-intro"
 *   },
 *   status: "completed",
 *   reportGenerated: true,
 *   reportUrl: "https://example.com/reports/user123-quiz456.pdf",
 *   followUpEmailSent: true,
 *   followUpEmailDate: "2024-01-15T11:00:00Z",
 *   createdAt: "2024-01-15T10:30:00Z",
 *   updatedAt: "2024-01-15T11:00:00Z"
 * }
 */

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

export interface UserQuizActionMetadata {
  timeStarted: Date;
  timeCompleted: Date;
  durationSeconds: number;
  userAgent?: string;
  ipAddress?: string;
}

export interface UserQuizAction extends BaseDocument {
  userId: string;
  quizId: string;
  sessionId: string;
  action: string; // start, answer, skip, complete, abandon
  questionId: number;
  //questionContent: string;
  selectedOptionId: number;
  //selectedOptionContent: string;
  //archetypeId: number;
  //dimension: string;
  metadata: UserQuizActionMetadata;
  communicationId?: string; // relates to communications root thread
  createdAt?: Date;
  updatedAt?: Date;
}
