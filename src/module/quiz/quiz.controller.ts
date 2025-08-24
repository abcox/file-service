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
import { Auth } from '../auth/auth.guard';
import { QuizService } from './quiz.service';
import { QuizResponseDto } from './dto/quiz-response.dto';
import { QuizSearchResponseDto } from './dto/quiz-search-response.dto';
import { CreateQuizDto } from './dto/create-quiz.dto';

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
  @Auth({ roles: ['admin', 'guest'] })
  @ApiOperation({ summary: 'Get quiz by title' })
  @ApiQuery({ name: 'title', description: 'Quiz title to search for' })
  @ApiResponse({
    type: QuizResponseDto,
    status: 200,
    description: 'Quiz found',
  })
  @ApiResponse({
    type: QuizResponseDto,
    status: 404,
    description: 'Quiz not found',
  })
  async getQuizByTitle(
    @Query('title') title: string,
  ): Promise<QuizResponseDto> {
    const quiz = await this.quizService.getQuizByTitle(title);
    const response = new QuizResponseDto();
    response.success = !!quiz;
    response.message = `Quiz ${quiz ? 'found' : 'not found'} with title: ${title}`;
    response.data = quiz || undefined;
    return response;
  }

  @Get('list')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Get list of all quizzes' })
  @ApiResponse({
    status: 200,
    description: 'Quiz list retrieved successfully',
    type: QuizSearchResponseDto,
  })
  async getQuizList(): Promise<QuizSearchResponseDto> {
    try {
      const quizList = await this.quizService.getQuizList();
      const response = new QuizSearchResponseDto();
      response.success = true;
      response.message = `Found ${quizList.length} quizzes`;
      response.data = quizList;
      response.totalCount = quizList.length;
      response.pageSize = quizList.length;
      response.currentPage = 1;
      response.totalPages = 1;
      response.hasNext = false;
      response.hasPrevious = false;
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const response = new QuizSearchResponseDto();
      response.success = false;
      response.message = errorMessage;
      response.errors = [errorMessage];
      return response;
    }
  }

  @Post('create')
  @Auth({ /* public: true ,*/ roles: ['admin'] })
  @ApiOperation({ summary: 'Create a new quiz' })
  @ApiBody({ description: 'Quiz data to create' })
  @ApiResponse({ status: 201, description: 'Quiz created successfully' })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - validation failed or quiz with same title already exists',
  })
  async createQuiz(@Body() quizData: CreateQuizDto): Promise<QuizResponseDto> {
    try {
      const newQuiz = await this.quizService.createQuiz(quizData);
      const response = new QuizResponseDto();
      response.success = true;
      response.message = 'Quiz created successfully';
      response.data = newQuiz;
      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const response = new QuizResponseDto();
      response.success = false;
      response.message = errorMessage;
      response.errors = [errorMessage];
      return response;
    }
  }

  @Delete(':id')
  @Auth({ /* public: true ,*/ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete a quiz by ID' })
  @ApiResponse({ status: 200, description: 'Quiz deleted successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  async deleteQuiz(@Param('id') id: string) {
    return await this.quizService.deleteQuiz(id);
  }
}
