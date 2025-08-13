import { ApiProperty } from '@nestjs/swagger';

export class ActivityConfigDto {
  @ApiProperty({
    description: 'Warning time before token expiry in milliseconds',
    example: 300000,
  })
  warningBeforeTokenExpiry: number; // milliseconds

  @ApiProperty({
    description: 'Refresh time before token expiry in milliseconds',
    example: 600000,
  })
  refreshBeforeTokenExpiry: number; // milliseconds

  @ApiProperty({
    description: 'Activity timeout as fraction of token duration',
    example: 0.8,
  })
  activityTimeoutMultiplier: number; // 0.8 = 80% of token duration
}
