import { Schema } from 'mongoose';
import { QuizQuestionSchema } from './quiz-question.schema';

export const QuizSchema = new Schema(
  {
    title: { type: String, required: true },
    questions: { type: [QuizQuestionSchema], required: true },
  },
  { timestamps: true },
);
