import { Injectable } from '@nestjs/common';
import { LoggerService } from '../logger/logger.service';
import { AppConfigService } from '../config/config.service';
import { DiagnosticProvider } from './diagnostic-provider.interface';
import { ServiceStatusDto, ServiceStatusLevel } from './dto/service-status.dto';
import { DiagnosticReportDto } from './dto/diagnostic-report.dto';

@Injectable()
export class DiagnosticService {
  private providers: Map<string, DiagnosticProvider> = new Map();

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: AppConfigService,
  ) {
    this.logger.debug('DiagnosticService initialized');
  }

  /**
   * Register a service as a diagnostic provider
   */
  registerProvider(name: string, provider: DiagnosticProvider): void {
    this.providers.set(name, provider);
    this.logger.debug(`Registered diagnostic provider: ${name}`);
  }

  /**
   * Unregister a diagnostic provider
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);
  }

  /**
   * Get the diagnostic status of a specific service
   */
  getServiceStatus(name: string): ServiceStatusDto | undefined {
    const provider = this.providers.get(name);
    if (!provider) {
      return undefined;
    }
    try {
      return provider.getDiagnosticStatus();
    } catch (error) {
      this.logger.error(
        `Error getting status for service: ${name}`,
        error as Error,
      );
      return {
        name,
        status: 'unavailable',
        reason: `Error retrieving status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get diagnostic status of all registered services
   */
  getAllServiceStatuses(): ServiceStatusDto[] {
    const statuses: ServiceStatusDto[] = [];
    for (const [name, provider] of this.providers) {
      try {
        statuses.push(provider.getDiagnosticStatus());
      } catch (error) {
        this.logger.error(
          `Error getting status for service: ${name}`,
          error as Error,
        );
        statuses.push({
          name,
          status: 'unavailable',
          reason: `Error retrieving status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
    return statuses;
  }

  /**
   * Calculate overall system status based on individual service statuses
   */
  private calculateOverallStatus(
    statuses: ServiceStatusDto[],
  ): ServiceStatusLevel {
    if (statuses.length === 0) {
      return 'ready';
    }

    const hasUnavailable = statuses.some((s) => s.status === 'unavailable');
    const hasDegraded = statuses.some((s) => s.status === 'degraded');

    if (hasUnavailable) {
      return 'unavailable';
    }
    if (hasDegraded) {
      return 'degraded';
    }
    return 'ready';
  }

  /**
   * Generate a complete diagnostic report
   */
  getDiagnosticReport(): DiagnosticReportDto {
    const config = this.configService.getConfig();
    const statuses = this.getAllServiceStatuses();
    const overall = this.calculateOverallStatus(statuses);

    return {
      overall,
      timestamp: new Date().toISOString(),
      environment: config?.environment || 'unknown',
      services: statuses,
    };
  }

  /**
   * Create a simple status object for services that don't implement DiagnosticProvider
   */
  static createStatus(
    name: string,
    status: ServiceStatusLevel,
    reason?: string,
    details?: Record<string, unknown>,
  ): ServiceStatusDto {
    return {
      name,
      status,
      reason,
      details,
      timestamp: new Date().toISOString(),
    };
  }
}
