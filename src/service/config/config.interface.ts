export interface AppConfig {
  azure: {
    tenantId: string;
    subscriptionId: string;
    keyVaultUrl: string;
  };
  info: {
    name: string;
    description?: string;
    version?: string;
  };
  auth?: { enabled: boolean; secret: string };
  environment: 'development' | 'production';
  keyVault?: { vaultUrl: string };
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
