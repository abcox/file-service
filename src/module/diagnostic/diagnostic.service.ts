import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { LoggerService } from '../logger/logger.service';
import { AppConfigService } from '../config/config.service';
import { DiagnosticProvider } from './diagnostic-provider.interface';
import {
  DiagnosticDetails,
  ProviderServiceStatus,
  ServiceStatusDto,
  ServiceStatusLevel,
} from './dto/service-status.dto';
import { DiagnosticReportDto } from './dto/diagnostic-report.dto';

const diagnosticDetailScalarSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

const diagnosticDetailValueSchema = z.union([
  diagnosticDetailScalarSchema,
  z.array(diagnosticDetailScalarSchema),
]);

const diagnosticDetailsSchema = z.record(
  z.string(),
  diagnosticDetailValueSchema,
);

const providerServiceStatusSchema = z.object({
  name: z.string().min(1),
  displayName: z.string().optional(),
  status: z.enum(['ready', 'degraded', 'unavailable']),
  reason: z.string().optional(),
  details: diagnosticDetailsSchema.optional(),
  version: z.string().optional(),
  serviceVersion: z.string().optional(),
  buildId: z.string().optional(),
  buildTimeUtc: z.string().optional(),
  environment: z.string().optional(),
  baseUrl: z.string().optional(),
  endpointUsed: z.string().optional(),
  checkedAt: z.string().optional(),
  timestamp: z.string().min(1),
});

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
    const config = this.configService.getConfig();

    try {
      return this.normalizeServiceReport(
        provider.getDiagnosticStatus(),
        name,
        config?.environment || 'unknown',
      );
    } catch (error) {
      const runtime = this.getRuntimeMetadata(config?.environment || 'unknown');
      this.logger.error(
        `Error getting status for service: ${name}`,
        error as Error,
      );
      return {
        name,
        displayName: this.createDisplayName(name),
        status: 'unavailable',
        reason: `Error retrieving status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        endpointUsed: '/api/diagnostic/services',
        checkedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
        environment: runtime.environment,
        serviceVersion: runtime.serviceVersion,
        buildId: runtime.buildId,
        buildTimeUtc: runtime.buildTimeUtc,
      };
    }
  }

  /**
   * Get diagnostic status of all registered services
   */
  getAllServiceStatuses(): ServiceStatusDto[] {
    const statuses: ServiceStatusDto[] = [];
    const config = this.configService.getConfig();
    const appEnvironment = config?.environment || 'unknown';

    for (const [name, provider] of this.providers) {
      try {
        statuses.push(
          this.normalizeServiceReport(
            provider.getDiagnosticStatus(),
            name,
            appEnvironment,
          ),
        );
      } catch (error) {
        const runtime = this.getRuntimeMetadata(appEnvironment);
        this.logger.error(
          `Error getting status for service: ${name}`,
          error as Error,
        );
        statuses.push({
          name,
          displayName: this.createDisplayName(name),
          status: 'unavailable',
          reason: `Error retrieving status: ${error instanceof Error ? error.message : 'Unknown error'}`,
          endpointUsed: '/api/diagnostic/services',
          checkedAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          environment: runtime.environment,
          serviceVersion: runtime.serviceVersion,
          buildId: runtime.buildId,
          buildTimeUtc: runtime.buildTimeUtc,
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
    details?: DiagnosticDetails,
  ): ServiceStatusDto {
    const now = new Date().toISOString();

    return {
      name,
      displayName: name
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      status,
      reason,
      details,
      endpointUsed: '/api/diagnostic/services',
      checkedAt: now,
      timestamp: now,
    };
  }

  private normalizeServiceReport(
    service: ProviderServiceStatus,
    fallbackName: string,
    fallbackEnvironment: string,
  ): ServiceStatusDto {
    const parsed = providerServiceStatusSchema.safeParse(service);
    if (!parsed.success) {
      const details = parsed.error.issues
        .map((issue) => {
          const path = issue.path.length > 0 ? issue.path.join('.') : '(root)';
          return `${path}: ${issue.message}`;
        })
        .join('; ');

      throw new Error(
        `Provider '${fallbackName}' returned invalid diagnostic status: ${details}`,
      );
    }

    const normalizedStatus = parsed.data;
    const runtime = this.getRuntimeMetadata(fallbackEnvironment);

    const checkedAt = normalizedStatus.checkedAt || normalizedStatus.timestamp;

    const name = normalizedStatus.name || fallbackName;

    return {
      ...normalizedStatus,
      name,
      displayName: normalizedStatus.displayName || this.createDisplayName(name),
      endpointUsed: normalizedStatus.endpointUsed || '/api/diagnostic/services',
      version: normalizedStatus.version,
      serviceVersion:
        normalizedStatus.serviceVersion ||
        normalizedStatus.version ||
        runtime.serviceVersion,
      buildId: normalizedStatus.buildId || runtime.buildId,
      buildTimeUtc: normalizedStatus.buildTimeUtc || runtime.buildTimeUtc,
      environment: normalizedStatus.environment || runtime.environment,
      baseUrl: normalizedStatus.baseUrl,
      checkedAt,
      timestamp: checkedAt,
    };
  }

  private getRuntimeMetadata(fallbackEnvironment: string): {
    environment: string;
    serviceVersion: string;
    buildId: string;
    buildTimeUtc?: string;
  } {
    return {
      environment: fallbackEnvironment,
      serviceVersion:
        process.env.npm_package_version ||
        process.env.SERVICE_VERSION ||
        'unknown',
      buildId: process.env.GITHUB_RUN_ID || process.env.BUILD_ID || 'local',
      buildTimeUtc: process.env.BUILD_TIME_UTC,
    };
  }

  private createDisplayName(name: string): string {
    return name
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
