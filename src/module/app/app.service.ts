import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { AppConfigService } from '../config/config.service';
import { StorageService } from '../storage/storage.service';
import { LoggerService } from '../logger/logger.service';
import { readAssetFile } from '../../shared/util';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

interface AppInfo {
  name: string;
  description?: string;
  version?: string;
}

const APP_INFO_TEMPLATE_FILENAME = 'app-info.html';
const APP_INFO_TEMPLATE_SUBFOLDER = 'templates';

const APP_INFO_TEMPLATE_FALLBACK = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{name}}</title>
</head>
<body style="background:#0f1115;color:#e7edf5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
  <main>
    {{logoSvg}}
    <h1>{{name}}</h1>
    <p>{{description}}</p>
    <p>Version: {{version}}</p>
    <p>Status: {{status}}</p>
    <p>Updated: {{timestamp}}</p>
    <p><a href="/api" style="color:#9cb4ff;">View API Docs</a></p>
  </main>
</body>
</html>`;

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

  getAppInfo(): AppInfo {
    const { name, description, version } =
      this.appConfigService.getConfig().info;
    const appInfo: AppInfo = { name, description, version };
    this.logger.debug('App info loaded', { appInfo });
    return appInfo;
  }

  generateAppInfoHtml(appInfo: AppInfo): string {
    const { name, description, version } = appInfo;
    const timestamp = new Date().toISOString();
    const logoSvg = readAssetFile('images/vorba-logo.svg') || '';
    const template =
      readAssetFile(APP_INFO_TEMPLATE_FILENAME, APP_INFO_TEMPLATE_SUBFOLDER) ||
      APP_INFO_TEMPLATE_FALLBACK;

    return this.renderTemplate(template, {
      '{{name}}': this.escapeHtml(name),
      '{{description}}': this.escapeHtml(description || 'Service running.'),
      '{{version}}': this.escapeHtml(version || 'unknown'),
      '{{timestamp}}': this.escapeHtml(timestamp),
      '{{status}}': 'Operational',
      '{{logoSvg}}': logoSvg,
    });
  }

  private renderTemplate(
    template: string,
    replacements: Record<string, string>,
  ): string {
    return Object.entries(replacements).reduce(
      (result, [placeholder, value]) => result.split(placeholder).join(value),
      template,
    );
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
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
