export interface AppConfig {
  info: {
    name: string;
  };
  auth?: { enabled: boolean; secret: string };
  environment: 'development' | 'production';
  keyVault?: { enabled: boolean; vaultUrl: string };
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
