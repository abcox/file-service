import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

export interface StorageConfig {
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
}

interface BaseStorageConfig {
  type: 'local' | 'azure' | 'emulator' | undefined;
  options: {
    safeMode: boolean;
  };
}

interface LocalStorageConfig extends BaseStorageConfig {
  type: 'local';
  subfolderPath: string;
}

interface AzureStorageConfig extends BaseStorageConfig {
  type: 'azure' | 'emulator';
  connectionString: string;
  containerName: string;
}

export interface FileInfo {
  filename: string;
  size: number;
  created: Date;
  modified: Date;
  url?: string;
}

export interface StorageOptions {
  safeMode: boolean;
}

interface StorageClient {
  getFiles(): Promise<FileInfo[]>;
  uploadFile(file: Buffer, filename: string): Promise<FileInfo>;
  downloadFile(filename: string): Promise<Buffer>;
  deleteFile(filename: string): Promise<void>;
}

@Injectable()
export class StorageService implements StorageClient {
  private config: BaseStorageConfig | undefined;
  //private azureContainerClient?: ContainerClient;
  private storageOptions: StorageOptions;

  constructor(
    private appConfigService: AppConfigService,
    private logger: LoggerService,
  ) {
    // Lazy initialization - will be called when first needed
    this.storageOptions = { safeMode: false }; // Will be updated on first access
    const config = this.appConfigService.getConfig().storage;
    this.init(config);
  }

  private init(config: StorageConfig) {
    let selectedConfig: BaseStorageConfig | undefined = undefined;
    if (!config.type) {
      this.logger.warn('Storage config type required', { config });
      return;
    }
    if (config.type === 'local') {
      const localStorageConfig = {
        ...config,
        subfolderPath: config.local.subfolderPath,
      } as LocalStorageConfig;
      if (!localStorageConfig.subfolderPath) {
        this.logger.warn('Local storage config missing subfolder path');
        return;
      }
      selectedConfig = localStorageConfig;
    }
    if (['azure', 'emulator'].includes(config.type)) {
      const azureStorageConfig = {
        ...config,
        connectionString:
          config.type === 'azure'
            ? config.azure.connectionString
            : config.emulator.connectionString,
        containerName:
          config.type === 'azure'
            ? config.azure.containerName
            : config.emulator.containerName,
      } as AzureStorageConfig;
      if (
        !azureStorageConfig.connectionString ||
        !azureStorageConfig.containerName
      ) {
        this.logger.warn(
          `Storage config type ${config.type} requires connectionn string AND container name`,
        );
        return;
      }
      selectedConfig = azureStorageConfig;
    }
    this.config = selectedConfig;
  }

  private _client: ContainerClient | undefined = undefined;

  private get client(): ContainerClient {
    if (!this.config) {
      throw new Error('Storage config not initialized');
    }
    if (!this._client) {
      this._client = this.getContainerClient(this.config as AzureStorageConfig);
    }
    return this._client;
  }

  private getContainerClient(config: AzureStorageConfig): ContainerClient {
    const { connectionString, containerName } = config;

    if (!connectionString || !containerName) {
      throw new Error('Connection and container required.');
    }
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    containerClient
      .createIfNotExists()
      .then(() => {
        this.logger.debug('Storage container created.', {
          container: containerName,
        });
      })
      .catch((error: Error) => {
        this.logger.error('Storage container creation failed.', error, {
          container: containerName,
        });
        throw error;
      });
    this.logger.info('Storage container client created.', {
      container: containerName,
    });

    return containerClient;
  }

