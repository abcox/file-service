import Transport from 'winston-transport';
import {
  logs,
  SeverityNumber,
  Logger as OtelLogger,
} from '@opentelemetry/api-logs';

/**
 * Maps Winston level strings to OpenTelemetry SeverityNumber values.
 */
function toSeverityNumber(level: string): SeverityNumber {
  switch (level) {
    case 'error':
      return SeverityNumber.ERROR;
    case 'warn':
      return SeverityNumber.WARN;
    case 'info':
      return SeverityNumber.INFO;
    case 'verbose':
      return SeverityNumber.DEBUG2;
    case 'debug':
      return SeverityNumber.DEBUG;
    default:
      return SeverityNumber.UNSPECIFIED;
  }
}

/**
 * Winston transport that forwards log records to Azure Monitor via the
 * OpenTelemetry Logs API.
 *
 * Prerequisite: useAzureMonitor() from @azure/monitor-opentelemetry must be
 * called before this transport is added to the Winston logger so that a
 * LoggerProvider is registered on the global OTel logs API.
 */
export class AzureMonitorTransport extends Transport {
  private readonly otelLogger: OtelLogger;

  constructor(opts?: ConstructorParameters<typeof Transport>[0]) {
    super(opts);
    this.otelLogger = logs.getLogger('file-service');
  }

  log(info: Record<string, unknown>, callback: () => void): void {
    setImmediate(() => this.emit('logged', info));

    const { level, message, ...rest } = info;

    // OTel attribute values must be primitive (string | number | boolean).
    // Strip symbol-keyed entries, null/undefined values, and stringify objects.
    const attributes: Record<string, string | number | boolean> = {};
    for (const key of Object.keys(rest)) {
      const val = rest[key];
      if (val === null || val === undefined) continue;
      if (
        typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean'
      ) {
        attributes[key] = val;
      } else {
        attributes[key] = JSON.stringify(val);
      }
    }

    try {
      this.otelLogger.emit({
        severityNumber: toSeverityNumber(level as string),
        severityText: level as string,
        body: message as string,
        attributes,
      });
    } catch (err) {
      console.warn('[AzureMonitorTransport] emit failed:', err);
    }

    callback();
  }
}
