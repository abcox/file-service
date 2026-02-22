import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Auth } from '../auth/auth.guard';
import { LoggerService } from '../logger/logger.service';
import { DiagnosticService } from './diagnostic.service';
import { DiagnosticReportDto } from './dto/diagnostic-report.dto';
import { ServiceStatusDto } from './dto/service-status.dto';

@ApiTags('Diagnostic')
@Controller('diagnostic')
@Auth({ public: true }) // TODO: Change to { roles: ['admin'] } after testing
export class DiagnosticController {
  constructor(
    private readonly logger: LoggerService,
    private readonly diagnosticService: DiagnosticService,
  ) {
    this.logger.debug('DiagnosticController initialized');
  }

  @Get('services')
  @ApiOperation({
    summary: 'Get diagnostic report for all services',
    description:
      'Returns the configuration and readiness status of all registered services',
  })
  @ApiResponse({
    status: 200,
    description: 'Diagnostic report with service statuses',
    type: DiagnosticReportDto,
  })
  getDiagnosticReport(): DiagnosticReportDto {
    return this.diagnosticService.getDiagnosticReport();
  }

  @Get('services/:name')
  @ApiOperation({
    summary: 'Get diagnostic status for a specific service',
    description:
      'Returns the configuration and readiness status of a specific service',
  })
  @ApiParam({ name: 'name', description: 'Service name' })
  @ApiResponse({
    status: 200,
    description: 'Service status',
    type: ServiceStatusDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Service not found',
  })
  getServiceStatus(
    @Param('name') name: string,
  ): ServiceStatusDto | { error: string } {
    const status = this.diagnosticService.getServiceStatus(name);
    if (!status) {
      return { error: `Service '${name}' not found or not registered` };
    }
    return status;
  }
}
