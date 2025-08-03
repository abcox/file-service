import { UserDto } from '../../auth/dto/user.dto';
import { UserEntity } from '../../database/entities/user.entity';

// shared/utils/user-mapper.ts
export class UserMapper {
  static toDto(entity: UserEntity): UserDto {
    return {
      id: entity.id,
      username: entity.username,
      email: entity.email,
      name: entity.name,
      isActive: entity.isActive,
      isAdmin: entity.isAdmin,
      roles: entity.roles,
      lastLoginAt: entity.lastLoginAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toSafeDto(entity: UserEntity): UserDto {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, passwordResetToken, azureObjectId, ...safeEntity } =
      entity;
    return this.toDto(safeEntity as UserEntity);
  }
}
