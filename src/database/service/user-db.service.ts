import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindOptionsOrder,
  FindOptionsWhere,
  //Like,
  Repository,
  UpdateResult,
} from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import { LoggerService } from '../../module/logger/logger.service';
import { UpdateUserDto } from '../../shared/model/user/update-user.dto';
import { UserSearchRequest } from '../../module/auth/dto/user/user-search-request.dto';

export interface UpdatePasswordResetDataDto {
  passwordResetToken: string | null;
  passwordResetTokenExpiresAt: Date | null;
  passwordHash: string | null;
  passwordResetDueBy: Date | null;
  passwordResetFailedAttempts: number | null;
}

@Injectable()
export class UserDbService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private logger: LoggerService,
  ) {}

  async createUser(userData: {
    username: string;
    email: string;
    passwordHash: string;
    name?: string;
    roles?: string[];
    azureObjectId?: string;
    azureTenantId?: string;
    azurePrincipalName?: string;
  }): Promise<UserEntity> {
    const user = this.userRepository.create(userData);
    const savedUser = await this.userRepository.save(user);

    this.logger.info('User created in database', {
      userId: savedUser.id,
      username: savedUser.username,
    });

    return savedUser;
  }

  async getUserById(id: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id, isActive: true },
      relations: ['files'],
    });
  }

  async getUserByUsername(username: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { username, isActive: true },
    });
  }

  async getUserByEmail(option: {
    email: string;
    isActive?: boolean;
  }): Promise<UserEntity | null> {
    const { email, isActive } = option;
    const where: FindOptionsWhere<UserEntity> = { email };
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    return this.userRepository.findOne({
      where,
    });
  }

  async authenticateUser(
    emailOrUsername: string,
    passwordHash: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: [
        { email: emailOrUsername, passwordHash, isActive: true },
        { username: emailOrUsername, passwordHash, isActive: true },
      ],
    });
  }

  async getUserByAzureObjectId(
    azureObjectId: string,
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { azureObjectId, isActive: true },
    });
  }

  async getAllUsers(): Promise<UserEntity[]> {
    return this.userRepository.find({
      //where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async searchUsers(request: UserSearchRequest): Promise<UserEntity[]> {
    const where: FindOptionsWhere<UserEntity> = {};
    if (request?.username) {
      where.username = request.username;
    }
    if (request?.email) {
      where.email = request.email;
    }
    if (request?.isActive !== undefined) {
      where.isActive = request.isActive;
    }
    //if (roles && roles.length > 0) {
    //  if (roles.includes('admin')) {
    //    // For admin role, check the isAdmin boolean property
    //    where.isAdmin = true;
    //  } else {
    //    // simple-array is stored as comma-separated string, use Like for matching
    //    where.roles = Like(`%${request.roles[0]}%`);
    //  }
    //}
    if (request?.isAdmin !== undefined) {
      where.isAdmin = request.isAdmin;
    }
    this.logger.log('Search users with where:', where);
    let order: FindOptionsOrder<UserEntity> = { createdAt: 'DESC' };
    if (request?.sortBy) {
      request.sortBy.forEach((field) => {
        order = { ...order, [field]: 'ASC' };
      });
    }
    return this.userRepository.find({ where, order });
  }

  async updateLastLogin(userId: string): Promise<Date | undefined> {
    const lastLoginDate = new Date();
    const result = await this.userRepository.update(userId, {
      lastLoginAt: lastLoginDate,
      passwordFailedAttempts: 0,
    });
    return (result?.affected ?? 0) > 0 ? lastLoginDate : undefined;
  }

  async updatePasswordAttempts(
    userId: string,
    attempts: number,
  ): Promise<number> {
    const result = await this.userRepository.update(userId, {
      passwordFailedAttempts: attempts,
    });
    return result?.affected ?? 0;
  }

  async updateAccountLockedUntil(
    userId: string,
    lockedUntil: Date,
  ): Promise<number> {
    const result = await this.userRepository.update(userId, {
      accountLockedUntil: lockedUntil,
    });
    return result?.affected ?? 0;
  }

  async activateUser(userId: string): Promise<boolean> {
    const result = await this.userRepository.update(userId, {
      isActive: true,
    });
    return (result?.affected ?? 0) > 0;
  }

  async deactivateUser(userId: string): Promise<boolean> {
    const result = await this.userRepository.update(userId, {
      isActive: false,
    });
    return (result?.affected ?? 0) > 0;
  }

  async makeAdmin(userId: string): Promise<boolean> {
    const result = await this.userRepository.update(userId, { isAdmin: true });
    return (result?.affected ?? 0) > 0;
  }

  async updateUserRoles(userId: string, roles: string[]): Promise<boolean> {
    const result = await this.userRepository.update(userId, { roles });
    return (result?.affected ?? 0) > 0;
  }

  async addRoleToUser(userId: string, role: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    const updatedRoles = [...new Set([...user.roles, role])];
    return this.updateUserRoles(userId, updatedRoles);
  }

  async removeRoleFromUser(userId: string, role: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    const updatedRoles = user.roles.filter((r) => r !== role);
    return this.updateUserRoles(userId, updatedRoles);
  }

  async hasRole(userId: string, role: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user?.roles.includes(role) || false;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.userRepository.delete(userId);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    const result: UpdateResult = await this.userRepository.update(
      userId,
      updateUserDto,
    );
    return result;
  }

  async updatePasswordResetData(
    userId: string,
    resetData: UpdatePasswordResetDataDto,
  ): Promise<number> {
    // Transform null values to undefined for TypeORM compatibility
    const partialEntity: Partial<UserEntity> = {
      passwordResetToken: resetData?.passwordResetToken ?? undefined,
      passwordResetExpires: resetData?.passwordResetTokenExpiresAt ?? undefined,
      passwordHash: resetData?.passwordHash ?? undefined,
      passwordResetDueBy: resetData?.passwordResetDueBy ?? undefined,
      passwordResetFailedAttempts:
        resetData?.passwordResetFailedAttempts ?? undefined,
    };

    const result = await this.userRepository.update(userId, partialEntity);
    return result?.affected ?? 0;
  }

  async updatePasswordResetFailedAttempts(
    userId: string,
    attempts: number,
  ): Promise<number> {
    const result = await this.userRepository.update(userId, {
      passwordResetFailedAttempts: attempts,
    });
    return result?.affected ?? 0;
  }
}
