import { ApiProperty } from '@nestjs/swagger';

export class IdelSessionConfigDto {
  @ApiProperty({
    description: 'Show warning dialog after X seconds of inactivity',
    example: 600,
  })
  inactivityWarningSeconds: number; // seconds

  @ApiProperty({
    description: 'Warning dialog countdown before logout',
    example: 300,
  })
  warningCountdownSeconds: number; // seconds
}
