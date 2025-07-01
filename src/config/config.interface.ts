export interface AppConfig {
  port: number;
  environment: string;
  storage: {
    type: 'local' | 'azure' | 'emulator';
    local: {
      subfolderPath: string;
    };
    azure: {
      connectionString: string;
      containerName: string;
    };
    emulator: {
      connectionString: string;
      containerName: string;
    };
    options: {
      safeMode: boolean;
    };
  };
  keyVault?: {
    enabled: boolean;
    vaultUrl: string;
  };
}
