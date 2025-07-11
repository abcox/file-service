import { Injectable, Optional } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { KeyVaultService } from '../keyvault/keyvault.service';
import { LoggerService } from '../logger/logger.service';
import { AppConfig } from './config.interface';

@Injectable()
export class AppConfigService {
  private config: AppConfig;

  // Static initializer for pre-bootstrap config loading
  static async init(logger: LoggerService): Promise<AppConfig> {
    // 1. Load base configuration from JSON files
    const environment = process.env.NODE_ENV || 'development';
    const configPath = path.join(
      process.cwd(),
      environment === 'development' ? 'src/config' : 'dist',
      `config.json`,
    );
    if (!fs.existsSync(configPath)) {
      logger.error(`Configuration file not found: '${configPath}`);
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    logger.info('configPath', {
      configPath,
    });
    const configContent = fs.readFileSync(configPath, 'utf8');
    let config: AppConfig = JSON.parse(configContent) as AppConfig;
    logger.info('Base configuration loaded successfully', {
      environment,
      storageType: config.storage.type,
    });

    const keyVaultUrl = config.azure.keyVaultUrl;
    if (!keyVaultUrl) {
      logger.error('Key Vault URL not found in config');
      throw new Error('Key Vault URL not found in config');
    }

    // 3. For local development, we could use the .env file completely (TODO)
    //    Therefore, no need to continue with key vault
    if (process.env.OFFLINE_MODE === 'true') {
      logger.info('Running in OFFLINE MODE. Skipping Key Vault.');
      return config;
    }

    try {
      const keyVaultService = new KeyVaultService(logger);
      keyVaultService.initializeKeyVault(keyVaultUrl);
      let resolvedConfig = await keyVaultService.resolveSecretsInConfig(config);
      resolvedConfig =
        await keyVaultService.resolveEmptyConfigValues(resolvedConfig);
      config = resolvedConfig;
      logger.info('Key Vault secrets loaded successfully');
      if (config.auth?.secret) {
        logger.info('Auth secret loaded from Key Vault', {
          secretLength: config.auth.secret.length,
          secretPreview:
            config.auth.secret.substring(0, 9) +
            '...' +
            config.auth.secret.substring(config.auth.secret.length - 9),
        });
      }
    } catch (err) {
      logger.error('Failed to load secrets from Key Vault', err as Error);
      // In production, Key Vault failure should be fatal
      if (environment === 'production') {
        throw new Error(
          `Key Vault configuration failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }
      logger.warn(
        'Continuing with environment variables due to Key Vault failure',
      );
    }

    return config;
  }

  // TODO: remove this method OR refactor to make it an override of the keyvault substitution
  // Helper method to load sensitive config from environment variables
  private static loadSensitiveConfigFromEnv(
    config: AppConfig,
    logger: LoggerService,
  ): AppConfig {
    // Load Azure Storage connection string
    logger.info('AZURE_STORAGE_CONNECTION_STRING', {
      AZURE_STORAGE_CONNECTION_STRING:
        process.env.AZURE_STORAGE_CONNECTION_STRING,
    });
    const envConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (envConnectionString && config.storage.type === 'azure') {
      logger.info(
        'Using AZURE_STORAGE_CONNECTION_STRING from environment variable',
      );
      config.storage.azure.connectionString = envConnectionString;
    }

    // Load JWT secret
    const envJwtSecret = process.env.JWT_SECRET;
    if (envJwtSecret && config.auth) {
      logger.info('Using JWT_SECRET from environment variable');
      config.auth.secret = envJwtSecret;
    }

    return config;
  }

  constructor(
    private nestConfigService: NestConfigService,
    @Optional() private keyVaultService: KeyVaultService,
    private logger: LoggerService,
  ) {
    // The config will be set after instantiation
  }

  getDatabaseConfig(): AppConfig['database'] {
    return this.config.database;
  }

  setConfig(config: AppConfig) {
    this.config = config;
  }

  getConfig(): AppConfig {
    return this.config;
  }
}
