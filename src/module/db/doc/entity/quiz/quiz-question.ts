import { QuizQuestionOption } from './quiz-question-option';

export interface QuizQuestion {
  id: number;
  content: string;
  dimension: string;
  options: QuizQuestionOption[];
}
