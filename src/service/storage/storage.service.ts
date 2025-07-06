import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { LoggerService } from '../logger/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

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

@Injectable()
export class StorageService {
  private azureContainerClient?: ContainerClient;
  private storageOptions: StorageOptions;

  constructor(
    private appConfigService: AppConfigService,
    private logger: LoggerService,
  ) {
    // Lazy initialization - will be called when first needed
    this.storageOptions = { safeMode: false }; // Will be updated on first access
  }

  private initializeAzureClient(): void {
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure') {
      const azureConfig = this.appConfigService.getAzureStorageConfig();
      const { connectionString, containerName } = azureConfig;

      if (connectionString) {
        const blobServiceClient =
          BlobServiceClient.fromConnectionString(connectionString);
        this.azureContainerClient =
          blobServiceClient.getContainerClient(containerName);
        // Ensure container exists
        this.azureContainerClient
          .createIfNotExists()
          .then(() => {
            this.logger.info('Azure container ensured', {
              container: containerName,
            });
          })
          .catch((error: unknown) => {
            this.logger.error(
              'Failed to ensure Azure container',
              error as Error,
              {
                container: containerName,
              },
            );
          });
        this.logger.info('Azure Blob Storage client initialized', {
          container: containerName,
        });
      } else {
        this.logger.warn('Azure connection string not found', {
          container: containerName,
        });
      }
    } else if (storageType === 'emulator') {
      const emulatorConfig = this.appConfigService.getEmulatorStorageConfig();
      const { connectionString, containerName } = emulatorConfig;

      if (connectionString) {
        const blobServiceClient =
          BlobServiceClient.fromConnectionString(connectionString);
        this.azureContainerClient =
          blobServiceClient.getContainerClient(containerName);
        // Ensure container exists
        this.azureContainerClient
          .createIfNotExists()
          .then(() => {
            this.logger.info('Emulator container ensured', {
              container: containerName,
            });
          })
          .catch((error: unknown) => {
            this.logger.error(
              'Failed to ensure emulator container',
              error as Error,
              {
                container: containerName,
              },
            );
          });
        this.logger.info('Azure Storage Emulator client initialized', {
          container: containerName,
        });
      }
    } else {
      this.logger.warn('Storage type not supported', { storageType });
    }
  }

  private ensureInitialized(): void {
    // Check if we need to initialize by seeing if we have a valid config
    try {
      const safeMode = this.appConfigService.getSafeMode();
      if (this.storageOptions.safeMode === false && safeMode !== undefined) {
        this.storageOptions = { safeMode };
        this.initializeAzureClient();
      }
    } catch {
      // Config not ready yet, will retry on next call
      this.logger.debug('Config not ready yet, will retry initialization');
    }
  }

  async uploadFile(file: Buffer, filename: string): Promise<FileInfo> {
    this.ensureInitialized();
    const storageType = this.appConfigService.getStorageType();

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
    if (!this.azureContainerClient) {
      throw new Error('Azure storage not configured');
    }

    const blockBlobClient =
      this.azureContainerClient.getBlockBlobClient(filename);

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
      const uniqueBlockBlobClient =
        this.azureContainerClient.getBlockBlobClient(filename);

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
    const localConfig = this.appConfigService.getLocalStorageConfig();
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
    this.ensureInitialized();
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.getFilesFromAzure();
    } else {
      return this.getFilesFromLocal();
    }
  }

  private async getFilesFromAzure(): Promise<FileInfo[]> {
    if (!this.azureContainerClient) {
      throw new Error('Azure storage not configured');
    }

    const files: FileInfo[] = [];

    for await (const blob of this.azureContainerClient.listBlobsFlat()) {
      files.push({
        filename: blob.name,
        size: blob.properties.contentLength || 0,
        created: blob.properties.createdOn || new Date(),
        modified: blob.properties.lastModified || new Date(),
        url: `${this.azureContainerClient.url}/${blob.name}`,
      });
    }

    return files;
  }

  private getFilesFromLocal(): FileInfo[] {
    const localConfig = this.appConfigService.getLocalStorageConfig();
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
    this.ensureInitialized();
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.downloadFromAzure(filename);
    } else {
      return this.downloadFromLocal(filename);
    }
  }

  private async downloadFromAzure(filename: string): Promise<Buffer> {
    if (!this.azureContainerClient) {
      throw new Error('Azure storage not configured');
    }

    const blockBlobClient =
      this.azureContainerClient.getBlockBlobClient(filename);
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
    const localConfig = this.appConfigService.getLocalStorageConfig();
    const filePath = path.join(localConfig.subfolderPath, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} not found`);
    }

    return fs.readFileSync(filePath);
  }

  async deleteFile(filename: string): Promise<void> {
    this.ensureInitialized();
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure' || storageType === 'emulator') {
      return this.deleteFromAzure(filename);
    } else {
      return this.deleteFromLocal(filename);
    }
  }

  private async deleteFromAzure(filename: string): Promise<void> {
    if (!this.azureContainerClient) {
      throw new Error('Azure storage not configured');
    }

    const blockBlobClient =
      this.azureContainerClient.getBlockBlobClient(filename);
    await blockBlobClient.delete();

    this.logger.logFileOperation('deleted', filename, { storageType: 'azure' });
  }

  private deleteFromLocal(filename: string): void {
    const localConfig = this.appConfigService.getLocalStorageConfig();
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
