import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  //Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  //ApiQuery,
} from '@nestjs/swagger';
import { Auth } from '../auth/auth.guard';
import { AuthService } from '../auth/auth.service';
import { UserQuizResultService } from './user-quiz-result.service';
import { UserQuizResult } from '../db/doc/entity/user/user-quiz-result';
import { JwtPayload } from 'jsonwebtoken';

@ApiTags('User Quiz Results')
@Controller('user-quiz-result')
export class UserQuizResultController {
  constructor(
    private readonly userQuizResultService: UserQuizResultService,
    private readonly authService: AuthService,
  ) {}

  @Post('submit')
  @Auth({ roles: ['admin', 'user', 'guest'] }) // Require authentication
  @ApiOperation({ summary: 'Submit a quiz result' })
  @ApiBody({ description: 'Quiz result data to submit' })
  @ApiResponse({
    status: 201,
    description: 'Quiz result submitted successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async submitQuizResult(
    @Body() quizResultDataIn: Partial<Omit<UserQuizResult, 'userId'>>,
    @Req() request: any,
  ) {
    console.log('🎯 submitQuizResult: Method called');
    console.log('🎯 submitQuizResult: Request body:', quizResultDataIn);

    // Get user from auth service (extracted from JWT token)
    const { sub: userId } = (request as Record<string, any>).user as JwtPayload;
    //console.log('🎯 submitQuizResult: authService.getUser() result:', user);

    if (!userId) {
      console.log(
        '❌ submitQuizResult: authService.getUser() returned null/undefined',
      );
      throw new Error('User not found - authentication failed');
    }

    /* console.log('✅ submitQuizResult: User found:', {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles,
    }); */

    // Add userId from token to the quiz result data
    const quizResultData = {
      ...quizResultDataIn,
      userId: userId,
    };

    const result =
      await this.userQuizResultService.submitQuizResult(quizResultData);
    return {
      success: true,
      message: 'Quiz result submitted successfully',
      result,
    };
  }

  @Get('user/:userId')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get all quiz results for a user' })
  @ApiParam({ name: 'userId', description: 'User ID to fetch results for' })
  @ApiResponse({
    status: 200,
    description: 'Quiz results retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserQuizResults(@Param('userId') userId: string) {
    const results = await this.userQuizResultService.getUserQuizResults(userId);
    return {
      success: true,
      message: `Found ${results.length} quiz results`,
      results,
    };
  }

  @Get(':resultId')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get a specific quiz result by ID' })
  @ApiParam({ name: 'resultId', description: 'Quiz result ID' })
  @ApiResponse({
    status: 200,
    description: 'Quiz result retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Quiz result not found' })
  async getQuizResultById(@Param('resultId') resultId: string) {
    const result = await this.userQuizResultService.getQuizResultById(resultId);
    if (!result) {
      return {
        success: false,
        message: 'Quiz result not found',
        result: null,
      };
    }
    return {
      success: true,
      message: 'Quiz result retrieved successfully',
      result,
    };
  }

  @Put(':resultId')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Update a quiz result' })
  @ApiParam({ name: 'resultId', description: 'Quiz result ID to update' })
  @ApiBody({ description: 'Updated quiz result data' })
  @ApiResponse({ status: 200, description: 'Quiz result updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz result not found' })
  async updateQuizResult(
    @Param('resultId') resultId: string,
    @Body() updateData: Partial<UserQuizResult>,
  ) {
    const result = await this.userQuizResultService.updateQuizResult(
      resultId,
      updateData,
    );
    if (!result) {
      return {
        success: false,
        message: 'Quiz result not found',
        result: null,
      };
    }
    return {
      success: true,
      message: 'Quiz result updated successfully',
      result,
    };
  }

  @Delete(':resultId')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete a quiz result' })
  @ApiParam({ name: 'resultId', description: 'Quiz result ID to delete' })
  @ApiResponse({ status: 200, description: 'Quiz result deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz result not found' })
  async deleteQuizResult(@Param('resultId') resultId: string) {
    return await this.userQuizResultService.deleteQuizResult(resultId);
  }

  @Get('analytics/quiz/:quizId')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get analytics for a specific quiz' })
  @ApiParam({ name: 'quizId', description: 'Quiz ID to get analytics for' })
  @ApiResponse({
    status: 200,
    description: 'Quiz analytics retrieved successfully',
  })
  async getQuizAnalytics(@Param('quizId') quizId: string) {
    const analytics = await this.userQuizResultService.getQuizAnalytics(quizId);
    return {
      success: true,
      message: 'Quiz analytics retrieved successfully',
      analytics,
    };
  }

  @Get('analytics/user/:userId')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get behavior analytics for a user' })
  @ApiParam({
    name: 'userId',
    description: 'User ID to get behavior analytics for',
  })
  @ApiResponse({
    status: 200,
    description: 'User behavior analytics retrieved successfully',
  })
  async getUserBehaviorAnalytics(@Param('userId') userId: string) {
    const behavior =
      await this.userQuizResultService.getUserBehaviorAnalytics(userId);
    return {
      success: true,
      message: 'User behavior analytics retrieved successfully',
      behavior,
    };
  }
}
