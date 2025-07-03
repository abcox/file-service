import { Injectable, Optional } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { KeyVaultService } from './keyvault.service';
import { LoggerService } from '../logging/logger.service';
import { AppConfig } from './config.interface';

@Injectable()
export class AppConfigService {
  private config: AppConfig;

  // Static async initializer for pre-bootstrap config loading
  static async init(logger: LoggerService): Promise<AppConfig> {
    // 1. Load local config
    const environment = process.env.NODE_ENV || 'development';
    const configPath = path.join(
      process.cwd(),
      'env',
      `config.${environment}.json`,
    );
    if (!fs.existsSync(configPath)) {
      logger.error(`Configuration file not found: '${configPath}`);
      throw new Error(`Configuration file not found: ${configPath}`);
    }
    const configContent = fs.readFileSync(configPath, 'utf8');
    let config: AppConfig = JSON.parse(configContent) as AppConfig;
    logger.info('Base configuration loaded successfully', {
      environment,
      storageType: config.storage.type,
      port: config.port,
    });

    // TEMPORARY BYPASS: Check for environment variable first
    // TODO: Remove this bypass once Key Vault authentication is working properly
    const envConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (envConnectionString && config.storage.type === 'azure') {
      logger.info(
        'Using AZURE_STORAGE_CONNECTION_STRING from environment variable (Key Vault bypass)',
      );
      config.storage.azure.connectionString = envConnectionString;
      logger.info('Storage connection string loaded from environment variable');
    }

    // TEMPORARY BYPASS: Check for JWT secret environment variable
    const envJwtSecret = process.env.JWT_SECRET;
    if (envJwtSecret && config.auth) {
      logger.info(
        'Using JWT_SECRET from environment variable (Key Vault bypass)',
      );
      config.auth.secret = envJwtSecret;
      logger.info('JWT secret loaded from environment variable');
    }

    // 2. Check for offline/dev mode
    if (process.env.OFFLINE_MODE === 'true') {
      logger.info('Running in OFFLINE MODE. Skipping Key Vault.');
      return config;
    }

    // 3. Load Key Vault secrets (only if we don't have connection string from env)
    if (config.keyVault?.enabled && !envConnectionString && !envJwtSecret) {
      try {
        const keyVaultService = new KeyVaultService(logger);
        keyVaultService.initializeKeyVault(config.keyVault.vaultUrl);
        let resolvedConfig =
          await keyVaultService.resolveSecretsInConfig(config);
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
            //fullSecret: config.auth.secret,
          });
        }
      } catch (err) {
        logger.error('Failed to load secrets from Key Vault', err as Error);
        // Don't throw error - continue with environment variable if available
        if (!envConnectionString && !envJwtSecret) {
          throw err;
        }
        logger.warn(
          'Continuing with environment variable due to Key Vault failure',
        );
      }
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

  setConfig(config: AppConfig) {
    this.config = config;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getPort(): number {
    return this.config.port;
  }

  getEnvironment(): string {
    return this.config.environment;
  }

  getStorageType(): 'local' | 'azure' | 'emulator' {
    return this.config.storage.type;
  }

  getLocalStorageConfig() {
    return this.config.storage.local;
  }

  getAzureStorageConfig() {
    return this.config.storage.azure;
  }

  getEmulatorStorageConfig() {
    return this.config.storage.emulator;
  }

  getSafeMode(): boolean {
    return this.config.storage.options.safeMode;
  }
}
