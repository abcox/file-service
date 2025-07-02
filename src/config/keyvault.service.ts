import { Injectable } from '@nestjs/common';
import { KeyVaultSecret, SecretClient } from '@azure/keyvault-secrets';
import { DefaultAzureCredential } from '@azure/identity';
import { LoggerService } from '../logging/logger.service';

@Injectable()
export class KeyVaultService {
  private secretClient?: SecretClient;

  constructor(private logger: LoggerService) {}

  initializeKeyVault(vaultUrl?: string): void {
    const keyVaultUrl = vaultUrl || process.env.AZURE_KEY_VAULT_URL;
    if (keyVaultUrl) {
      try {
        const credential = new DefaultAzureCredential();
        this.secretClient = new SecretClient(keyVaultUrl, credential);
        this.logger.info('Azure Key Vault client initialized', { keyVaultUrl });
      } catch (error) {
        this.logger.error(
          'Failed to initialize Key Vault client',
          error as Error,
          { keyVaultUrl },
        );
      }
    } else {
      this.logger.warn(
        'AZURE_KEY_VAULT_URL not configured, Key Vault features disabled',
      );
    }
  }

  /**
   * Resolves secrets in configuration using {{secret-name}} placeholders
   */
  async resolveSecretsInConfig<T>(config: T): Promise<T> {
    if (!this.secretClient) {
      this.logger.warn('Key Vault not configured, returning original config');
      return config;
    }

    const configStr = JSON.stringify(config);
    const resolvedConfigStr = await this.resolveSecretsInString(configStr);
    return JSON.parse(resolvedConfigStr) as T;
  }

  private async resolveSecretsInString(configStr: string): Promise<string> {
    const secretPattern = /\{\{([^}]+)\}\}/g;
    let resolvedConfig = configStr;
    const resolvedSecrets = new Set<string>();

    const matches = Array.from(configStr.matchAll(secretPattern));

    for (const match of matches) {
      const secretName = match[1];

      if (resolvedSecrets.has(secretName)) {
        continue;
      }

      try {
        const secretValue = await this.getSecret(secretName);

        if (secretValue) {
          const placeholder = `{{${secretName}}}`;
          resolvedConfig = resolvedConfig.replace(
            new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            secretValue,
          );
          resolvedSecrets.add(secretName);
          this.logger.debug('Secret resolved', { secretName });
        } else {
          this.logger.warn('Secret not found or empty', { secretName });
        }
      } catch (error) {
        this.logger.error('Failed to resolve secret', error as Error, {
          secretName,
        });
      }
    }

