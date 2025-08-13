import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { LoggerService } from '../service/logger/logger.service';
import { AppConfigService } from '../service/config/config.service';
import { AppConfig } from '../service/config/config.interface';
import { UserEntity } from '../database/entities/user.entity';
import { UserLoginRequest } from './dto/user-login.request';
import { UserLoginResponse } from './dto/user-login.response';
import { ActivityConfigDto } from './dto/activity-config.dto';
import { UserRegistrationRequest } from './dto/user-registration.request';
import { UserRegistrationResponse } from './dto/user-registration.response';
import { UserDbService } from '../service/database/user-db.service';
import { UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

interface JwtPayload {
  sub: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
  email?: string;
  roles?: string[];
  jti?: string; // JWT ID for refresh token tracking
}

export interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_SESSION_DURATION_SECONDS = 3600;
const DEFAULT_REFRESH_TOKEN_DURATION_SECONDS = 604800;

@Injectable()
export class AuthService {
  private config: AppConfig;
  private user: User;
  private refreshTokens = new Map<string, string>(); // userId -> refreshTokenHash

  constructor(
    private jwtService: NestJwtService,
    private logger: LoggerService,
    private configService: AppConfigService,
    private userDb: UserDbService,
  ) {}

  setConfig(config: AppConfig) {
    this.config = config;
  }

  //#region Public methods

  // TODO:
  // 1. add password hashing
  // 2. add password verification
  // 3. add password reset
  // 4. add password change
  // 5. add password forgot
  // 6. add password verify

  // TODO:
  // 1. add user creation (register or refer)
  // 2. email referral - sends email with link to funnel > register
  // 3. admin: lock user account: temp or permanent

  async login(request: UserLoginRequest): Promise<UserLoginResponse> {
    /* this.logger.log('Logging in user', {
      email: request.email,
      password: request.password,
    }); */
    const user: UserEntity | null = await this.userDb.getUserByEmail(
      request.email,
    );
    if (!user) {
      return {
        success: false,
        message: 'User not found',
        token: '',
        refreshToken: '',
        tokenExpiry: 0,
        sessionDurationSeconds: 0,
        activityConfig: null,
        user: null,
      } as UserLoginResponse;
    }
    // TODO: implement account lockout strategy as 5 tries before lockout for 1 hour?
    const accountLocked =
      user.accountLockedUntil && user?.accountLockedUntil > new Date();
    if (!user.isActive || accountLocked) {
      return {
        success: false,
        message: 'User invalid; contact support',
        token: '',
        refreshToken: '',
        tokenExpiry: 0,
        sessionDurationSeconds: 0,
        activityConfig: null,
        user: null,
      } as UserLoginResponse;
    }
    const response = await this.validatePassword(user, request.password);
    if (!response.success) {
      return response;
    }
    const userWithUpdatedRoles = this.getUserWithUpdatedRoles(user);
    const tokenPair = await this.generateTokenPair(userWithUpdatedRoles);
    const lastLoginDate = await this.userDb.updateLastLogin(user.id);

    // Get session duration from config
    const config = this.configService.getConfig();
    const sessionDuration =
      config?.auth?.session?.accessTokenDurationSeconds ||
      DEFAULT_SESSION_DURATION_SECONDS;

    // Calculate token expiry
    const tokenExpiry = Math.floor(Date.now() / 1000) + sessionDuration;

    return {
      success: true,
      message: 'User logged in successfully',
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenExpiry: tokenExpiry,
      sessionDurationSeconds: sessionDuration,
      activityConfig: this.getActivityConfig(),
      user: {
        ...userWithUpdatedRoles,
        lastLoginAt: lastLoginDate ?? user.lastLoginAt,
      },
    } as UserLoginResponse;
  }

  getUserWithUpdatedRoles(user: UserEntity): UserEntity {
    if (user.roles.includes('admin') || user.isAdmin) {
      user.isAdmin = true;
      user.roles = ['admin'];
    }
    return user;
  }

  async validatePassword(
    user: UserEntity,
    password: string,
  ): Promise<UserLoginResponse> {
    if (user.passwordHash !== password) {
      const failedAttempts = await this.userDb.updatePasswordAttempts(
        user.id,
        (user.passwordFailedAttempts ?? 0) + 1,
      );
      if (failedAttempts >= 5) {
        // Progressive lockout: 15 mins for 5 failed attempts, 30 mins for 6 failed attempts, etc.
        const lockoutDuration =
          failedAttempts > 10
            ? 1000 * 60 * 60 * 24 // 1 day
            : 1000 * 60 * 15 * (failedAttempts - 4); // 15 mins, 30 mins, 1 hour, 2 hours, 4 hours, 8 hours
        const lockoutUntil = new Date(Date.now() + lockoutDuration);
        await this.userDb.updateAccountLockedUntil(user.id, lockoutUntil);
        return {
          success: false,
          message: `Account locked until ${lockoutUntil.toLocaleString()}; contact support`,
          token: '',
          refreshToken: '',
          tokenExpiry: 0,
          sessionDurationSeconds: 0,
          activityConfig: null,
          user: null,
        } as UserLoginResponse;
      }
      return {
        success: false,
        message: 'Invalid password',
        token: '',
        refreshToken: '',
        tokenExpiry: 0,
        sessionDurationSeconds: 0,
        activityConfig: null,
        user: null,
      } as UserLoginResponse;
    }
    return {
      success: true,
      message: 'Password validated',
      token: '',
      refreshToken: '',
      tokenExpiry: 0,
      sessionDurationSeconds: 0,
      activityConfig: this.getActivityConfig(),
      user: user,
    } as UserLoginResponse;
  }

  async passwordReset(email: string, token?: string): Promise<string | null> {
    // TODO: implement password reset to send email with link to reset
    // 1. get user by email
    // 2. if user does not exist, return error (404), otherwise
    // 3. if token invalid or expired or not for email, return error (401), otherwise

    // 4a  if token not provided:
    // 4b. generate password reset token that expires in 1 hour
    // 4c. update db with token
    // 4d. send email with link to reset password (with token)
    // 4e. return token

    // 5a. if provided token is valid, is for email, and not expired, then
    // 5b. update user password
    // 5c. return success (login token --> so client can navigate to login page, and user can have "logged in" experience)

    void email;
    void token;
    return new Promise((resolve) => {
      resolve(null);
    });
  }

  async register(
    request: UserRegistrationRequest,
  ): Promise<UserRegistrationResponse> {
    this.logger.log('Registering user');

    // Check if user already exists
    const existingUser = await this.userDb.getUserByEmail(request.email);
    if (existingUser) {
      const tokenPair = await this.generateTokenPair(existingUser);

      // Get session duration from config
      const config = this.configService.getConfig();
      const sessionDuration =
        config?.auth?.session?.accessTokenDurationSeconds ||
        DEFAULT_SESSION_DURATION_SECONDS;
      const tokenExpiry = Math.floor(Date.now() / 1000) + sessionDuration;

      return {
        user: existingUser,
        success: true,
        message: 'User already exists',
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        tokenExpiry: tokenExpiry,
        sessionDurationSeconds: sessionDuration,
        activityConfig: this.getActivityConfig(),
      } as UserRegistrationResponse;
    }

    const passwordHash = request.email; // TODO:  this is a temporary solution to avoid hashing the password (using bcrypt)
    const user = {
      email: request.email,
      passwordHash: passwordHash,
      name: request.name,
      roles: ['guest'],
      username: request.email,
    } as UserEntity;

    // Create user in database
    const createdUser: UserEntity = await this.userDb.createUser(user);

    // Generate JWT token pair
    const tokenPair = await this.generateTokenPair(createdUser);

    // Get session duration from config
    const config = this.configService.getConfig();
    const sessionDuration =
      config?.auth?.session?.accessTokenDurationSeconds ||
      DEFAULT_SESSION_DURATION_SECONDS;
    const tokenExpiry = Math.floor(Date.now() / 1000) + sessionDuration;

    return {
      user: createdUser,
      success: true,
      message: 'User registered successfully',
      token: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      tokenExpiry: tokenExpiry,
      sessionDurationSeconds: sessionDuration,
      activityConfig: this.getActivityConfig(),
    } as UserRegistrationResponse;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(
        refreshToken,
      ) as unknown as JwtPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token type');
      }

      // Verify refresh token is still valid in memory
      const storedTokenHash = this.refreshTokens.get(payload.sub);
      const providedTokenHash = this.hashToken(refreshToken);

      if (!storedTokenHash || storedTokenHash !== providedTokenHash) {
        throw new UnauthorizedException('Refresh token revoked or invalid');
      }

      // Get user and generate new token pair
      const user = await this.userDb.getUserById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokenPair = await this.generateTokenPair(user);

      return { accessToken: tokenPair.accessToken };
    } catch (error) {
      this.logger.warn('Token refresh failed', error as Error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  revokeRefreshToken(userId: string): void {
    this.refreshTokens.delete(userId);
  }

  //#endregion

  generateToken(subject: string): string {
    try {
      const config = this.configService.getConfig();
      const secret = config?.auth?.session?.secret;

      if (!secret) {
        this.logger.error('JWT secret not found in config');
        throw new Error('JWT secret not available');
      }

      // Log secret details (first and last 5 characters)
      const secretLength = secret.length;
      const secretPreview =
        secretLength > 10
          ? `${secret.substring(0, 5)}...${secret.substring(secretLength - 5)}`
          : secret;

      this.logger.debug('Using JWT secret for token generation', {
        secretLength,
        secretPreview,
      });

      const payload: JwtPayload = {
        sub: subject,
        type: 'access',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
      };

      const token = this.jwtService.sign(payload);

      this.logger.debug('JWT token generated successfully', {
        subject,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      });

      return token;
    } catch (error) {
      this.logger.error('Failed to generate JWT token', error as Error);
      throw error;
    }
  }

  async generateTokenPair(user: UserEntity): Promise<TokenPair> {
    const config = this.configService.getConfig();
    const secret = config?.auth?.session?.secret;
    if (!secret) {
      throw new Error('JWT secret is not configured');
    }

    // Get session duration from config with defaults
    const sessionDuration =
      config?.auth?.session?.accessTokenDurationSeconds ||
      DEFAULT_SESSION_DURATION_SECONDS;
    const refreshTokenDuration =
      config?.auth?.session?.refreshTokenDurationSeconds ||
      DEFAULT_REFRESH_TOKEN_DURATION_SECONDS;

    // Generate access token with configured duration
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'access',
        email: user.email,
        iat: Math.floor(Date.now() / 1000),
        id: user.id,
        name: user.name,
        roles: user.roles,
      },
      {
        secret: secret,
        expiresIn: `${sessionDuration}s`,
      },
    );

    // Generate refresh token with configured duration
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh',
        jti: crypto.randomUUID(),
        iat: Math.floor(Date.now() / 1000),
      },
      {
        secret: secret,
        expiresIn: `${refreshTokenDuration}s`,
      },
    );

    // Store refresh token hash for validation
    this.refreshTokens.set(user.id, this.hashToken(refreshToken));

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  validateToken(token: string): JwtPayload | null {
    try {
      const config = this.configService.getConfig();
      const secret = config?.auth?.session?.secret;

      if (!secret) {
        this.logger.warn('JWT secret not found in config');
        return null;
      }
      this.logger.info('Validating JWT token (preview)', {
        token:
          token.substring(0, 8) + '...' + token.substring(token.length - 8),
        tokenLength: token.length,
      });

      // Log secret details (first and last 5 characters)
      const secretLength = secret.length;
      const secretPreview =
        secretLength > 10
          ? `${secret.substring(0, 5)}...${secret.substring(secretLength - 5)}`
          : secret;

      this.logger.info('Using JWT secret for token validation', {
        secretLength,
        secretPreview,
        encoding: 'utf8',
        byteLength: Buffer.byteLength(secret, 'utf8'),
        hexPreview:
          Buffer.from(secret).toString('hex').substring(0, 20) + '...',
        //fullSecret: secret, // Full secret for debugging
        //fullToken: token, // Full token for debugging
      });

      //const payload = this.jwtService.verify<JwtPayload>(token);
      const payload = this.jwtService.decode<JwtPayload>(token);
      this.logger.info('JWT token payload', { payload });

      if (this.isTokenExpired(payload)) {
        this.logger.warn('JWT token expired');
        return null;
      }

      // Additional validation
      /* if (payload.type !== 'api-access') {
        this.logger.warn('Invalid token type', { type: payload.type });
        return null;
      } */

      this.logger.debug('JWT token validated successfully', {
        subject: payload.sub,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      });

      // TODO: review this because it appears like dead code
      this.setUser(payload);

      return payload;
    } catch (error) {
      this.logger.warn('JWT token validation failed', error as Error);
      return null;
    }
  }

  // TODO: review this because it appears like dead code
  setUser(payload: JwtPayload) {
    this.user = {
      id: payload.sub,
      name: payload.sub,
      email: payload.email || '',
      roles: payload?.roles || ['guest'],
    };
  }

  // TODO: review this because it appears like dead code
  getUser(): User {
    return this.user;
  }

  isTokenExpired(payload: JwtPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  // Helper methods for activity configuration
  private getActivityConfig(): ActivityConfigDto {
    const config = this.configService.getConfig();
    const activityConfig = config?.auth?.session?.activityConfig;

    return {
      warningBeforeTokenExpiry:
        activityConfig?.warningBeforeTokenExpiryMs || 300000, // 5 minutes
      refreshBeforeTokenExpiry:
        activityConfig?.refreshBeforeTokenExpiryMs || 600000, // 10 minutes
      activityTimeoutMultiplier:
        activityConfig?.activityTimeoutMultiplier || 0.8, // 80%
    };
  }
}
