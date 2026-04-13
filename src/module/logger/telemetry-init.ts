// This file MUST be the very first import in main.ts.
// It initialises Azure Monitor OpenTelemetry BEFORE any other module is loaded,
// ensuring that HTTP, Winston, and other instrumentation patches are registered
// before those modules are first required by Node.js.
//
// Local dev: set APPLICATIONINSIGHTS_CONNECTION_STRING in your .env file.
// Production: set it as an Azure app setting (Key Vault reference supported).
import 'dotenv/config';
import { useAzureMonitor } from '@azure/monitor-opentelemetry';

const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

if (connectionString) {
  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString },
    samplingRatio: 1.0,
    tracesPerSecond: 0, // disable rate-limited sampler; use fixed-percentage via samplingRatio
    instrumentationOptions: {
      http: { enabled: true },
      winston: { enabled: true }, // auto-bridge Winston logs → Azure Monitor traces
    },
  });
  console.log('[instrument] Azure Monitor OTel initialised');
} else {
  console.log(
    '[instrument] Azure Monitor skipped — APPLICATIONINSIGHTS_CONNECTION_STRING not set',
  );
}