    return resolvedConfig;
  }

  /**
   * Builds configuration object from Key Vault secrets using naming conventions
   * Example: azure-storage--connection-string → { azure: { storage: { connectionString: "value" } } }
   */
  async buildConfigFromSecrets(
    secretPrefixes: string[] = [],
  ): Promise<Record<string, unknown>> {
    if (!this.secretClient) {
      this.logger.warn('Key Vault not configured, returning empty config');
      return {};
    }

    const config: Record<string, unknown> = {};

    try {
      // List all secrets
      const secrets = this.secretClient.listPropertiesOfSecrets();

      for await (const secret of secrets) {
        const secretName = secret.name;

        // Filter by prefixes if provided
        if (
          secretPrefixes.length > 0 &&
          !secretPrefixes.some((prefix) => secretName.startsWith(prefix))
        ) {
          continue;
        }

        try {
          const secretValue = await this.getSecret(secretName);
          if (secretValue) {
            this.setNestedValue(
              config,
              this.secretNameToPath(secretName),
              secretValue,
            );
            this.logger.debug('Config built from secret', {
              secretName,
              path: this.secretNameToPath(secretName),
            });
          }
        } catch (error) {
          this.logger.error(
            'Failed to get secret for config building',
            error as Error,
            { secretName },
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Failed to list secrets for config building',
        error as Error,
      );
    }

    return config;
  }

  /**
   * Converts secret name to nested object path
   * Example: azure-storage--connection-string → azure.storage.connectionString
   */
  private secretNameToPath(secretName: string): string {
    return secretName
      .split('--')
      .map((part, index) => {
        if (index === 0) {
          return part; // Keep first part as-is (e.g., "azure")
        }
        // Convert kebab-case to camelCase for nested properties
        return part.replace(/-([a-z])/g, (_, letter: string) =>
          letter.toUpperCase(),
        );
      })
      .join('.');
  }

  /**
   * Sets a nested value in an object using dot notation
   * Example: setNestedValue(obj, "azure.storage.connectionString", "value")
   */
  private setNestedValue(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Gets a secret value directly
   */
  async getSecret(secretName: string): Promise<string | null> {
    if (!this.secretClient) {
      this.logger.warn('Key Vault not configured, cannot get secret', {
        secretName,
      });
      return null;
    }

    try {
      this.logger.debug('Requesting secret from Key Vault', { secretName });
      const secret: KeyVaultSecret =
        await this.secretClient.getSecret(secretName);

      if (secret.value) {
        const valueLength = secret.value.length;
        const valuePreview =
          valueLength > 10
            ? `${secret.value.substring(0, 5)}...${secret.value.substring(valueLength - 5)}`
            : secret.value;

        this.logger.debug('Secret retrieved successfully from Key Vault', {
          secretName,
          valueLength,
          valuePreview,
          version: secret.properties.version,
          encoding: 'utf8',
          byteLength: Buffer.byteLength(secret.value, 'utf8'),
          hexPreview:
            Buffer.from(secret.value).toString('hex').substring(0, 20) + '...',
        });
      } else {
        this.logger.warn('Secret retrieved but value is empty', {
          secretName,
          version: secret.properties.version,
        });
      }
      return secret.value || null;
    } catch (error) {
      this.logger.error('Failed to get secret', error as Error, { secretName });
      return null;
    }
  }

  /**
   * Resolves empty config values by looking up secrets using config path naming convention
   * Example: storage.azure.connectionString → storage--azure--connection-string
   */
  async resolveEmptyConfigValues<T>(config: T): Promise<T> {
    if (!this.secretClient) {
      this.logger.warn('Key Vault not configured, returning original config');
      return config;
    }

    const resolvedConfig = await this.resolveEmptyValuesRecursive(
      config as Record<string, unknown>,
      '',
    );
    return resolvedConfig as T;
  }

  private async resolveEmptyValuesRecursive(
    obj: Record<string, unknown>,
    path: string,
  ): Promise<Record<string, unknown>> {
    if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
      return obj as Record<string, unknown>;
    }

    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        // Recursively resolve nested objects
        result[key] = await this.resolveEmptyValuesRecursive(
          value as Record<string, unknown>,
          currentPath,
        );
      } else if (value === '' || value === null || value === undefined) {
        // Try to resolve empty value from Key Vault
        const secretName = this.configPathToSecretName(currentPath);
        this.logger.debug(
          'Requesting secret from Key Vault for empty config value',
          {
            path: currentPath,
            secretName,
          },
        );

        try {
          const secretValue = await this.getSecret(secretName);

          if (secretValue) {
            result[key] = secretValue;
            this.logger.debug('Empty config value resolved from Key Vault', {
              path: currentPath,
              secretName,
            });
          } else {
            result[key] = value; // Keep original empty value
            this.logger.debug('Secret not found for empty config value', {
              path: currentPath,
              secretName,
            });
          }
        } catch (error) {
          result[key] = value; // Keep original empty value
          this.logger.debug('Failed to get secret for empty config value', {
            path: currentPath,
            secretName,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      } else {
        // Keep non-empty values as-is
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Converts config path to secret name
   * Example: storage.azure.connectionString → storage--azure--connectionString
   */
  private configPathToSecretName(path: string): string {
    return path.split('.').join('--');
  }
}
