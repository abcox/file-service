import { Schema } from 'mongoose';
import {
  QuizAnswer,
  QuizScore,
  UserQuizAction,
  UserQuizActionMetadata,
  UserQuizResult,
} from '../entity/user/user-quiz-result';

const QuizAnswerSchema = new Schema<QuizAnswer>({
  questionId: { type: Number, required: true },
  questionContent: { type: String, required: true },
  selectedOptionId: { type: Number, required: true },
  selectedOptionContent: { type: String, required: true },
});

const QuizScoreSchema = new Schema<QuizScore>({
  totalQuestions: { type: Number, required: true },
  answeredQuestions: { type: Number, required: true },
  completionPercentage: { type: Number, required: true },
});

export const UserQuizResultSchema = new Schema<UserQuizResult>(
  {
    userId: { type: String, required: true },
    quizId: { type: String, required: true },
    quizTitle: { type: String, required: true },
    userEmail: { type: String, required: true },
    userName: { type: String, required: true },
    answers: { type: [QuizAnswerSchema], required: true },
    score: { type: QuizScoreSchema, required: true },
  },
  { timestamps: true },
);

const UserQuizActionMetadataSchema = new Schema<UserQuizActionMetadata>({
  timeStarted: { type: Date, required: true },
  timeCompleted: { type: Date, required: true },
  durationSeconds: { type: Number, required: true },
  userAgent: { type: String, required: false },
  ipAddress: { type: String, required: false },
});

export const UserQuizActionSchema = new Schema<UserQuizAction>({
  userId: { type: String, required: true },
  quizId: { type: String, required: true },
  sessionId: { type: String, required: true },
  action: { type: String, required: true },
  questionId: { type: Number, required: true },
  selectedOptionId: { type: Number, required: true },
  metadata: { type: UserQuizActionMetadataSchema, required: true },
});
