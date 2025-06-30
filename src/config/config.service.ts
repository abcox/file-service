import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfig } from './config.interface';

@Injectable()
export class AppConfigService {
  private config: AppConfig;

  constructor(private configService: ConfigService) {
    this.loadConfig();
  }

  private loadConfig(): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV') || 'development';
    const configPath = path.join(
      process.cwd(),
      'env',
      `config.${nodeEnv}.json`,
    );

    console.log(`📋 Loading config from: ${configPath}`);

    if (!fs.existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configData = fs.readFileSync(configPath, 'utf8');
    const parsedConfig = JSON.parse(configData) as AppConfig;

    // Substitute environment variables
    this.config = this.substituteEnvVars(parsedConfig);

    console.log(`✅ Config loaded for environment: ${nodeEnv}`);
  }

  private substituteEnvVars(config: AppConfig): AppConfig {
    const configStr = JSON.stringify(config);
    const substitutedStr = configStr.replace(
      /AZURE_STORAGE_CONNECTION_STRING/g,
      this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING') || '',
    );
    return JSON.parse(substitutedStr) as AppConfig;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getServerConfig() {
    return this.config.server;
  }

  getStorageConfig() {
    return this.config.storage;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getUploadDir(): string {
    return this.config.storage.local.uploadDir;
  }

  getStorageType(): 'local' | 'azure' {
    return this.config.storage.type;
  }

  getStorageOptions(): { safeMode: boolean } {
    return {
      safeMode: this.config.storage.options.safeMode || false,
    };
  }
}
