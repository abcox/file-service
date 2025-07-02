import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthService } from './jwt.service';
import { LoggerService } from '../logging/logger.service';

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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('No JWT token provided', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
      });
      return false;
    }

    const payload = this.jwtAuthService.validateToken(token);
    if (!payload) {
      this.logger.warn('Invalid JWT token provided', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        providedToken: `${token.substring(0, 10)}...${token.substring(token.length - 10)}`,
      });
      return false;
    }

    if (this.jwtAuthService.isTokenExpired(payload)) {
      this.logger.warn('Expired JWT token provided', {
        ip: request.ip,
        userAgent: request.get('User-Agent'),
        subject: payload.sub,
        expiredAt: new Date(payload.exp * 1000).toISOString(),
      });
      return false;
    }

    // Attach the payload to the request for use in controllers
    (request as Record<string, any>).user = payload;
    return true;
  }
}
