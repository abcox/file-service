import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AppConfigService } from '../config/config.service';
import { StorageService } from '../storage/storage.service';
import { LoggerService } from '../logger/logger.service';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Injectable()
export class AppService {
  constructor(
    private appConfigService: AppConfigService,
    private storageService: StorageService,
    private logger: LoggerService,
  ) {
    this.logger.info('AppService constructor called - logging is working!');
  }

  onModuleInit() {
    this.logger.info('[AppService init] App config', {
      //storageType: this.appConfigService.getConfig(),
    });
  }

  getAppInfo(): string {
    const appInfo = this.appConfigService.getConfig().info.name;
    this.logger.debug(`App info: ${appInfo}`);
    return appInfo;
  }

  async uploadFile(file: UploadedFile) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    try {
      const fileInfo = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
      );

      return {
        message: 'File uploaded successfully',
        filename: fileInfo.filename,
        size: fileInfo.size,
        mimetype: file.mimetype,
        url: fileInfo.url,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return {
          error: 'File already exists',
          message: `A file named "${file.originalname}" already exists. Please use a different name or enable safe mode to generate unique names.`,
          filename: file.originalname,
          statusCode: 409,
        };
      }
      throw error; // Re-throw other errors
    }
  }

  async getFiles() {
    const files = await this.storageService.getFiles();
    this.logger.info('Files retrieved', { count: files.length });
    return {
      files: files,
      count: files.length,
    };
  }

  async downloadFile(filename: string, res: Response, downloadAs?: string) {
    try {
      const fileBuffer = await this.storageService.downloadFile(filename);

      // Use downloadAs if provided, otherwise use original filename
      const downloadFilename = downloadAs || filename;

      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadFilename}"`,
      );
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileBuffer.length.toString());

      res.send(fileBuffer);
    } catch {
      throw new NotFoundException(`File ${filename} not found`);
    }
  }

  async deleteFile(filename: string) {
    await this.storageService.deleteFile(filename);

    return {
      message: `File ${filename} deleted successfully`,
    };
  }
}
