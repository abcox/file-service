import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthService } from './jwt-auth.service';
import { Auth } from './auth.guard';
import { UserRegistrationRequest } from './dto/user-registration.request';
import { UserRegistrationResponse } from './dto/user-registration.response';

@Controller('auth')
export class AuthController {
  constructor(private readonly jwtAuthService: JwtAuthService) {}

  // TODO: move this endpoint to new auth microservice?
  @ApiExcludeEndpoint()
  @Post('generate-token')
  @ApiOperation({ summary: 'Generate a new JWT token' })
  @ApiResponse({ status: 201, description: 'Token generated successfully' })
  generateToken(): { token: string } {
    const token = this.jwtAuthService.generateToken('file-service-api');
    return { token };
  }

  @Post('register')
  @Auth({ roles: ['admin', 'user'] })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: UserRegistrationRequest })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(
    @Body() registrationRequest: UserRegistrationRequest,
  ): Promise<UserRegistrationResponse> {
    return this.jwtAuthService.register(registrationRequest);
  }
}
