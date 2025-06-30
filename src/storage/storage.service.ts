import { Injectable } from '@nestjs/common';
import { AppConfigService } from '../config/config.service';
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

  constructor(private appConfigService: AppConfigService) {
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
          console.log(
            `☁️ Azure container existance assured for: '${container}'`,
          );
        })
        .catch((error) => {
          console.error(
            `❌ Failed to assure Azure container '${container}' exists:`,
            error,
          );
        });
      console.log('🔗 Azure Blob Storage client initialized');
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
      console.log(`⚠️ File already exists in Azure: ${filename}`);

      if (this.storageOptions.safeMode) {
        console.log(`🔄 Safe mode enabled, generating unique name`);
        filename = this.getUniqueFilename(filename);
        console.log(`🔄 Generated unique name: ${filename}`);
      } else {
        throw new Error(`File ${filename} already exists in Azure`);
      }

      // Get new blockBlobClient with unique name
      const uniqueBlockBlobClient =
        this.azureContainerClient.getBlockBlobClient(filename);

      await uniqueBlockBlobClient.upload(file, file.length);

      console.log(`☁️ File uploaded to Azure: ${filename}`);

      return {
        filename,
        size: file.length,
        created: new Date(),
        modified: new Date(),
        url: uniqueBlockBlobClient.url,
      };
    }

    await blockBlobClient.upload(file, file.length);

    console.log(`☁️ File uploaded to Azure: ${filename}`);

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

    console.log(`💾 File uploaded locally: ${filePath}`);

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

    console.log(`🗑️ File deleted from Azure: ${filename}`);
  }

  private deleteFromLocal(filename: string): void {
    const uploadDir = this.appConfigService.getUploadDir();
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new Error(`File ${filename} not found`);
    }

    fs.unlinkSync(filePath);
    console.log(`🗑️ File deleted locally: ${filename}`);
  }
}
