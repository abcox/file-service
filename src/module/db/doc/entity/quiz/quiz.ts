import { BaseDocument } from '../base-document';
import { QuizQuestion } from './quiz-question';

export interface Quiz extends BaseDocument {
  title: string;
  questions: QuizQuestion[];
  createdAt?: Date;
  updatedAt?: Date;
}
