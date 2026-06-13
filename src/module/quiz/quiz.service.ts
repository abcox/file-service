import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Error as MongooseError } from 'mongoose';
import { z } from 'zod';
import { Quiz } from '../db/doc/entity/quiz/quiz';
import { quizSeed } from '../db/doc/seed/quiz-seed';

const quizImportOptionSchema = z.object({
  id: z.number(),
  content: z.string().min(1),
  archetypeId: z.number(),
  context: z.string().min(1),
});

const quizImportQuestionSchema = z.object({
  id: z.number(),
  content: z.string().min(1),
  dimension: z.string().min(1),
  options: z.array(quizImportOptionSchema).min(1),
});

const quizImportSchema = z.object({
  title: z.string().min(1),
  questions: z.array(quizImportQuestionSchema).min(1),
});

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

  async importFromJson(payload: unknown, upsert = true): Promise<Quiz> {
    // 1) Validate the incoming payload shape before touching persistence.
    const parsed = quizImportSchema.safeParse(payload);
    if (!parsed.success) {
      const issueSummary = parsed.error.issues
        .map((issue) => {
          const issuePath = issue.path.join('.') || 'root';
          return `${issuePath}: ${issue.message}`;
        })
        .join('; ');
      throw new Error(`Invalid quiz import payload: ${issueSummary}`);
    }

    // 2) Normalize to the current Quiz domain shape used by the service.
    const quizData = parsed.data as Omit<
      Quiz,
      '_id' | 'createdAt' | 'updatedAt'
    >;

    // 3) Enforce domain-level integrity rules that are easier to read here
    // than relying on DB validation errors alone.
    this.assertUniqueQuestionAndOptionIds(quizData);

    // 4) Optional create-only mode: fail if title already exists.
    if (!upsert) {
      return this.createQuiz(quizData);
    }

    try {
      // 5) Upsert mode: update by title if found, otherwise insert.
      this.logger.log(
        `Importing quiz via upsert with title: ${quizData.title}`,
      );

      const upsertedQuiz = await this.quizModel
        .findOneAndUpdate(
          { title: quizData.title },
          { $set: quizData },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();

      if (!upsertedQuiz) {
        // Defensive guard: findOneAndUpdate should return a document when
        // new=true + upsert=true, but keep this for explicit failure handling.
        throw new Error('Quiz upsert returned no document');
      }

      return upsertedQuiz;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to import quiz with title '${quizData.title}'`,
        errorMessage,
      );
      throw new Error(`Failed to import quiz: ${errorMessage}`);
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

  private assertUniqueQuestionAndOptionIds(
    quizData: Omit<Quiz, '_id' | 'createdAt' | 'updatedAt'>,
  ): void {
    const questionIds = new Set<number>();

    for (const question of quizData.questions) {
      if (questionIds.has(question.id)) {
        throw new Error(`Duplicate question id found: ${question.id}`);
      }
      questionIds.add(question.id);

      const optionIds = new Set<number>();
      for (const option of question.options) {
        if (optionIds.has(option.id)) {
          throw new Error(
            `Duplicate option id ${option.id} found in question id ${question.id}`,
          );
        }
        optionIds.add(option.id);
      }
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
