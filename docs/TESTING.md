# Testing Guide

This guide covers the testing strategy, test types, and how to run tests for the File Service.

## 🎯 Overview

The project uses a three-tier testing strategy:

| Tier | Type | Purpose | Speed | Requirements |
|------|------|---------|-------|--------------|
| 1 | **Smoke** | Validate server is responding | Fast (~10s) | Running server |
| 2 | **Integration** | Test full app with databases | Slow (~30s+) | DB connections |
| 3 | **Unit** | Test individual modules | Fast | None |

## 🧪 Test Commands

```bash
# Smoke tests - requires running server
npm run test:smoke

# E2E tests - same as smoke (lightweight)
npm run test:e2e

# Integration tests - requires databases
npm run test:integration

# Unit tests
npm run test

# Watch mode for development
npm run test:watch
```

## 📋 Smoke Tests (Tier 1)

Smoke tests validate that the server is running and routes are accessible. They make HTTP requests to a running server without bootstrapping NestJS.

### What They Test

| Endpoint | Expected | Description |
|----------|----------|-------------|
| `/health` | 200 | Health check for load balancers |
| `/api` | 200 | Swagger UI |
| `/api/diagnostic/services` | 200 | Service status |
| `/api/file/list` | 200/401/403 | File listing (may require auth) |
| `/api/pdf` | Any | PDF service availability |
| `/api/auth` | Any | Auth endpoints |

### Running Smoke Tests

```bash
# Terminal 1: Start the server
npm run start:dev

# Terminal 2: Run smoke tests
npm run test:smoke
```

### Testing Against Remote Server

```bash
# Test against deployed Web App
API_URL=https://vorba-file-service-3.azurewebsites.net npm run test:smoke

# Test against ACI
API_URL=http://vorba-file-service-4.canadaeast.azurecontainer.io:8080 npm run test:smoke
```

### Configuration

- **File**: `test/smoke.e2e-spec.ts`
- **Jest Config**: `test/jest-smoke.json`
- **Timeout**: 10 seconds per test
- **Environment Variable**: `API_URL` (default: `http://localhost:3000`)

## 🔗 Integration Tests (Tier 2)

Integration tests bootstrap the full NestJS application with real database connections. They test module interactions and actual service behavior.

### Requirements

- Azure Key Vault access (for secrets)
- SQL Server connection (Azure or local)
- CosmosDB Emulator (optional)

### Running Integration Tests

```bash
# Ensure you're logged into Azure for Key Vault access
az login

# Run integration tests
npm run test:integration
```

### What They Test

- Full application bootstrap
- Database connectivity
- Module interactions
- Real HTTP requests through NestJS

### Configuration

- **File**: `test/app.e2e-spec.ts`
- **Jest Config**: `test/jest-integration.json`
- **Setup File**: `test/setup-integration.ts`
- **Timeout**: 30 seconds per test, 2 minutes for beforeAll

### Memory Considerations

Integration tests load the entire application and may require more memory:

```bash
# If you get OOM errors, increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm run test:integration
```

## 🔧 Shared Configuration

Both main.ts and integration tests use a shared bootstrap helper to ensure consistent configuration:

- **File**: `src/config/app-bootstrap.ts`
- **Purpose**: Sets global prefix, validation pipes, CORS
- **Benefit**: No configuration drift between test and production

```typescript
// Used in main.ts
const { globalPrefix } = configureApp(app, { enableRequestLogging: true });

// Used in integration tests
configureApp(app); // No request logging in tests
```

## 🚀 CI/CD Integration

Tests are automatically run in the deployment pipeline:

### Pre-Build Tests (Before Deploy)

```yaml
# In .github/workflows/azure-deploy.yml
- name: Run pre-build smoke tests
  run: |
    npm run build
    NODE_ENV=test npm run start:prod &
    sleep 15
    npm run test:smoke
```

### Post-Deploy Tests (After Deploy)

```yaml
# After deployment completes
- name: Post-deployment smoke tests
  run: |
    DEPLOY_URL="https://vorba-file-service-3.azurewebsites.net"
    curl -s "$DEPLOY_URL/health"
    # ... additional endpoint tests
```

### Pipeline Flow

```
Lint → Pre-build Tests → Build → Deploy → Post-deploy Tests
              ↓                                    ↓
         Fail Early                        Validate Deployment
```

## 📁 Test File Structure

```
test/
├── smoke.e2e-spec.ts      # Tier 1: Smoke tests
├── app.e2e-spec.ts        # Tier 2: Integration tests
├── setup-integration.ts   # Integration test setup
├── jest-smoke.json        # Jest config for smoke tests
├── jest-integration.json  # Jest config for integration tests
└── jest-e2e.json          # Jest config for e2e (runs smoke tests)
```

## 🔍 Troubleshooting

### Tests Fail with "Connection Refused"

Server isn't running. Start it first:
```bash
npm run start:dev
```

### Integration Tests OOM

Increase Node memory:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test:integration
```

### Jest Cache Issues

Clear Jest cache:
```bash
npx jest --clearCache
npm run test:smoke
```

The test scripts include `--no-cache` by default to avoid stale compiled TypeScript.

### Config Not Found in Tests

The test environment uses `src/config/` for configuration files. Ensure:
- `src/config/config.json` exists
- `src/config/config.local-dev.json` exists (for local dev settings)

### ts-jest Warnings About isolatedModules

This is handled in Jest configs with:
```json
"transform": {
  "^.+\\.(t|j)s$": ["ts-jest", { "isolatedModules": true }]
}
```

## 📊 Test Reports

Jest outputs test results to the console. For CI/CD, results appear in:
- GitHub Actions logs
- GitHub Actions job summary (deployment info)

## 🎯 Best Practices

1. **Run smoke tests before committing** - Catch issues early
2. **Keep smoke tests fast** - Under 30 seconds total
3. **Integration tests are optional locally** - Run in CI when DBs available
4. **Use API_URL for remote testing** - Test deployed apps
5. **Don't skip post-deploy tests** - They validate real deployments
