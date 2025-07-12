import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { UserDbService } from '../database/user-db.service';
import { AppConfigService } from '../config/config.service';
import { JwtAuthService } from '../../auth/jwt-auth.service';
import { UserEntity } from '../../database/entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    private readonly logger: LoggerService,
    private readonly userDb: UserDbService,
    private readonly jwtAuthService: JwtAuthService,
    private readonly configService: AppConfigService,
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
}
