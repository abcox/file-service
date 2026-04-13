// This file MUST be the very first import in main.ts.
// It initialises Azure Monitor OpenTelemetry BEFORE any other module is loaded,
// ensuring that HTTP, Winston, and other instrumentation patches are registered
// before those modules are first required by Node.js.
//
// WHY ENV VAR (not config module) for telemetry bootstrap:
// OTel instrumentation must be registered synchronously, before any instrumented
// library (Winston, HTTP, etc.) is first require()'d by Node.js. The config module
// reads from Key Vault asynchronously, so OTel would initialize too late.
//
// Key Vault remains the source of truth for the connection string. It is delivered
// as an env var at runtime by deployment:
// - App Service: native Key Vault reference in app settings
// - ACI: GitHub Actions fetches Key Vault secret and injects during deploy
// - Local dev: APPLICATIONINSIGHTS_CONNECTION_STRING in .env (gitignored)
//
// IMPORTANT: Do not switch telemetry bootstrap to AppConfigService/KeyVaultService.
// Their async startup path causes OTel patching to happen too late.
// config.local-dev.json logging.azureMonitor.connectionString is intentionally NOT
// used by this bootstrap path.
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
  console.log('[telemetry-init] Azure Monitor OTel initialised');
} else {
  console.log(
    '[telemetry-init] Azure Monitor skipped — APPLICATIONINSIGHTS_CONNECTION_STRING not set (config file value is not used for bootstrap)',
  );
}
