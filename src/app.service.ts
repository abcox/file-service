import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

interface UploadedFile {
  originalname: string;
  buffer: Buffer;
  size: number;
  mimetype: string;
}

@Injectable()
export class AppService {
  private readonly uploadDir = 'uploads';

  constructor() {
    console.log('🚀 AppService constructor called - logging is working!');
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  getHello(): string {
    console.log('👋 getHello method called');
    return 'Hello World!';
  }

  uploadFile(file: UploadedFile) {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const filename = file.originalname;
    const filePath = path.join(this.uploadDir, filename);

    // Write file to disk
    fs.writeFileSync(filePath, file.buffer);

    return {
      message: 'File uploaded successfully',
      filename: filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  getFiles() {
    console.log(`uploadDir`, this.uploadDir);
    const files = fs.readdirSync(this.uploadDir);
    const fileList = files.map((filename) => {
      const filePath = path.join(this.uploadDir, filename);
      console.log(`filePath`, filePath);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    });

    return {
      files: fileList,
      count: fileList.length,
    };
  }

  downloadFile(filename: string, res: Response) {
    const filePath = path.join(this.uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File ${filename} not found`);
    }

    const fileStream = fs.createReadStream(filePath);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    return fileStream.pipe(res);
  }

  deleteFile(filename: string) {
    const filePath = path.join(this.uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException(`File ${filename} not found`);
    }

    fs.unlinkSync(filePath);

    return {
      message: `File ${filename} deleted successfully`,
    };
  }
}
