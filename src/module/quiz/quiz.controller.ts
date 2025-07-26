import { Controller, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Auth } from '../../auth/auth.guard';
import { QuizService } from './quiz.service';

@ApiTags('Quiz')
@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @Post('generate-seed')
  //@Auth({ roles: ['admin'] })
  @Auth({ public: true })
  @ApiOperation({ summary: 'Generate and seed quiz data into Cosmos DB' })
  @ApiResponse({ status: 200, description: 'Quiz seed generation triggered' })
  async generateSeed(): Promise<{ message: string }> {
    return await this.quizService.generateSeed();
  }
}
