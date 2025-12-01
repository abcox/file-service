import { BaseEntity } from '../base.entity';
import { QuizQuestion } from './quiz-question';

export interface Quiz extends BaseEntity {
  title: string;
  questions: QuizQuestion[];
  createdAt?: Date;
  updatedAt?: Date;
}
