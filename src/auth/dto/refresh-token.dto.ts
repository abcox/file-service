import { ApiProperty } from '@nestjs/swagger';

/* export class RefreshTokenRequest {
  refreshToken: string;
}

export class RefreshTokenResponse {
  success: boolean;
  message: string;
  accessToken: string;
} */

export class RefreshTokenRequestDto /* implements RefreshTokenRequest */ {
  @ApiProperty({
    description: 'Refresh token',
    example: 'refresh-token-123',
  })
  refreshToken: string;
}

export class RefreshTokenResponseDto /* implements RefreshTokenResponse */ {
  @ApiProperty({
    description: 'Success',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Message',
    example: 'Token refreshed successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Access token',
    example: 'access-token-123',
  })
  accessToken: string;
}
