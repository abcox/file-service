import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { AppConfig } from './config.interface';

@Injectable()
export class ConfigDebugService {
  constructor(private logger: LoggerService) {}

  /**
   * Comprehensive startup diagnostics for configuration issues
   */
  async runStartupDiagnostics(): Promise<void> {
    this.logger.info('🔍 Starting Configuration Diagnostics...', {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
    });

    await this.diagnoseEnvironment();
    await this.diagnoseFileSystem();
    await this.diagnoseEnvironmentVariables();
    await this.diagnoseAzureCredentials();
    await this.diagnoseNetworkConnectivity();

    this.logger.info('✅ Configuration Diagnostics Complete');
  }

  /**
   * Diagnose environment and runtime conditions
   */
  private async diagnoseEnvironment(): Promise<void> {
    this.logger.info('📋 Environment Diagnostics', {
      NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
      PORT: process.env.PORT || 'NOT_SET',
      OFFLINE_MODE: process.env.OFFLINE_MODE || 'NOT_SET',
      cwd: process.cwd(),
      pid: process.pid,
      uptime: process.uptime(),
    });

    // Check if we're in a container
    const isContainer =
      fs.existsSync('/.dockerenv') ||
      (fs.existsSync('/proc/1/cgroup') &&
        fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'));

    this.logger.info('🐳 Container Environment', {
      isContainer,
      hasDockerEnv: fs.existsSync('/.dockerenv'),
      hasCgroup: fs.existsSync('/proc/1/cgroup'),
    });
    return await Promise.resolve();
  }

  /**
   * Diagnose file system and configuration files
   */
  private async diagnoseFileSystem(): Promise<void> {
    const cwd = process.cwd();
    const environment = process.env.NODE_ENV || 'development';

    // Check possible config paths
    const possiblePaths = [
      path.join(cwd, 'src/config/config.json'),
      path.join(cwd, 'dist/config.json'),
      path.join(cwd, 'config.json'),
      '/app/src/config/config.json',
      '/app/dist/config.json',
    ];

    this.logger.info('📁 File System Diagnostics', {
      currentWorkingDirectory: cwd,
      environment,
      possibleConfigPaths: possiblePaths,
    });

    for (const configPath of possiblePaths) {
      try {
        const exists = fs.existsSync(configPath);
        const stats = exists ? fs.statSync(configPath) : null;

        this.logger.info(`📄 Config Path Check: ${configPath}`, {
          exists,
          size: stats?.size,
          modified: stats?.mtime,
          permissions: stats?.mode,
        });

        if (exists) {
          // Try to read and parse the config
          try {
            const content = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(content) as AppConfig;
            this.logger.info(`✅ Config File Valid: ${configPath}`, {
              hasKeyVaultUrl: !!config.azure?.keyVaultUrl,
              hasAuthConfig: !!config.auth,
              hasStorageConfig: !!config.storage,
              configKeys: Object.keys(config),
            });
          } catch (parseError) {
            this.logger.error(
              `❌ Config File Invalid: ${configPath}`,
              parseError as Error,
            );
          }
        }
      } catch (error) {
        this.logger.error(
          `❌ Error checking path: ${configPath}`,
          error as Error,
        );
      }
    }
    return await Promise.resolve();
  }

  /**
   * Diagnose environment variables
   */
  private async diagnoseEnvironmentVariables(): Promise<void> {
    const relevantEnvVars = [
      'NODE_ENV',
      'PORT',
      'OFFLINE_MODE',
      'AZURE_CLIENT_ID',
      'AZURE_TENANT_ID',
      'AZURE_CLIENT_SECRET',
      'JWT_SECRET',
      'AZURE_STORAGE_CONNECTION_STRING',
      'PLAYWRIGHT_BROWSER_PATH',
    ];

    const envDiagnostics: Record<string, any> = {};

    for (const envVar of relevantEnvVars) {
      const value = process.env[envVar];
      envDiagnostics[envVar] = {
        set: !!value,
        length: value?.length || 0,
        preview: value ? `${value.substring(0, 10)}...` : 'NOT_SET',
      };
    }

    this.logger.info('🔧 Environment Variables Diagnostics', envDiagnostics);

    return await Promise.resolve();
  }

  /**
   * Diagnose Azure credentials and authentication
   */
  private async diagnoseAzureCredentials(): Promise<void> {
    this.logger.info('☁️ Azure Credentials Diagnostics', {
      hasClientId: !!process.env.AZURE_CLIENT_ID,
      hasTenantId: !!process.env.AZURE_TENANT_ID,
      hasClientSecret: !!process.env.AZURE_CLIENT_SECRET,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasStorageConnection: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
    });

    // Check for Managed Identity indicators
    const hasManagedIdentity =
      fs.existsSync('/proc/1/cgroup') &&
      fs.readFileSync('/proc/1/cgroup', 'utf8').includes('azure');

    this.logger.info('🆔 Azure Identity Diagnostics', {
      hasManagedIdentity,
      hasDockerEnv: fs.existsSync('/.dockerenv'),
      hasIMDS: fs.existsSync('/proc/net/tcp'), // Basic check for Linux environment
    });

    return await Promise.resolve();
  }

  /**
   * Diagnose network connectivity
   */
  private async diagnoseNetworkConnectivity(): Promise<void> {
    this.logger.info('🌐 Network Connectivity Diagnostics', {
      hostname: os.hostname(),
      networkInterfaces: Object.keys(os.networkInterfaces()),
    });

    // Test basic connectivity to Azure services
    const connectivityTests = [
      {
        name: 'Azure Key Vault',
        url: 'https://vorba-file-service-kv.vault.azure.net/',
      },
      {
        name: 'Azure SQL',
        url: 'https://vorba-sql-svr-1.database.windows.net/',
      },
      {
        name: 'Azure Storage',
        url: 'https://ccastore01.blob.core.windows.net/',
      },
    ];

    for (const test of connectivityTests) {
      try {
        // Simple HTTP HEAD request to test connectivity
        const response = await fetch(test.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000), // 5 second timeout
        });

        this.logger.info(`✅ Network Test: ${test.name}`, {
          status: response.status,
          statusText: response.statusText,
        });
      } catch (error) {
        this.logger.warn(`⚠️ Network Test Failed: ${test.name}`, {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  /**
   * Generate a comprehensive diagnostic report
   */
  async generateDiagnosticReport(): Promise<string> {
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV || 'NOT_SET',
        PORT: process.env.PORT || 'NOT_SET',
        cwd: process.cwd(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
      },
      filesystem: {
        configPaths: [
          path.join(process.cwd(), 'src/config/config.json'),
          path.join(process.cwd(), 'dist/config.json'),
          '/app/src/config/config.json',
          '/app/dist/config.json',
        ].map((p) => ({ path: p, exists: fs.existsSync(p) })),
      },
      azure: {
        hasClientId: !!process.env.AZURE_CLIENT_ID,
        hasTenantId: !!process.env.AZURE_TENANT_ID,
        hasClientSecret: !!process.env.AZURE_CLIENT_SECRET,
        hasJwtSecret: !!process.env.JWT_SECRET,
        hasStorageConnection: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
        isContainer: fs.existsSync('/.dockerenv'),
      },
    };

    const result = JSON.stringify(report, null, 2);

    return await Promise.resolve(result);
  }
}
