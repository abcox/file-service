// quiz.model.ts
// Quiz entity model for Cosmos DB (Mongo API)

import { BaseDocument } from './base-document';

export interface QuizQuestionOption {
  id: number;
  content: string;
  archetypeId: number;
  context: string;
}

export interface QuizQuestion {
  id: number;
  content: string;
  dimension: string;
  options: QuizQuestionOption[];
}

export interface Quiz extends BaseDocument {
  title: string;
  questions: QuizQuestion[];
  createdAt?: Date;
  updatedAt?: Date;
}
