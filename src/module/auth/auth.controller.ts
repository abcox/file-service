import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
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
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    sub?: string;
    roles?: string[];
  };
}

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
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return {
        success: false,
        message: (error as Error).message || 'Token refresh failed',
        accessToken: '',
        refreshToken: '',
      };
    }
  }

  @Post('refresh/admin-experiment')
  @Auth({ roles: ['admin'] })
  @ApiOperation({
    summary:
      'Admin-only refresh endpoint that can mint a new token pair with custom durations',
  })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    type: RefreshTokenResponseDto,
    status: 200,
    description: 'Experimental token pair minted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshTokenAdminExperiment(
    @Req() requestContext: AuthenticatedRequest,
    @Body() request: RefreshTokenRequestDto,
  ): Promise<RefreshTokenResponseDto> {
    try {
      const accessTokenDurationSeconds = this.toOptionalDurationSeconds(
        request.experimentalAccessTokenDurationSeconds,
      );
      const refreshTokenDurationSeconds = this.toOptionalDurationSeconds(
        request.experimentalRefreshTokenDurationSeconds,
      );

      const result = await this.authService.refreshToken(request.refreshToken, {
        expectedUserId: requestContext.user?.sub,
        tokenDurationOverrides: {
          accessTokenDurationSeconds,
          refreshTokenDurationSeconds,
        },
      });

      return {
        success: true,
        message: 'Experimental token refresh succeeded',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      console.error('Admin experimental token refresh failed:', error);
      return {
        success: false,
        message:
          (error as Error).message || 'Experimental token refresh failed',
        accessToken: '',
        refreshToken: '',
      };
    }
  }

  private toOptionalDurationSeconds(rawValue: unknown): number | undefined {
    if (typeof rawValue !== 'number' || Number.isNaN(rawValue)) {
      return undefined;
    }

    return Math.floor(rawValue);
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

  @Post('user/:userId/revoke-refresh-tokens')
  @Auth({ roles: ['admin'] })
  @ApiOperation({ summary: 'Revoke all active refresh tokens for a user' })
  @ApiResponse({
    status: 200,
    description: 'Refresh tokens revoked successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - admin access required',
  })
  async revokeUserRefreshTokens(
    @Param('userId') userId: string,
  ): Promise<{ success: boolean; message: string }> {
    await Promise.resolve(this.authService.revokeRefreshToken(userId));

    return {
      success: true,
      message: 'Refresh tokens revoked successfully',
    };
  }
}
