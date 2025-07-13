/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { AppConfigService } from '../config/config.service';

import OpenAI from 'openai';
import { FileCreateParams } from 'openai/resources/files';
import {
  ChatCompletionContentPart,
  ChatCompletionCreateParamsNonStreaming,
} from 'openai/resources/chat/completions';
import { RequestOptions } from 'openai/internal/request-options';

export class GptAnalysisRequest {
  content: string;
  context?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}
/* {
"content":"Tell me about Gardenias",
"context":"You are a helpful assistant that analyzes text and provides a summary of the content.",
"model":"gpt-4o-mini",
"maxTokens":100,
"temperature":0.7
} */

export class GptAnalysisResponse {
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

export interface FileUploadResponse {
  success: boolean;
  fileId?: string;
  filename?: string;
  error?: string;
}

@Injectable()
export class GptService {
  private openai: OpenAI;
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

  async uploadFile(
    fileBuffer: Buffer,
    filename: string,
  ): Promise<FileUploadResponse> {
    try {
      this.logger.info('Uploading file to OpenAI', {
        filename,
        fileSize: fileBuffer.length,
      });

      // Create a File object from Buffer for OpenAI SDK
      const fileBlob = new Blob([fileBuffer], {
        type: 'application/octet-stream',
      });
      const file = new File([fileBlob], filename, {
        type: 'application/octet-stream',
      });

      const fileCreateParams: FileCreateParams = {
        file: file,
        purpose: 'assistants',
      };

      const fileObj = await this.openai.files.create(fileCreateParams, {
        timeout: 10000,
      });

      this.logger.info('File uploaded successfully to OpenAI', {
        fileId: fileObj.id,
        filename: fileObj.filename,
        fileSize: fileObj.bytes,
      });

      return {
        success: true,
        fileId: fileObj.id,
        filename: fileObj.filename,
      };
    } catch (error) {
      this.logger.error('Failed to upload file to OpenAI', error as Error, {
        filename,
        fileSize: fileBuffer.length,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async analyzeFile(
    fileContent: ChatCompletionContentPart.File,
    analysisPrompt: string,
    options?: Partial<GptAnalysisRequest>,
  ): Promise<GptAnalysisResponse> {
    try {
      this.logger.info('Starting file analysis with GPT', {
        prompt: analysisPrompt,
        model: options?.model || this.config.defaultModel,
      });

      const { file, type } = fileContent;
      const content: ChatCompletionContentPart[] = [
        { type: 'text', text: 'Please analyze this document.' },
        {
          type: type,
          file: file,
        },
      ];
      const params: ChatCompletionCreateParamsNonStreaming = {
        model: options?.model || this.config.defaultModel,
        messages: [
          {
            role: 'system',
            content: analysisPrompt,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        max_tokens: options?.maxTokens || this.config.defaultMaxTokens,
        temperature: options?.temperature || this.config.defaultTemperature,
      };
      const requestOptions: RequestOptions = {
        timeout: 10000,
      };

      const completion = await this.openai.chat.completions.create(
        params,
        requestOptions,
      );

      const response = completion.choices[0]?.message?.content;

      if (!response) {
        throw new Error('No response received from GPT');
      }

      this.logger.info('File analysis completed successfully', {
        responseLength: response.length,
        usage: completion.usage,
      });

      return {
        success: true,
        content: response,
        usage: completion.usage,
      } as GptAnalysisResponse;
    } catch (error) {
      this.logger.error('File analysis failed', error as Error, {
        prompt: analysisPrompt,
      });

      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.openai.files.delete(fileId);
      this.logger.info('File deleted from OpenAI', { fileId });
      return true;
    } catch (error) {
      this.logger.error('Failed to delete file from OpenAI', error as Error, {
        fileId,
      });
      return false;
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
      } as GptAnalysisResponse;
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
