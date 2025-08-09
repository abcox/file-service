import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  UserQuizAction,
  UserQuizResult,
} from '../db/doc/entity/user/user-quiz-result';
import {
  QuizAnalyticsDto,
  UserBehaviorAnalyticsDto,
  QuizAnalyticsAggregation,
  UserBehaviorAnalyticsAggregation,
} from './dto/analytics.dto';

@Injectable()
export class UserQuizResultService {
  private readonly logger = new Logger(UserQuizResultService.name);

  constructor(
    @InjectModel('UserQuizResult')
    private readonly userQuizResultModel: Model<UserQuizResult>,
    @InjectModel('UserQuizAction')
    private readonly userQuizActionModel: Model<UserQuizAction>,
  ) {}

  async submitQuizAction(
    quizActionData: Partial<UserQuizAction>,
  ): Promise<UserQuizAction> {
    try {
      this.logger.log(
        `Submitting quiz action for user: ${quizActionData.userId}`,
        quizActionData,
      );

      const newQuizAction =
        await this.userQuizActionModel.create(quizActionData);

      this.logger.log(
        `Quiz action submitted successfully with ID: ${newQuizAction._id}`,
      );

      return newQuizAction;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to submit quiz action for user ${quizActionData.userId}`,
        errorMessage,
      );
      throw new Error(`Failed to submit quiz action: ${errorMessage}`);
    }
  }

  async submitQuizResult(
    quizResultData: Partial<UserQuizResult>,
  ): Promise<UserQuizResult> {
    try {
      this.logger.log(
        `Submitting quiz result for user: ${quizResultData.userId}`,
      );

      const newQuizResult =
        await this.userQuizResultModel.create(quizResultData);
      this.logger.log(
        `Quiz result submitted successfully with ID: ${newQuizResult._id}`,
      );

      return newQuizResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to submit quiz result for user ${quizResultData.userId}`,
        errorMessage,
      );
      throw new Error(`Failed to submit quiz result: ${errorMessage}`);
    }
  }

  async getUserQuizResults(userId: string): Promise<UserQuizResult[]> {
    try {
      this.logger.log(`Fetching quiz results for user: ${userId}`);

      const results = await this.userQuizResultModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .exec();

      this.logger.log(
        `Found ${results.length} quiz results for user ${userId}`,
      );
      return results;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch quiz results for user ${userId}`,
        errorMessage,
      );
      throw new Error(`Failed to fetch quiz results: ${errorMessage}`);
    }
  }

  async getQuizResultById(resultId: string): Promise<UserQuizResult | null> {
    try {
      this.logger.log(`Fetching quiz result by ID: ${resultId}`);

      const result = await this.userQuizResultModel.findById(resultId).exec();

      if (!result) {
        this.logger.warn(`Quiz result with ID ${resultId} not found`);
        return null;
      }

      this.logger.log(`Quiz result found: ${result._id}`);
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch quiz result ${resultId}`,
        errorMessage,
      );
      throw new Error(`Failed to fetch quiz result: ${errorMessage}`);
    }
  }

  async updateQuizResult(
    resultId: string,
    updateData: Partial<UserQuizResult>,
  ): Promise<UserQuizResult | null> {
    try {
      this.logger.log(`Updating quiz result: ${resultId}`);

      const updatedResult = await this.userQuizResultModel
        .findByIdAndUpdate(resultId, updateData, { new: true })
        .exec();

      if (!updatedResult) {
        this.logger.warn(
          `Quiz result with ID ${resultId} not found for update`,
        );
        return null;
      }

      this.logger.log(`Quiz result updated successfully: ${updatedResult._id}`);
      return updatedResult;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update quiz result ${resultId}`,
        errorMessage,
      );
      throw new Error(`Failed to update quiz result: ${errorMessage}`);
    }
  }

  async deleteQuizResult(resultId: string): Promise<{ message: string }> {
    try {
      this.logger.log(`Deleting quiz result: ${resultId}`);

      const result = await this.userQuizResultModel
        .findByIdAndDelete(resultId)
        .exec();

      if (!result) {
        this.logger.warn(
          `Quiz result with ID ${resultId} not found for deletion`,
        );
        throw new Error(`Quiz result with ID ${resultId} not found`);
      }

      this.logger.log(`Quiz result deleted successfully: ${resultId}`);
      return { message: 'Quiz result deleted successfully' };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to delete quiz result ${resultId}`,
        errorMessage,
      );
      throw new Error(`Failed to delete quiz result: ${errorMessage}`);
    }
  }

  async getQuizAnalytics(quizId: string): Promise<QuizAnalyticsDto> {
    try {
      this.logger.log(`Generating analytics for quiz: ${quizId}`);

      const analytics =
        await this.userQuizResultModel.aggregate<QuizAnalyticsAggregation>([
          { $match: { quizId } },
          {
            $group: {
              _id: null,
              totalAttempts: { $sum: 1 },
              completedAttempts: {
                $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
              },
              abandonedAttempts: {
                $sum: { $cond: [{ $eq: ['$status', 'abandoned'] }, 1, 0] },
              },
              averageCompletionTime: { $avg: '$metadata.durationSeconds' },
              averageScore: { $avg: '$score.completionPercentage' },
            },
          },
        ]);

      const defaultResult = {
        totalAttempts: 0,
        completedAttempts: 0,
        abandonedAttempts: 0,
        averageCompletionTime: 0,
        averageScore: 0,
      } as QuizAnalyticsAggregation;
      const result = analytics[0] || defaultResult;

      // Transform to strongly typed DTO
      const quizAnalytics: QuizAnalyticsDto = {
        totalAttempts: result.totalAttempts,
        completedAttempts: result.completedAttempts,
        abandonedAttempts: result.abandonedAttempts,
        averageCompletionTime: result.averageCompletionTime,
        averageScore: result.averageScore,
        completionRate: result.totalAttempts
          ? (result.completedAttempts / result.totalAttempts) * 100
          : 0,
      };

      this.logger.log(`Analytics generated for quiz ${quizId}`);
      return quizAnalytics;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate analytics for quiz ${quizId}`,
        errorMessage,
      );
      throw new Error(`Failed to generate quiz analytics: ${errorMessage}`);
    }
  }

  async getUserBehaviorAnalytics(
    userId: string,
  ): Promise<UserBehaviorAnalyticsDto> {
    try {
      this.logger.log(`Generating behavior analytics for user: ${userId}`);

      const behavior =
        await this.userQuizResultModel.aggregate<UserBehaviorAnalyticsAggregation>(
          [
            { $match: { userId } },
            {
              $group: {
                _id: null,
                totalQuizzes: { $sum: 1 },
                averageTimePerQuiz: { $avg: '$metadata.durationSeconds' },
                averageScore: { $avg: '$score.completionPercentage' },
                completionRate: {
                  $avg: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
              },
            },
          ],
        );

      const defaultResult = {
        totalQuizzes: 0,
        averageTimePerQuiz: 0,
        averageScore: 0,
        completionRate: 0,
      } as UserBehaviorAnalyticsAggregation;
      const result = behavior[0] || defaultResult;

      // Transform to strongly typed DTO
      const userBehavior: UserBehaviorAnalyticsDto = {
        totalQuizzes: result.totalQuizzes,
        averageTimePerQuiz: result.averageTimePerQuiz,
        averageScore: result.averageScore,
        completionRate: result.completionRate ? result.completionRate * 100 : 0,
      };

      this.logger.log(`Behavior analytics generated for user ${userId}`);
      return userBehavior;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to generate behavior analytics for user ${userId}`,
        errorMessage,
      );
      throw new Error(
        `Failed to generate user behavior analytics: ${errorMessage}`,
      );
    }
  }
}
