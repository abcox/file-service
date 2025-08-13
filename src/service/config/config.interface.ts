import { GptConfig } from '../chatGpt/gpt.service';

export interface AppConfig {
  azure: {
    tenantId: string;
    subscriptionId: string;
    keyVaultUrl: string;
    database?: {
      type?: 'azureSql' | 'local-sql-express';
      azureSql?: {
        host?: string;
        port?: number;
        name?: string;
        username?: string;
        password?: string;
        connectionString?: string;
        description?: string;
        portalUrl?: string;
      };
      'local-sql-express'?: {
        host?: string;
        port?: number;
        name?: string;
        username?: string;
        password?: string;
        connectionString?: string;
      };
    };
    cosmosDb?: {
      name?: string;
      description?: string;
      portalUrl?: string;
      connectionString?: string;
      database?: string;
    };
  };
  info: {
    name: string;
    description?: string;
    version?: string;
  };
  auth?: {
    enabled: boolean;
    session: {
      secret: string;
      name: string;
      cookie: {
        secure: boolean;
      };
      accessTokenDurationSeconds?: number; // Default: 3600 (1 hour)
      refreshTokenDurationSeconds?: number; // Default: 604800 (7 days)
      activityConfig?: {
        warningBeforeTokenExpiryMs?: number; // Default: 300000 (5 minutes)
        refreshBeforeTokenExpiryMs?: number; // Default: 600000 (10 minutes)
        activityTimeoutMultiplier?: number; // Default: 0.8 (80% of token duration)
      };
    };
  };
  api: {
    path: string;
    port: number;
    cors: {
      enabled: boolean;
      origin: string;
      methods: string[];
      allowedHeaders: string[];
    };
  };
  environment: 'development' | 'production';
  keyVault?: { vaultUrl: string };
  gptConfig?: GptConfig;
  storage: {
    type: 'local' | 'azure' | 'emulator';
    local: { subfolderPath: string };
    azure: { connectionString: string; containerName: string };
    emulator: { connectionString: string; containerName: string };
    options: { safeMode: boolean };
  };
  swagger: {
    enabled: boolean;
    title: string;
    description: string;
    version: string;
    path: string;
  };
}
