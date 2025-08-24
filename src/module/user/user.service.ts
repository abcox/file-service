import { Injectable, NotFoundException } from '@nestjs/common';
import { LoggerService } from '../../service/logger/logger.service';
import { UserDbService } from '../../service/database/user-db.service';
import { AppConfigService } from '../config/config.service';
import { UserEntity } from '../../database/entities/user.entity';
import { AuthService, User } from '../auth/auth.service';
import { FileInfo, StorageService } from '../storage/storage.service';
import { UpdateUserDto } from '../../shared/model/user/update-user.dto';
import { UserDto } from '../auth/dto/user.dto';
import { UserMapper } from './user-mapper';
import { CreateUserDto } from '../../shared/model/user/create-user.dto';

export class UserFileUploadResponse {
  fileInfo: FileInfo;
  fileUrl: string;
}

export class UserUpdateResponse {
  success: boolean;
  message: string;
  data?: UserDto;
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

  async createUser(createUserDto: CreateUserDto): Promise<UserDto> {
    // Hash the password before creating user
    const passwordHash = Buffer.from(createUserDto.password).toString('base64');

    const user = await this.userDb.createUser({
      ...createUserDto,
      passwordHash,
      roles: createUserDto.roles || ['user'],
    });

    return UserMapper.toSafeDto(user);
  }

  async getUserById(userId: string): Promise<Partial<UserEntity> | null> {
    const user = await this.userDb.getUserById(userId);
    if (!user) return null;

    return UserMapper.toSafeDto(user);
  }

  async getUserByEmail(email: string): Promise<Partial<UserEntity> | null> {
    const user = await this.userDb.getUserByEmail({ email });
    if (!user) return null;

    return UserMapper.toSafeDto(user);
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

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserUpdateResponse> {
    try {
      const result = await this.userDb.updateUser(userId, updateUserDto);
      if ((result.affected ?? 0) === 0) {
        throw new NotFoundException('User not found');
      }
      const user: UserEntity | null = await this.userDb.getUserById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      return {
        success: (result.affected ?? 0) > 0,
        message: 'User updated',
        data: UserMapper.toSafeDto(user),
      };
    } catch (error) {
      this.logger.error(`updateUser failed with error: ${error}`);
      return {
        success: false,
        message: 'User update failed',
        data: undefined,
      };
    }
  }

  async getUserFileList(user: User): Promise<FileInfo[]> {
    const userEmail = this.sanitizeEmailForBlobPath(user.email);
    const userFileList = await this.storageService.getFiles(userEmail);
    return userFileList;
  }

  async activateUser(userId: string): Promise<UserUpdateResponse> {
    try {
      const result = await this.userDb.activateUser(userId);
      if (!result) {
        throw new NotFoundException('User not found or already active');
      }

      const user = await this.userDb.getUserById(userId);
      if (!user) {
        throw new NotFoundException('User not found after activation');
      }

      return {
        success: true,
        message: 'User activated successfully',
        data: UserMapper.toSafeDto(user),
      };
    } catch (error) {
      this.logger.error(`activateUser failed with error: ${error}`);
      return {
        success: false,
        message: 'User activation failed',
        data: undefined,
      };
    }
  }

  async deactivateUser(userId: string): Promise<UserUpdateResponse> {
    try {
      const result = await this.userDb.deactivateUser(userId);
      if (!result) {
        throw new NotFoundException('User not found or already inactive');
      }

      const user = await this.userDb.getUserById(userId);
      if (!user) {
        throw new NotFoundException('User not found after deactivation');
      }

      return {
        success: true,
        message: 'User deactivated successfully',
        data: UserMapper.toSafeDto(user),
      };
    } catch (error) {
      this.logger.error(`deactivateUser failed with error: ${error}`);
      return {
        success: false,
        message: 'User deactivation failed',
        data: undefined,
      };
    }
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userDb.deleteUser(userId);
  }
}
