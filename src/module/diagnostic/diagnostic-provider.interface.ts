import { ServiceStatusDto } from './dto/service-status.dto';

/**
 * Interface for services that want to report their health status.
 * Services can implement this to provide detailed diagnostic information.
 */
export interface DiagnosticProvider {
  getDiagnosticStatus(): ServiceStatusDto;
}
