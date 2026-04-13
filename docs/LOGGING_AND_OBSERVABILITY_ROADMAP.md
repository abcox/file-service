# Logging and Observability Roadmap

## Purpose
This document defines a practical roadmap for standardizing backend logging in file-service, with production-ready correlation and Azure-native telemetry export.

It complements architecture guidance in [ARCHITECTURE.md](ARCHITECTURE.md).

## Goals
- Standardize structured logging across all backend modules.
- Correlate logs to HTTP requests and distributed traces.
- Correlate logs to exact build and deployment versions.
- Export logs and traces to Azure Application Insights using modern OpenTelemetry integration.
- Introduce PoC-level unit and E2E validation before broad rollout.

## Target Logging Architecture

### 1) Application Logging Facade: Winston
Use Winston as the backend logger abstraction for:
- log levels (`debug`, `info`, `warn`, `error`)
- structured JSON output
- transport routing by environment

Baseline Winston outputs:
- Console transport for local/dev runtime visibility
- OpenTelemetry-linked transport path for centralized telemetry

### 2) Correlation Model
Every log event should include:
- `requestId`: ingress request ID
- `traceId`: OpenTelemetry trace ID
- `spanId`: OpenTelemetry span ID
- `buildId`: CI run/build identifier
- `serviceVersion`: app version and/or git SHA
- `environment`: deployment environment
- `serviceName`: logical service name

Recommended sources:
- `requestId`: from `x-request-id` header, else generated
- `buildId`: `GITHUB_RUN_ID`, `BUILD_BUILDID`, or deployment variable fallback
- `serviceVersion`: `GITHUB_SHA` or package version

### 3) Telemetry Export Path: OpenTelemetry -> Application Insights
Preferred modern path:
1. Winston emits structured logs in app code.
2. OpenTelemetry context is active for request traces.
3. OpenTelemetry SDK + Azure Monitor exporter sends traces/logs to Application Insights.

Reference components (validate exact versions during implementation):
- `@opentelemetry/api`
- `@opentelemetry/sdk-node`
- `@opentelemetry/sdk-logs`
- `@azure/monitor-opentelemetry-exporter`

Required configuration:
- Application Insights connection string (from secure config source)
- Resource attributes (`service.name`, `service.version`, `deployment.environment`)
- Sampling strategy for traces
- Log level threshold by environment

## Logging Standards

### Event Shape
Use a consistent object shape for all logs.

Example fields:
- `timestamp`
- `level`
- `message`
- `requestId`
- `traceId`
- `spanId`
- `buildId`
- `serviceVersion`
- `serviceName`
- `environment`
- `module`
- `operation`
- `durationMs` (when applicable)
- `error` (structured error object for failures)

### Redaction Policy
Never emit:
- credentials, secrets, tokens
- auth headers
- full personal payloads when not required

Mask patterns by default:
- `authorization`
- `cookie`
- `apiKey`
- connection strings
- password fields

## Rollout Plan

### Phase 1: Foundation (Logging First)
- Create a shared logger module with Winston configuration.
- Implement structured JSON format and level controls.
- Inject baseline metadata (`serviceName`, `environment`, `serviceVersion`, `buildId`).
- Add request middleware/interceptor for request ID extraction/generation.

Exit criteria:
- New logs include `requestId`, `buildId`, and `serviceVersion`.
- No sensitive fields leaked in standard request/response/error logs.

### Phase 2: OpenTelemetry Integration
- Initialize OpenTelemetry SDK.
- Add HTTP/Nest instrumentation for trace generation.
- Attach trace context (`traceId`, `spanId`) to Winston log context.
- Configure Azure Monitor exporter and Application Insights connection.

Exit criteria:
- Logs and traces are visible in Application Insights.
- Trace-log correlation works for at least one end-to-end API flow.

### Phase 3: Unit Testing PoC (Backend)
Create focused tests for logging behavior:
- includes `requestId`, `buildId`, `serviceVersion`
- redacts sensitive fields
- emits expected levels for expected vs unexpected errors
- includes trace fields when context exists

Suggested first targets:
- shared logger service
- request correlation middleware/interceptor
- one representative service error path

Exit criteria:
- PoC unit test suite passes in CI.
- Logging contract is enforced by tests.

### Phase 4: E2E PoC (Frontend + Backend)
Use Playwright in vorba-web to validate observability behavior across a real user flow.

Suggested PoC scenario:
1. Submit contact form from UI.
2. Capture response headers/body in browser test.
3. Assert request correlation header presence (`x-request-id` or chosen standard).
4. Optionally verify backend log record exists for the same requestId in non-prod telemetry.

Exit criteria:
- Playwright test demonstrates request correlation continuity.
- Failure artifact capture is enabled (trace/screenshot/video) for diagnostics.

## CI/CD and Build Correlation

### Build Metadata Contract
At deploy/build time, populate:
- `BUILD_ID`
- `SERVICE_VERSION` (git SHA or semver)
- `DEPLOY_ENVIRONMENT`

These should be injected into runtime config and attached to every log event.

### Operational Benefits
- Fast incident triage by build version.
- Easy rollback validation.
- Clear separation of issues across deployments.

## PoC Backlog (Execution Order)
1. Implement Winston baseline logger with JSON format.
2. Add request correlation middleware/interceptor.
3. Add build metadata injection (`buildId`, `serviceVersion`).
4. Add OpenTelemetry initialization and Azure Monitor exporter config.
5. Add backend unit tests for logging contract PoC.
6. Add Playwright E2E PoC in vorba-web for request correlation validation.

## Notes
- Start with minimal instrumentation and expand iteratively.
- Keep local/dev logging readable while preserving JSON structure for CI/prod.
- Avoid blocking feature delivery by scoping PoC to one critical user flow first.
