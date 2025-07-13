import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { LoggerService } from '../logger/logger.service';

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
    displayName?: string;
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

  async getUserByEmail(email: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { email, isActive: true },
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
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async updateLastLogin(userId: string): Promise<Date | undefined> {
    const lastLoginDate = new Date();
    const result = await this.userRepository.update(userId, {
      lastLoginAt: lastLoginDate,
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
}
