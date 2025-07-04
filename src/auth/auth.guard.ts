import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
  applyDecorators,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthService } from './jwt.service';
import { LoggerService } from '../logging/logger.service';
import { ApiBearerAuth } from '@nestjs/swagger';

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
export interface AuthOptions {
  public?: boolean;
  roles?: string[];
  claims?: Record<string, any>;
  audience?: string;
}

export const AUTH_GUARD_KEY = 'authGuard';
export const AuthGuard = (options: AuthOptions = {}) =>
  SetMetadata(AUTH_GUARD_KEY, options);

// Create a decorator that applies both @Auth() and @ApiBearerAuth()
export const Auth = (options: AuthOptions = {}) => {
  return applyDecorators(AuthGuard(options), ApiBearerAuth());
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtAuthService: JwtAuthService,
    private logger: LoggerService,
  ) {}

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
    const request = context.switchToHttp().getRequest<Request>();
    const handler = context.getHandler();

    // Get auth options from decorator
    const authOptions = Reflect.getMetadata(AUTH_GUARD_KEY, handler) as
      | AuthOptions
      | undefined;

    // Check if route is public
    if (authOptions?.public) {
      return true;
    }

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('Auth token missing', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      });
      return false;
    }

    const basePayload = this.jwtAuthService.validateToken(token);
    if (!basePayload) {
      this.logger.warn('Auth token invalid', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        providedToken: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`,
      });
      return false;
    }

    if (this.jwtAuthService.isTokenExpired(basePayload)) {
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
      authOptions?.audience &&
      !this.checkAudience(payload, authOptions.audience)
    ) {
      this.logger.warn('Auth audience invalid', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        subject: payload.sub,
        requiredAudience: authOptions.audience,
        tokenAudience: payload.aud,
      });
      return false;
    }

    // Check required roles
    if (authOptions?.roles) {
      // Debug: Log the required roles being checked
      this.logger.debug('Checking required roles', {
        requiredRoles: authOptions.roles,
        tokenRoles: payload.roles || payload.role,
        subject: payload.sub,
      });

      if (!this.checkRoles(payload, authOptions.roles)) {
        this.logger.warn('Auth roles invalid', {
          ip: request.ip,
          userAgent: request.get('User-Agent'),
          subject: payload.sub,
          requiredRoles: authOptions.roles,
          tokenRoles: payload.roles || payload.role,
        });
        return false;
      }
    }

    // Check required claims
    if (authOptions?.claims && !this.checkClaims(payload, authOptions.claims)) {
      this.logger.warn('Auth claims invalid', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        subject: payload.sub,
        requiredClaims: authOptions.claims,
        tokenClaims: payload,
      });
      return false;
    }

    // Attach the payload to the request for use in controllers
    (request as Record<string, any>).user = payload;
    return true;
  }
}
