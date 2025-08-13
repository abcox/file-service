import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { ActivityConfigDto } from './activity-config.dto';

export class UserLoginResponse {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'User logged in successfully',
  })
  message: string;

  @ApiProperty({
    description: 'JWT authentication token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'JWT refresh token for token renewal',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiry timestamp (Unix epoch)',
    example: 1754253549,
  })
  tokenExpiry: number;

  @ApiProperty({
    description: 'Session duration in seconds',
    example: 3600,
  })
  sessionDurationSeconds: number;

  @ApiProperty({
    description:
      'Activity configuration for frontend when user is authenticated',
    example: {
      warningBeforeTokenExpiry: 300000,
      refreshBeforeTokenExpiry: 600000,
      activityTimeoutMultiplier: 0.8,
    },
    nullable: true,
    type: ActivityConfigDto,
  })
  activityConfig: ActivityConfigDto | null;

  @ApiProperty({
    description: 'User information (null if login failed)',
    type: UserDto,
    nullable: true,
  })
  user: UserDto | null;
}
