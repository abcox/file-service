import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Quiz } from '../db/doc/entity/quiz/quiz';
import { quizSeed } from '../db/doc/seed/quiz-seed';

@Injectable()
export class QuizService {
  private readonly logger = new Logger(QuizService.name);

  constructor(@InjectModel('Quiz') private readonly quizModel: Model<Quiz>) {}

  async generateSeed(): Promise<{ message: string }> {
    try {
      this.logger.log('Starting quiz seed generation...');

      // Remove existing quizzes (optional, for idempotency)
      await this.quizModel.deleteMany({});
      this.logger.log('Existing quizzes cleared');

      // Insert the seed quiz
      await this.quizModel.create(quizSeed);
      this.logger.log('Quiz seed data inserted successfully');

      return { message: 'Quiz seed generation completed.' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack =
        error instanceof Error ? error.stack : 'No stack trace';
      this.logger.error('Failed to generate quiz seed', errorStack);
      throw new Error(`Quiz seed generation failed: ${errorMessage}`);
    }
  }

  async getQuizByTitle(title: string): Promise<Quiz | null> {
    try {
      this.logger.log(`Fetching quiz with title: ${title}`);
      const quiz = await this.quizModel.findOne({ title }).exec();

      if (!quiz) {
        this.logger.warn(`Quiz with title '${title}' not found`);
        return null;
      }

      this.logger.log(`Quiz found: ${quiz.title}`);
      return quiz;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch quiz by title '${title}'`,
        errorMessage,
      );
      throw new Error(`Failed to fetch quiz: ${errorMessage}`);
    }
  }
}
