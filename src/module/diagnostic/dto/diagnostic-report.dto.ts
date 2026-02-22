import { ApiProperty } from '@nestjs/swagger';
import { ServiceStatusDto, ServiceStatusLevel } from './service-status.dto';

export class DiagnosticReportDto {
  @ApiProperty({
    enum: ['ready', 'degraded', 'unavailable'],
    example: 'ready',
    description: 'Overall system status based on all service statuses',
  })
  overall: ServiceStatusLevel;

  @ApiProperty({
    example: '2026-02-22T10:30:00.000Z',
    description: 'Timestamp when report was generated',
  })
  timestamp: string;

  @ApiProperty({
    example: 'development',
    description: 'Current environment',
  })
  environment: string;

  @ApiProperty({
    type: [ServiceStatusDto],
    description: 'Status of all registered services',
  })
  services: ServiceStatusDto[];
}
