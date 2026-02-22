import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ServiceStatusLevel = 'ready' | 'degraded' | 'unavailable';

export class ServiceStatusDto {
  @ApiProperty({ example: 'storage', description: 'Name of the service' })
  name: string;

  @ApiProperty({
    enum: ['ready', 'degraded', 'unavailable'],
    example: 'ready',
    description: 'Current status of the service',
  })
  status: ServiceStatusLevel;

  @ApiPropertyOptional({
    example: 'Missing API key',
    description: 'Reason for degraded or unavailable status',
  })
  reason?: string;

  @ApiPropertyOptional({
    example: { configuredType: 'azure', hasConnectionString: true },
    description: 'Additional diagnostic details',
  })
  details?: Record<string, unknown>;

  @ApiProperty({
    example: '2026-02-22T10:30:00.000Z',
    description: 'Timestamp when status was checked',
  })
  timestamp: string;
}
