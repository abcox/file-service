export interface ServerConfig {
  port: number;
  host: string;
}

export interface LocalStorageConfig {
  uploadDir: string;
}

export interface AzureStorageConfig {
  connectionString: string;
  container: string;
}

export interface StorageOptions {
  safeMode: boolean;
}

export interface StorageConfig {
  type: 'local' | 'azure';
  local: LocalStorageConfig;
  azure: AzureStorageConfig;
  options: StorageOptions;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  enableConsole: boolean;
}

export interface AppConfig {
  server: ServerConfig;
  storage: StorageConfig;
  logging: LoggingConfig;
}
