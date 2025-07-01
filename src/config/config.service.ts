import { Injectable /* , OnModuleInit */, Optional } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { KeyVaultService } from './keyvault.service';
import { LoggerService } from '../logging/logger.service';
import { AppConfig } from './config.interface';

@Injectable()
export class AppConfigService /*  implements OnModuleInit */ {
  private config: AppConfig;

  constructor(
    private nestConfigService: NestConfigService,
    @Optional() private keyVaultService: KeyVaultService,
    private logger: LoggerService,
  ) {
    console.log('�� constructor');
    this.loadConfigSync();
    // Load Key Vault secrets asynchronously if needed
    if (this.config?.keyVault?.enabled) {
      void this.loadKeyVaultSecrets();
    }
  }

  /* async onModuleInit() {
    console.log('🚀 onModuleInit');
    await this.loadConfig();
  } */

  private loadBaseConfig(): AppConfig {
    const environment =
      this.nestConfigService.get<string>('NODE_ENV') || 'development';
    this.logger.info('Loading base configuration', { environment });

    // Load base config file
    const configPath = path.join(
      process.cwd(),
      'env',
      `config.${environment}.json`,
    );

    if (!fs.existsSync(configPath)) {
      this.logger.error(`Configuration file not found: '${configPath}`);
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = fs.readFileSync(configPath, 'utf8');
    const config: AppConfig = JSON.parse(configContent) as AppConfig;

    this.logger.info('Base configuration loaded successfully', {
      environment,
      storageType: config.storage.type,
      port: config.port,
    });

    return config;
  }

  private loadConfigSync(): void {
    try {
      this.config = this.loadBaseConfig();
    } catch (error) {
      this.logger.error('Failed to load configuration', error as Error);
      throw error;
    }
  }

  private async loadKeyVaultSecrets(): Promise<void> {
    if (!this.keyVaultService || !this.config?.keyVault?.enabled) {
      return;
    }

    try {
      // Initialize KeyVault with URL from config
      this.keyVaultService.initializeKeyVault(this.config.keyVault.vaultUrl);

      let config = await this.keyVaultService.resolveSecretsInConfig(
        this.config,
      );
      // Also resolve empty config values using naming convention
      config = await this.keyVaultService.resolveEmptyConfigValues(config);

      // TEMPORARY: Log resolved connection string for debugging
      if (
        config.storage.type === 'azure' &&
        config.storage.azure.connectionString
      ) {
        this.logger.info('Key Vault resolved connection string', {
          connectionString:
            config.storage.azure.connectionString.substring(0, 20) + '...',
          resolved: true,
        });
      }

      this.config = config;
      this.logger.info('Key Vault secrets loaded successfully');
    } catch (error) {
      this.logger.warn(
        'Failed to resolve secrets in config, using original',
        error as Error,
      );
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      // Load base config first
      this.config = this.loadBaseConfig();

      // Resolve secrets in config using Key Vault
      if (this.keyVaultService && this.config.keyVault?.enabled) {
        // Initialize KeyVault with URL from config
        this.keyVaultService.initializeKeyVault(this.config.keyVault.vaultUrl);

        try {
          let config = await this.keyVaultService.resolveSecretsInConfig(
            this.config,
          );
          // Also resolve empty config values using naming convention
          config = await this.keyVaultService.resolveEmptyConfigValues(config);

          // TEMPORARY: Log resolved connection string for debugging
          if (
            config.storage.type === 'azure' &&
            config.storage.azure.connectionString
          ) {
            this.logger.info('Key Vault resolved connection string', {
              connectionString:
                config.storage.azure.connectionString.substring(0, 20) + '...',
              resolved: true,
            });
          }

          this.config = config;
        } catch (error) {
          this.logger.warn(
            'Failed to resolve secrets in config, using original',
            error as Error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to load configuration', error as Error);
      throw error;
    }
  }

  private mergeConfigs(
    baseConfig: AppConfig,
    secretConfig: Record<string, unknown>,
  ): AppConfig {
    const merged = { ...baseConfig };

    // Deep merge secret config into base config
    for (const [key, value] of Object.entries(secretConfig)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const existingValue = (merged as Record<string, unknown>)[key];
        if (
          typeof existingValue === 'object' &&
          existingValue !== null &&
          !Array.isArray(existingValue)
        ) {
          (merged as Record<string, unknown>)[key] = {
            ...existingValue,
            ...value,
          };
        } else {
          (merged as Record<string, unknown>)[key] = value;
        }
      } else {
        (merged as Record<string, unknown>)[key] = value;
      }
    }

    return merged;
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
