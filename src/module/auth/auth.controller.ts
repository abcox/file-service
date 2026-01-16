import { Body, Controller, Get, Post } from '@nestjs/common';
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
import {
  RefreshTokenRequestDto,
  RefreshTokenResponseDto,
} from './dto/refresh-token.dto';
import { UserEntity } from '../../database/entities/user.entity';
import { UserSearchRequest } from './dto/user/user-search-request.dto';

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
  @ApiResponse({
    type: UserRegistrationResponse,
    status: 201,
    description: 'User registered successfully',
  })
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
  @ApiResponse({
    type: UserLoginResponse,
    status: 200,
    description: 'User logged in successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  login(@Body() loginRequest: UserLoginRequest): Promise<UserLoginResponse> {
    return this.authService.login(loginRequest);
  }

  @Post('refresh')
  @Auth({ public: true })
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    type: RefreshTokenResponseDto,
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() request: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    try {
      const result = await this.authService.refreshToken(request.refreshToken);
      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: result.accessToken,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return {
        success: false,
        message: (error as Error).message || 'Token refresh failed',
        accessToken: '',
      };
    }
  }

  @Get('user/list')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get list of users' })
  async getUserList(): Promise<UserEntity[]> {
    return await this.authService.getUserList();
  }

  @Post('user/search')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Search users' })
  @ApiBody({ type: UserSearchRequest })
  async getUserSearch(
    @Body() request: UserSearchRequest,
  ): Promise<UserEntity[]> {
    return await this.authService.searchUsers(request);
  }
}
