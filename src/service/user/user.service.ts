import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { UserDbService } from '../database/user-db.service';
import { AppConfigService } from '../config/config.service';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthService, User } from '../../auth/auth.service';
import { FileInfo, StorageService } from '../storage/storage.service';

export class UserFileUploadResponse {
  fileInfo: FileInfo;
  fileUrl: string;
}

@Injectable()
export class UserService {
  constructor(
    private readonly logger: LoggerService,
    private readonly userDb: UserDbService,
    private readonly configService: AppConfigService,
    private readonly storageService: StorageService,
    private authService: AuthService,
  ) {}

  async getUserByEmail(email: string): Promise<Partial<UserEntity> | null> {
    const user = await this.userDb.getUserByEmail(email);
    if (!user) return null;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safeUser } = user;
    return safeUser as Partial<UserEntity>;
  }

  async getUserList(): Promise<Partial<UserEntity>[]> {
    const users = await this.userDb.getAllUsers();
    return users.map((user) => {
      const { passwordHash, ...safeUser } = user;
      void passwordHash; // exhaust to avoid linter error
      return safeUser as Partial<UserEntity>;
    });
  }

  // todo: find a place for this function that is "shared"
  // In StorageService or a utility function
  private sanitizeEmailForBlobPath(email: string): string {
    return email
      .toLowerCase()
      .replace(/[^a-z0-9@._-]/g, '_') // Replace special chars with underscore
      .replace(/@/g, '__') // Replace @ with double underscore
      .replace(/\./g, '_'); // Replace dots with underscore
  }

  async uploadFile(
    user: User,
    filename: string,
    fileBuffer: Buffer,
  ): Promise<UserFileUploadResponse> {
    const userEmail = this.sanitizeEmailForBlobPath(user.email);
    const userFileName = `${userEmail}/${filename}`;
    const uploadedFile = await this.storageService.uploadFile(
      fileBuffer,
      userFileName,
    );
    return {
      fileInfo: uploadedFile,
      fileUrl: uploadedFile.url,
    } as UserFileUploadResponse;
  }

  async getUserFileList(user: User): Promise<FileInfo[]> {
    const userEmail = this.sanitizeEmailForBlobPath(user.email);
    const userFileList = await this.storageService.getFiles(userEmail);
    return userFileList;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userDb.deleteUser(userId);
  }
}
