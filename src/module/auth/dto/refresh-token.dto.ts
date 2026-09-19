import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description:
      'Optional admin-only override for access token lifetime (seconds) when minting a new token pair',
    example: 300,
  })
  experimentalAccessTokenDurationSeconds?: number;

  @ApiPropertyOptional({
    description:
      'Optional admin-only override for refresh token lifetime (seconds) when minting a new token pair',
    example: 14400,
  })
  experimentalRefreshTokenDurationSeconds?: number;
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

  @ApiProperty({
    description: 'Refresh token',
    example: 'refresh-token-123',
  })
  refreshToken: string;
}
