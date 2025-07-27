import { Schema } from 'mongoose';
import {
  QuizAnswer,
  QuizScore,
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
