import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import {
  GptService,
  GptAnalysisRequest,
} from '../../service/chatGpt/gpt.service';
import { Auth } from '../../module/auth/auth.guard';

@ApiTags('GPT')
@Controller('gpt')
export class GptController {
  constructor(private readonly gptService: GptService) {}

  @Post('analyze')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Analyze content with GPT' })
  @ApiBody({ type: GptAnalysisRequest })
  @ApiResponse({ status: 200, description: 'Analysis completed' })
  async analyzeContent(@Body() request: GptAnalysisRequest) {
    return this.gptService.analyzeContent(request);
  }

  @Get('health')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Check GPT service health' })
  @ApiResponse({ status: 200, description: 'Health check result' })
  async healthCheck() {
    const isHealthy = await this.gptService.healthCheck();
    return {
      service: 'gpt',
      healthy: isHealthy,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('config')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get GPT service configuration' })
  @ApiResponse({ status: 200, description: 'Configuration details' })
  getConfig() {
    return this.gptService.getConfig();
  }
}
