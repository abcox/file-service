import {
  Controller,
  Post,
  Get,
  Delete,
  Query,
  Body,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { Auth } from '../../auth/auth.guard';
import { QuizService } from './quiz.service';

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate-seed')
  @Auth({ roles: ['admin'] })
  //@Auth({ public: true })
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

  @Post()
  //@Auth({ roles: ['admin'] })
  @Auth({ public: true })
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiBody({ description: 'Quiz data to create' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Bad request - quiz with same title already exists',
  })
  async createQuiz(@Body() quizData: any) {
    const newQuiz = await this.quizService.createQuiz(quizData);
    return {
      message: 'Quiz created successfully',
      quiz: newQuiz,
    };
  }

  @Delete(':id')
  //@Auth({ roles: ['admin'] })
  @Auth({ public: true })
  @ApiOperation({ summary: 'Delete a quiz by ID' })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async deleteQuiz(@Param('id') id: string) {
    return await this.quizService.deleteQuiz(id);
  }
}
