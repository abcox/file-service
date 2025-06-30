import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
import { LoggerService } from '../logging/logger.service';
import * as fs from 'fs';
import * as path from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { StorageOptions } from '../config/config.interface';

export interface FileInfo {
  filename: string;
  size: number;
  created: Date;
  modified: Date;
  url?: string;
}

@Injectable()
export class StorageService {
  private azureContainerClient?: ContainerClient;
  private storageOptions: StorageOptions;

  constructor(
    private appConfigService: AppConfigService,
    private logger: LoggerService,
  ) {
    this.initializeAzureClient();
    this.storageOptions = this.appConfigService.getStorageOptions();
  }

  private initializeAzureClient(): void {
    const storageConfig = this.appConfigService.getStorageConfig();

    if (
      storageConfig.type === 'azure' &&
      storageConfig.azure.connectionString
    ) {
      const { connectionString, container } = storageConfig.azure;
      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
      this.azureContainerClient =
        blobServiceClient.getContainerClient(container);
      // Ensure container exists
      this.azureContainerClient
        .createIfNotExists()
        .then(() => {
          this.logger.info('Azure container ensured', { container });
        })
        .catch((error) => {
          this.logger.error('Failed to ensure Azure container', error, {
            container,
          });
        });
      this.logger.info('Azure Blob Storage client initialized', { container });
    }
  }

  async uploadFile(file: Buffer, filename: string): Promise<FileInfo> {
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure') {
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
    const uploadDir = this.appConfigService.getUploadDir();
    const filePath = path.join(uploadDir, filename);

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
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure') {
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
    const uploadDir = this.appConfigService.getUploadDir();

    if (!fs.existsSync(uploadDir)) {
      return [];
    }

    const files = fs.readdirSync(uploadDir);
    return files.map((filename) => {
      const filePath = path.join(uploadDir, filename);
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
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure') {
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
    const uploadDir = this.appConfigService.getUploadDir();
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} not found`);
    }

    return fs.readFileSync(filePath);
  }

  async deleteFile(filename: string): Promise<void> {
    const storageType = this.appConfigService.getStorageType();

    if (storageType === 'azure') {
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
    const uploadDir = this.appConfigService.getUploadDir();
    const filePath = path.join(uploadDir, filename);

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
