import { Schema } from 'mongoose';
import { QuizQuestionOptionSchema } from './quiz-question-option.schema';

export const QuizQuestionSchema = new Schema(
  {
    id: { type: Number, required: true },
    content: { type: String, required: true },
    dimension: { type: String, required: true },
    options: { type: [QuizQuestionOptionSchema], required: true },
  },
  { _id: false },
);
