/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { AppConfigService } from '../config/config.service';

import OpenAI from 'openai';

export interface GptAnalysisRequest {
  content: string;
  context?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface GptAnalysisResponse {
  success: boolean;
  content?: string;
  error?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface GptConfig {
  apiKey: string;
  defaultModel: string;
  defaultMaxTokens: number;
  defaultTemperature: number;
}

@Injectable()
export class GptService {
  private openai: any;
  private config: GptConfig;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: AppConfigService,
  ) {
    this.initializeGptService();
  }

  private initializeGptService(): void {
    try {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        this.logger.error('OpenAI API key not found in environment variables');
        throw new Error('OpenAI API key is required');
      }

      this.config = {
        apiKey,
        defaultModel: process.env.GPT_DEFAULT_MODEL || 'gpt-4',
        defaultMaxTokens: parseInt(process.env.GPT_MAX_TOKENS || '4000'),
        defaultTemperature: parseFloat(process.env.GPT_TEMPERATURE || '0.7'),
      };

      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
      });

      this.logger.info('GPT service initialized successfully', {
        model: this.config.defaultModel,
        maxTokens: this.config.defaultMaxTokens,
        temperature: this.config.defaultTemperature,
      });
    } catch (error) {
      this.logger.error('Failed to initialize GPT service', error as Error);
      throw error;
    }
  }

  async analyzeContent(
    request: GptAnalysisRequest,
  ): Promise<GptAnalysisResponse> {
    try {
      this.logger.info('Starting GPT analysis', {
        contentLength: request.content.length,
        model: request.model || this.config.defaultModel,
        context: request.context ? 'provided' : 'none',
      });

      const messages = this.buildMessages(request);

      const completion = await this.openai.chat.completions.create({
        model: request.model || this.config.defaultModel,
        messages,
        max_tokens: request.maxTokens || this.config.defaultMaxTokens,
        temperature: request.temperature || this.config.defaultTemperature,
      });

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('No response received from GPT');
      }

      this.logger.info('GPT analysis completed successfully', {
        responseLength: response.length,
        usage: completion.usage,
      });

      return {
        success: true,
        content: response,
        usage: completion.usage,
      };
    } catch (error) {
      this.logger.error('GPT analysis failed', error as Error, {
        contentLength: request.content.length,
        model: request.model || this.config.defaultModel,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async analyzeDocument(
    documentText: string,
    analysisPrompt: string,
    options?: Partial<GptAnalysisRequest>,
  ): Promise<GptAnalysisResponse> {
    const request: GptAnalysisRequest = {
      content: documentText,
      context: analysisPrompt,
      ...options,
    };

    return this.analyzeContent(request);
  }

  private buildMessages(request: GptAnalysisRequest): any[] {
    const messages: any[] = [];

    // Add system message if context is provided
    if (request.context) {
      messages.push({
        role: 'system',
        content: request.context,
      });
    }

    // Add user message with content
    messages.push({
      role: 'user',
      content: request.content,
    });

    return messages;
  }

  // Health check method
  async healthCheck(): Promise<boolean> {
    try {
      // Simple test call to verify API key and connectivity
      const testResponse = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 10,
      });

      return testResponse.choices.length > 0;
    } catch (error) {
      this.logger.error('GPT health check failed', error as Error);
      return false;
    }
  }

  // Get service configuration (for debugging)
  getConfig(): GptConfig {
    return {
      ...this.config,
      apiKey: '***hidden***', // Don't expose API key
    };
  }
}
