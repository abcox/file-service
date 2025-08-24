import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
  //UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoggerService } from '../../service/logger/logger.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AppConfigService } from '../../service/config/config.service';

// Define proper interfaces for JWT payload
interface BaseJwtPayload {
  sub: string;
  type: string;
  iat: number;
  exp: number;
}

interface ExtendedJwtPayload extends BaseJwtPayload {
  aud?: string | string[];
  roles?: string[];
  role?: string | string[];
  [key: string]: any; // Allow additional custom claims
}

// Single Auth decorator with options
export interface AuthGuardOptions {
  public?: boolean;
  roles?: string[];
  claims?: Record<string, any>;
  audience?: string;
}

export const AUTH_GUARD_KEY = 'authGuard';
export const AuthGuard = (options: AuthGuardOptions = {}) =>
  SetMetadata(AUTH_GUARD_KEY, options);

// Create a decorator that applies both @Auth() and @ApiBearerAuth()
export const Auth = (options: AuthGuardOptions = {}) => {
  return applyDecorators(
    AuthGuard(options),
    //UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
  );
};

export interface AuthConfig {
  enabled: boolean;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private config: AuthConfig;

  constructor(
    private authService: AuthService,
    private logger: LoggerService,
    private configService: AppConfigService,
  ) {
    this.config = this.configService.getConfig().auth as AuthConfig;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private checkAudience(
    payload: ExtendedJwtPayload,
    requiredAudience?: string,
  ): boolean {
    if (!requiredAudience) return true;

    const payloadAudience = payload.aud;
    if (!payloadAudience) return false;

    if (Array.isArray(payloadAudience)) {
      return payloadAudience.includes(requiredAudience);
    }
    return payloadAudience === requiredAudience;
  }

  private checkRoles(
    payload: ExtendedJwtPayload,
    requiredRoles?: string[],
  ): boolean {
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const userRoles = payload.roles || payload.role || [];
    const roles = Array.isArray(userRoles) ? userRoles : [userRoles];

    return requiredRoles.some((requiredRole) => roles.includes(requiredRole));
  }

  private checkClaims(
    payload: ExtendedJwtPayload,
    requiredClaims?: Record<string, any>,
  ): boolean {
    if (!requiredClaims) return true;

    return Object.entries(requiredClaims).every(([key, value]) => {
      return payload[key] === value;
    });
  }

  canActivate(context: ExecutionContext): boolean {
    console.log('🔐 JwtAuthGuard: canActivate called');

    if (!this.config.enabled) {
      console.log('⚠️ JwtAuthGuard: Auth disabled, skipping authentication');
      this.logger.warn('Auth disabled, skipping authentication');
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    //console.log('🔐 JwtAuthGuard: request:', request);

    // Get auth options from decorator
    const AuthGuardOptions = Reflect.getMetadata(AUTH_GUARD_KEY, handler) as
      | AuthGuardOptions
      | undefined;

    console.log('🔐 JwtAuthGuard: AuthGuardOptions:', AuthGuardOptions);

    // Check if route is public
    if (AuthGuardOptions?.public) {
      console.log('🔐 JwtAuthGuard: Route is public, allowing access');
      return true;
    }

    console.log('🔐 JwtAuthGuard: Route requires authentication');
    const token = this.extractTokenFromHeader(request);
    console.log(
      '🔐 JwtAuthGuard: Extracted token:',
      token ? `${token.substring(0, 20)}...` : 'No token',
    );

    if (!token) {
      this.logger.warn('Auth token missing', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      });
      return false;
    }

    console.log('🔐 JwtAuthGuard: Validating token...');
    const basePayload = this.authService.validateToken(token);
    console.log(
      '🔐 JwtAuthGuard: Token validation result:',
      basePayload ? 'SUCCESS' : 'FAILED',
    );

    if (!basePayload) {
      console.log('❌ JwtAuthGuard: Auth token invalid');
      this.logger.warn('Auth token invalid', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        providedToken: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`,
      });
      return false;
    }

    if (this.authService.isTokenExpired(basePayload)) {
      this.logger.warn('Auth token expired', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        subject: basePayload.sub,
        expiredAt: new Date(basePayload.exp * 1000).toISOString(),
      });
      return false;
    }

    // Cast to extended payload for additional claims
    const payload = basePayload as ExtendedJwtPayload;

    // Debug: Log the decoded token payload
    this.logger.debug('JWT Token decoded successfully', {
      subject: payload.sub,
      id: (payload as Record<string, any>).id as string,
      roles: (payload as Record<string, any>).roles as string[],
      aud: payload.aud,
      exp: new Date(payload.exp * 1000).toISOString(),
      fullPayload: payload,
    });

    // Check required audience
    if (
      AuthGuardOptions?.audience &&
      !this.checkAudience(payload, AuthGuardOptions.audience)
    ) {
      this.logger.warn('Auth audience invalid', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        subject: payload.sub,
        requiredAudience: AuthGuardOptions.audience,
        tokenAudience: payload.aud,
      });
      return false;
    }

    // Check required roles
    if (AuthGuardOptions?.roles) {
      // Debug: Log the required roles being checked
      this.logger.debug('Checking required roles', {
        requiredRoles: AuthGuardOptions.roles,
        tokenRoles: payload.roles || payload.role,
        subject: payload.sub,
      });

      if (!this.checkRoles(payload, AuthGuardOptions.roles)) {
        this.logger.warn('Auth roles invalid', {
          ip: request.ip,
          userAgent: request.get('User-Agent'),
          subject: payload.sub,
          requiredRoles: AuthGuardOptions.roles,
          tokenRoles: payload.roles || payload.role,
        });
        return false;
      }
    }

    // Check required claims
    const hasClaims = this.checkClaims(payload, AuthGuardOptions?.claims);
    if (AuthGuardOptions?.claims && !hasClaims) {
      /* this.logger.warn('Auth claims invalid', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        subject: payload.sub,
        requiredClaims: AuthGuardOptions.claims,
        tokenClaims: payload,
      }); */
      return false;
    }

    // Attach the payload to the request for use in controllers
    console.log('🔐 JwtAuthGuard: Setting request.user with payload:', {
      id: (payload as Record<string, any>).id as string,
      sub: payload.sub,
      email: (payload as Record<string, any>).email as string,
      roles: (payload as Record<string, any>).roles as string[],
    });

    (request as Record<string, any>).user = payload;
    console.log('✅ JwtAuthGuard: Authentication successful, request.user set');
    return true;
  }
}