  async uploadFile(file: Buffer, filename: string): Promise<FileInfo> {
    const storageType = this.config?.type;

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.uploadToAzure(file, filename);
    } else {
      return this.uploadToLocal(file, filename);
    }
  }

  private async uploadToAzure(
    file: Buffer,
    filename: string,
  ): Promise<FileInfo> {
    const client = this.client;
    const blockBlobClient = client.getBlockBlobClient(filename);

    // Check if file already exists
    const exists = await blockBlobClient.exists();
    if (exists) {
      this.logger.warn('File already exists in Azure', { filename });

      if (this.storageOptions.safeMode) {
        this.logger.info('Safe mode enabled, generating unique name', {
          filename,
        });
        filename = this.getUniqueFilename(filename);
        this.logger.info('Generated unique name', {
          originalFilename: filename,
          newFilename: filename,
        });
      } else {
        throw new Error(`File ${filename} already exists in Azure`);
      }

      // Get new blockBlobClient with unique name
      const uniqueBlockBlobClient = client.getBlockBlobClient(filename);

      await uniqueBlockBlobClient.upload(file, file.length);

      this.logger.logFileOperation('uploaded', filename, {
        storageType: 'azure',
        size: file.length,
        url: uniqueBlockBlobClient.url,
      });

      return {
        filename,
        size: file.length,
        created: new Date(),
        modified: new Date(),
        url: uniqueBlockBlobClient.url,
      };
    }

    await blockBlobClient.upload(file, file.length);

    this.logger.logFileOperation('uploaded', filename, {
      storageType: 'azure',
      size: file.length,
      url: blockBlobClient.url,
    });

    return {
      filename,
      size: file.length,
      created: new Date(),
      modified: new Date(),
      url: blockBlobClient.url,
    };
  }

  private getUniqueFilename(filename: string): string {
    const timestamp = Date.now();
    const nameParts = filename.split('.');
    const extension = nameParts.length > 1 ? `.${nameParts.pop()}` : '';
    const baseName = nameParts.join('.');
    return `${baseName}-${timestamp}${extension}`;
  }

  private uploadToLocal(file: Buffer, filename: string): FileInfo {
    const localConfig = this.config as LocalStorageConfig;
    const filePath = path.join(localConfig.subfolderPath, filename);

    fs.writeFileSync(filePath, file);

    this.logger.logFileOperation('uploaded', filename, {
      storageType: 'local',
      size: file.length,
      filePath,
    });

    return {
      filename,
      size: file.length,
      created: new Date(),
      modified: new Date(),
    };
  }

  async getFiles(): Promise<FileInfo[]> {
    const storageType = this.config?.type;

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.getFilesFromAzure();
    } else {
      return this.getFilesFromLocal();
    }
  }

  private async getFilesFromAzure(): Promise<FileInfo[]> {
    const client = this.client;
    const files: FileInfo[] = [];
    for await (const blob of client.listBlobsFlat()) {
      files.push({
        filename: blob.name,
        size: blob.properties.contentLength || 0,
        created: blob.properties.createdOn || new Date(),
        modified: blob.properties.lastModified || new Date(),
        url: `${client.url}/${blob.name}`,
      });
    }

    return files;
  }

  private getFilesFromLocal(): FileInfo[] {
    const localConfig = this.config as LocalStorageConfig;
    const folderPath = path.join(process.cwd(), localConfig.subfolderPath);

    if (!fs.existsSync(folderPath)) {
      return [];
    }

    const files = fs.readdirSync(folderPath);
    return files.map((filename) => {
      const filePath = path.join(folderPath, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    });
  }

  async downloadFile(filename: string): Promise<Buffer> {
    const storageType = this.config?.type;

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.downloadFromAzure(filename);
    } else {
      return this.downloadFromLocal(filename);
    }
  }

  private async downloadFromAzure(filename: string): Promise<Buffer> {
    const client = this.client;
    const blockBlobClient = client.getBlockBlobClient(filename);
    const downloadResponse = await blockBlobClient.download();

    if (!downloadResponse.readableStreamBody) {
      throw new Error(`File ${filename} not found in Azure`);
    }

    const chunks: Buffer[] = [];
    for await (const chunk of downloadResponse.readableStreamBody) {
      chunks.push(Buffer.from(chunk));
    }

    return Buffer.concat(chunks);
  }

  private downloadFromLocal(filename: string): Buffer {
    const localConfig = this.config as LocalStorageConfig;
    const filePath = path.join(localConfig.subfolderPath, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} not found`);
    }

    return fs.readFileSync(filePath);
  }

  async deleteFile(filename: string): Promise<void> {
    const storageType = this.config?.type;

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.deleteFromAzure(filename);
    } else {
      return this.deleteFromLocal(filename);
    }
  }

  private async deleteFromAzure(filename: string): Promise<void> {
    const client = this.client;
    const blockBlobClient = client.getBlockBlobClient(filename);
    await blockBlobClient.delete();

    this.logger.logFileOperation('deleted', filename, { storageType: 'azure' });
  }

  private deleteFromLocal(filename: string): void {
    const localConfig = this.config as LocalStorageConfig;
    const filePath = path.join(localConfig.subfolderPath, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} not found`);
    }

    fs.unlinkSync(filePath);
    this.logger.logFileOperation('deleted', filename, {
      storageType: 'local',
      filePath,
    });
  }
}
