import { Controller, Post, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.guard';
import { QuizService } from './quiz.service';

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate-seed')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Generate and seed quiz data into Cosmos DB' })
  @ApiResponse({ status: 200, description: 'Quiz seed generation triggered' })
  async generateSeed(): Promise<{ message: string }> {
    return await this.quizService.generateSeed();
  }

  @Get('by-title')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get quiz by title' })
  @ApiQuery({ name: 'title', description: 'Quiz title to search for' })
  @ApiResponse({ status: 200, description: 'Quiz found' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async getQuizByTitle(@Query('title') title: string) {
    const quiz = await this.quizService.getQuizByTitle(title);
    if (!quiz) {
      return { message: 'Quiz not found', quiz: null };
    }
    return { message: 'Quiz found', quiz };
  }
}
