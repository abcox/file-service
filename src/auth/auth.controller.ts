import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Auth } from './auth.guard';
import { UserRegistrationRequest } from './dto/user-registration.request';
import { UserRegistrationResponse } from './dto/user-registration.response';
import { UserLoginRequest } from './dto/user-login.request';
import { UserLoginResponse } from './dto/user-login.response';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // TODO: move this endpoint to new auth microservice?
  @ApiExcludeEndpoint()
  @Post('generate-token')
  @ApiOperation({ summary: 'Generate a new JWT token' })
  @ApiResponse({ status: 201, description: 'Token generated successfully' })
  generateToken(): { token: string } {
    const token = this.authService.generateToken('file-service-api');
    return { token };
  }

  @Post('register')
  //@Auth({ roles: ['admin', 'user'] }) // why we did this?
  @Auth({ public: true })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: UserRegistrationRequest })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  register(
    @Body() registrationRequest: UserRegistrationRequest,
  ): Promise<UserRegistrationResponse> {
    return this.authService.register(registrationRequest);
  }

  @Post('login')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Login a user' })
  @ApiBody({ type: UserLoginRequest })
  @ApiResponse({ status: 200, description: 'User logged in successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Body() loginRequest: UserLoginRequest): Promise<UserLoginResponse> {
    return this.authService.login(loginRequest);
  }
}
