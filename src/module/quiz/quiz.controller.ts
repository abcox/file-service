import {
  Controller,
  Post,
  Put,
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

  @Post('import')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Import quiz from validated JSON payload' })
  @ApiQuery({
    name: 'upsert',
    required: false,
    description:
      'When true, update existing quiz by title or create if missing',
  })
  @ApiBody({ description: 'Quiz JSON payload to import' })
  @ApiResponse({ status: 201, description: 'Quiz imported successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid payload or import failure',
  })
  async importQuizFromJson(
    @Body() payload: unknown,
    @Query('upsert') upsert?: string,
  ): Promise<QuizResponseDto> {
    try {
      const shouldUpsert =
        upsert === undefined ? true : upsert.toLowerCase() === 'true';

      const importedQuiz = await this.quizService.importFromJson(
        payload,
        shouldUpsert,
      );

      const response = new QuizResponseDto();
      response.success = true;
      response.message = shouldUpsert
        ? 'Quiz imported successfully (upsert)'
        : 'Quiz imported successfully (create)';
      response.data = importedQuiz;
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

  @Get(':id')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get quiz by ID' })
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
  async getQuizById(@Param('id') id: string): Promise<QuizResponseDto> {
    const quiz = await this.quizService.getQuizById(id);
    const response = new QuizResponseDto();
    response.success = !!quiz;
    response.message = quiz ? `Quiz found` : `Quiz not found with id: ${id}`;
    response.data = quiz || undefined;
    return response;
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

  @Put(':id')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Update an existing quiz by ID' })
  @ApiBody({ description: 'Quiz data to update' })
  @ApiResponse({ status: 200, description: 'Quiz updated successfully' })
  @ApiResponse({ status: 404, description: 'Quiz not found' })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  async updateQuizById(
    @Param('id') id: string,
    @Body() quizData: CreateQuizDto,
  ): Promise<QuizResponseDto> {
    try {
      const updatedQuiz = await this.quizService.updateQuizById(id, quizData);
      const response = new QuizResponseDto();
      response.success = true;
      response.message = 'Quiz updated successfully';
      response.data = updatedQuiz;
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
