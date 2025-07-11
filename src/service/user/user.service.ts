import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { UserEntity } from '../../database/entities/user.entity';
import { UserDbService } from '../database/user-db.service';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../config/config.service';

export class UserRegistrationRequest {
  email: string;
  password: string;
  name: string;
  username: string;
}

export interface UserRegistrationResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserEntity;
}

@Injectable()
export class RegistrationService {
  constructor(
    private readonly logger: LoggerService,
    private readonly userDb: UserDbService,
    private readonly jwtService: JwtService,
    private readonly configService: AppConfigService,
  ) {}

  async register(
    request: UserRegistrationRequest,
  ): Promise<UserRegistrationResponse> {
    this.logger.log('Registering user');

    // Check if user already exists
    const existingUser = await this.userDb.getUserByEmail(request.email);
    if (existingUser) {
      return {
        user: existingUser,
        success: false,
        message: 'User already exists',
        token: '',
      };
    }

    const user = {
      email: request.email,
      passwordHash: request.password,
      name: request.name,
      roles: ['guest'],
      username: request.email,
    } as UserEntity;

    // Create user in database
    const createdUser: UserEntity = await this.userDb.createUser(user);

    // Generate JWT token
    const jwtToken = await this.generateJwtToken(createdUser);

    return {
      user: createdUser,
      success: true,
      message: 'User registered successfully',
      token: jwtToken,
    };
  }

  private async generateJwtToken(user: UserEntity): Promise<string> {
    const config = this.configService.getConfig();
    const secret = config?.auth?.secret;
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }
    const jwtToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        type: 'api-access',
        id: user.id,
        name: user.name,
        roles: user.roles,
      },
      {
        secret: secret,
      },
    );
    return jwtToken;
  }
}
