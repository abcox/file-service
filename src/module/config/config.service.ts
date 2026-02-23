import { Injectable, Optional } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { KeyVaultService } from './keyvault.service';
import { LoggerService } from '../logger/logger.service';
import { AppConfig } from './config.interface';

export class TimeZoneConfig {
  effective: string;
  configured: string | undefined;
  system: string | undefined;
  default: string;
}

@Injectable()
export class AppConfigService {
  private config: AppConfig;

  // Static initializer for pre-bootstrap config loading
  static async init(logger: LoggerService): Promise<AppConfig> {
    logger.info('🚀 Starting AppConfigService initialization...', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      cwd: process.cwd(),
    });

    // 1. Load base configuration from JSON files
    const environment = process.env.NODE_ENV || 'development';
    const isDevOrTest = ['development', 'test'].includes(environment);
    const configDir = isDevOrTest ? 'src/config' : 'dist';

    // In development, try config.local-dev.json first (gitignored, contains secrets)
    // Falls back to config.json (committed template)
    let configPath: string;
    if (isDevOrTest) {
      const localDevConfigPath = path.join(
        process.cwd(),
        configDir,
        'config.local-dev.json',
      );
      if (fs.existsSync(localDevConfigPath)) {
        configPath = localDevConfigPath;
        logger.info('📁 Using local-dev config (config.local-dev.json)');
      } else {
        configPath = path.join(process.cwd(), configDir, 'config.json');
        logger.warn(
          '⚠️ config.local-dev.json not found, falling back to config.json',
        );
      }
    } else {
      configPath = path.join(process.cwd(), configDir, 'config.json');
    }

    logger.info('📁 Config file path resolution', {
      environment,
      configPath,
      cwd: process.cwd(),
    });

    if (!fs.existsSync(configPath)) {
      logger.error(`❌ Configuration file not found: '${configPath}'`);

      // Enhanced error message with troubleshooting hints
      const troubleshootingHints = [
        `Expected path: ${configPath}`,
        `Current working directory: ${process.cwd()}`,
        `Environment: ${environment}`,
        `Check if config file exists in the correct location`,
        `For production, ensure config is copied to dist/config.json`,
      ];

      logger.info('🔧 Troubleshooting hints:', {
        hints: troubleshootingHints,
      });
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
      if (config.auth?.session?.secret) {
        logger.info('Auth secret loaded from Key Vault', {
          secretLength: config.auth.session.secret.length,
          secretPreview:
            config.auth.session.secret.substring(0, 9) +
            '...' +
            config.auth.session.secret.substring(
              config.auth.session.secret.length - 9,
            ),
        });
      }
    } catch (err) {
      logger.error('❌ Failed to load secrets from Key Vault', err as Error);

      // Enhanced error diagnostics
      const errorDetails = {
        environment,
        keyVaultUrl,
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        errorStack: err instanceof Error ? err.stack : undefined,
        hasAzureCredentials: !!(
          process.env.AZURE_CLIENT_ID &&
          process.env.AZURE_TENANT_ID &&
          process.env.AZURE_CLIENT_SECRET
        ),
        isContainer: fs.existsSync('/.dockerenv'),
        hasManagedIdentity:
          fs.existsSync('/proc/1/cgroup') &&
          fs.readFileSync('/proc/1/cgroup', 'utf8').includes('azure'),
      };

      logger.info('🔍 Key Vault Error Diagnostics', errorDetails);

      // In production, Key Vault failure should be fatal
      if (environment === 'production') {
        const troubleshootingSteps = [
          'Check if Managed Identity is properly configured',
          'Verify role assignments for Key Vault access',
          'Ensure Key Vault URL is correct',
          'Check network connectivity to Key Vault',
          'Verify Key Vault secrets exist and are accessible',
        ];

        logger.info('🔧 Production Key Vault Troubleshooting Steps', {
          steps: troubleshootingSteps,
        });
        throw new Error(
          `Key Vault configuration failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      }

      logger.warn(
        '⚠️ Continuing with environment variables due to Key Vault failure (development mode)',
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
      config.auth.session.secret = envJwtSecret;
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

  getDatabaseConfig(): AppConfig['azure']['database'] {
    return this.config.azure.database;
  }

  setConfig(config: AppConfig) {
    this.config = config;
  }

  getConfig(): AppConfig {
    return this.config;
  }

  getTimeZoneConfig(): TimeZoneConfig {
    const defaultTimeZone = 'UTC';
    const { timeZone: configured } = this.config.api || defaultTimeZone;
    const system = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const effective = configured || system || defaultTimeZone;
    return {
      effective,
      configured,
      system,
      default: defaultTimeZone,
    };
  }
}
