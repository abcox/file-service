import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ServiceStatusLevel = 'ready' | 'degraded' | 'unavailable';

export type DiagnosticScalar = string | number | boolean | null;
export type DiagnosticDetailValue =
  | DiagnosticScalar
  | ReadonlyArray<DiagnosticScalar>;
export type DiagnosticDetails = Record<string, DiagnosticDetailValue>;

export interface ProviderServiceStatus {
  name: string;
  displayName?: string;
  status: ServiceStatusLevel;
  reason?: string;
  details?: DiagnosticDetails;
  version?: string;
  serviceVersion?: string;
  buildId?: string;
  buildTimeUtc?: string;
  environment?: string;
  baseUrl?: string;
  endpointUsed?: string;
  checkedAt?: string;
  timestamp: string;
}

export class ServiceStatusDto {
  @ApiProperty({ example: 'storage', description: 'Name of the service' })
  name: string;

  @ApiPropertyOptional({
    example: 'Storage',
    description: 'Display label for the service',
  })
  displayName?: string;

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
  details?: DiagnosticDetails;

  @ApiPropertyOptional({
    example: '1.0.0',
    description: 'Service version',
  })
  version?: string;

  @ApiPropertyOptional({
    example: '2026.05.29.1',
    description: 'Detailed service version label',
  })
  serviceVersion?: string;

  @ApiPropertyOptional({
    example: 'build-abc123',
    description: 'Build identifier',
  })
  buildId?: string;

  @ApiPropertyOptional({
    example: '2026-05-29T10:30:00.000Z',
    description: 'Build timestamp in UTC',
  })
  buildTimeUtc?: string;

  @ApiPropertyOptional({
    example: 'development',
    description: 'Service environment name',
  })
  environment?: string;

  @ApiPropertyOptional({
    example: 'http://localhost:3000',
    description: 'Service base URL',
  })
  baseUrl?: string;

  @ApiPropertyOptional({
    example: '/api/diagnostic/services',
    description: 'Endpoint used to obtain the report',
  })
  endpointUsed?: string;

  @ApiPropertyOptional({
    example: '2026-02-22T10:30:00.000Z',
    description: 'Timestamp when status was checked',
  })
  checkedAt?: string;

  @ApiProperty({
    example: '2026-02-22T10:30:00.000Z',
    description: 'Timestamp when status was checked (legacy field)',
  })
  timestamp: string;
}
