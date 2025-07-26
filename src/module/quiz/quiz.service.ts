import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
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

  async createQuiz(
    quizData: Omit<Quiz, '_id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Quiz> {
    try {
      this.logger.log(`Creating new quiz with title: ${quizData.title}`);

      // Check if quiz with same title already exists
      const existingQuiz = await this.quizModel
        .findOne({ title: quizData.title })
        .exec();
      if (existingQuiz) {
        this.logger.warn(`Quiz with title '${quizData.title}' already exists`);
        throw new Error(`Quiz with title '${quizData.title}' already exists`);
      }

      // Create the new quiz
      const newQuiz = await this.quizModel.create(quizData);
      this.logger.log(`Quiz created successfully with ID: ${newQuiz._id}`);

      return newQuiz;
    } catch (error) {
      // Handle Mongoose validation errors specifically
      if (error instanceof MongooseError.ValidationError) {
        const validationErrors = Object.values(error.errors).map(
          (err) => err.message,
        );
        const errorMessage = `Validation failed: ${validationErrors.join(', ')}`;
        this.logger.warn(`Quiz validation failed: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      // Handle other errors
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to create quiz with title '${quizData.title}'`,
        errorMessage,
      );
      throw new Error(`Failed to create quiz: ${errorMessage}`);
    }
  }

  async deleteQuiz(id: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Attempting to delete quiz with ID: ${id}`);

      // Check if quiz exists
      const existingQuiz = await this.quizModel.findById(id).exec();
      if (!existingQuiz) {
        this.logger.warn(`Quiz with ID '${id}' not found`);
        throw new Error(`Quiz with ID '${id}' not found`);
      }

      // Delete the quiz
      await this.quizModel.findByIdAndDelete(id).exec();
      this.logger.log(`Quiz with ID '${id}' deleted successfully`);

      return { message: 'Quiz deleted successfully' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete quiz with ID '${id}'`, errorMessage);
      throw new Error(`Failed to delete quiz: ${errorMessage}`);
    }
  }

  async getQuizList(): Promise<
    Array<{
      _id: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      questionCount: number;
    }>
  > {
    try {
      this.logger.log('Fetching quiz list');

      const quizzes = await this.quizModel
        .find({}, { title: 1, createdAt: 1, updatedAt: 1, questions: 1 })
        .sort({ createdAt: -1 }) // Most recent first
        .exec();

      const quizList = quizzes.map((quiz) => ({
        _id: quiz._id.toString(),
        title: quiz.title,
        createdAt: quiz.createdAt || new Date(),
        updatedAt: quiz.updatedAt || new Date(),
        questionCount: quiz.questions ? quiz.questions.length : 0,
      }));

      this.logger.log(`Found ${quizList.length} quizzes`);
      return quizList;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to fetch quiz list', errorMessage);
      throw new Error(`Failed to fetch quiz list: ${errorMessage}`);
    }
  }
}
