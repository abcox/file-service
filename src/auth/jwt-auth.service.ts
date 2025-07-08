import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { LoggerService } from '../service/logger/logger.service';
import { AppConfigService } from '../service/config/config.service';
import { AppConfig } from '../service/config/config.interface';

interface JwtPayload {
  sub: string;
  type: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtAuthService {
  private config: AppConfig;

  constructor(
    private jwtService: NestJwtService,
    private logger: LoggerService,
    private configService: AppConfigService,
  ) {}

  setConfig(config: AppConfig) {
    this.config = config;
  }

  generateToken(subject: string): string {
    try {
      const config = this.configService.getConfig();
      const secret = config?.auth?.secret;

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
        type: 'api-access',
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

  validateToken(token: string): JwtPayload | null {
    try {
      const config = this.configService.getConfig();
      const secret = config?.auth?.secret;

      if (!secret) {
        this.logger.warn('JWT secret not found in config');
        return null;
      }

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

      const payload = this.jwtService.verify<JwtPayload>(token);

      // Additional validation
      if (payload.type !== 'api-access') {
        this.logger.warn('Invalid token type', { type: payload.type });
        return null;
      }

      this.logger.debug('JWT token validated successfully', {
        subject: payload.sub,
        expiresAt: new Date(payload.exp * 1000).toISOString(),
      });

      return payload;
    } catch (error) {
      this.logger.warn('JWT token validation failed', error as Error);
      return null;
    }
  }

  isTokenExpired(payload: JwtPayload): boolean {
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }
}
