import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from './user.dto';
import { IdelSessionConfigDto } from './idle-session-config.dto';

export class UserRegistrationResponse {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'User registered successfully',
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
    description: 'Activity configuration for frontend when user is registered',
    example: {
      inactivityWarningSeconds: 600,
      warningCountdownSeconds: 300,
    },
    nullable: true,
    type: IdelSessionConfigDto,
  })
  activityConfig: IdelSessionConfigDto | null;

  @ApiProperty({
    description: 'Registered user information',
    type: UserDto,
  })
  user: UserDto;
}
