import { Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthService } from './jwt.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtAuthService: JwtAuthService) {}

  @Post('generate-token')
  @ApiOperation({ summary: 'Generate a new JWT token' })
  @ApiResponse({ status: 201, description: 'Token generated successfully' })
  generateToken(): { token: string } {
    const token = this.jwtAuthService.generateToken('file-service-api');
    return { token };
  }
}
 