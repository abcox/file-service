import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, UpdateResult } from 'typeorm';
import { FileEntity } from '../../database/entities/file.entity';
import { LoggerService } from '../../module/logger/logger.service';

@Injectable()
export class FileDbService {
  constructor(
    @InjectRepository(FileEntity)
    private fileRepository: Repository<FileEntity>,
    private logger: LoggerService,
  ) {}

  //#region File operations
  async createFileRecord(fileData: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    description?: string;
    tags?: string;
  }): Promise<FileEntity> {
    const fileRecord = this.fileRepository.create(fileData);
    const savedFile = await this.fileRepository.save(fileRecord);

    this.logger.info('File record created in database', {
      fileId: savedFile.id,
      filename: savedFile.filename,
    });

    return savedFile;
  }

  async getFileById(id: string): Promise<FileEntity | null> {
    return this.fileRepository.findOne({ where: { id, isActive: true } });
  }

  async getFileByFilename(filename: string): Promise<FileEntity | null> {
    return this.fileRepository.findOne({ where: { filename, isActive: true } });
  }

  async getAllFiles(): Promise<FileEntity[]> {
    return this.fileRepository.find({
      where: { isActive: true },
      order: { uploadedAt: 'DESC' },
    });
  }

  async deleteFile(id: string): Promise<boolean> {
    const result: UpdateResult = await this.fileRepository.update(id, {
      isActive: false,
    });
    return (result?.affected ?? 0) > 0;
  }

  async updateFileDescription(
    id: string,
    description: string,
  ): Promise<boolean> {
    const result = await this.fileRepository.update(id, { description });
    return (result?.affected ?? 0) > 0;
  }
  //#endregion
}
