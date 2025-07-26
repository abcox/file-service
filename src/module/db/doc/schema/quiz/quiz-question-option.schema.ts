import { Schema } from 'mongoose';

export const QuizQuestionOptionSchema = new Schema(
  {
    id: { type: Number, required: true },
    content: { type: String, required: true },
    archetypeId: { type: Number, required: true },
    context: { type: String, required: true },
  },
  { _id: false },
);
