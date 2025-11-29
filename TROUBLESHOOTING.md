# Azure Container Instance Troubleshooting Guide

## Quick Start Commands

### Local Testing (Recommended First Step)
```bash
# Test Docker build and run locally
npm run debug:local-docker

# Build only
npm run debug:local-docker-build

# Run existing image only
npm run debug:local-docker-run
```

### Azure Container Instance Debugging
```bash
# Check ACI status
npm run debug:aci-status

# View ACI logs
npm run debug:aci-logs

# Execute commands in container
npm run debug:aci-exec

# Restart ACI
npm run debug:aci-restart

# Get comprehensive debug info
npm run debug:aci-all
```

## Common Issues and Solutions

### 1. Container Stuck in "Waiting" Status

**Symptoms:**
- Container shows "Waiting" state
- High restart count
- Application not responding

**Possible Causes:**
- Application startup errors
- Missing environment variables
- Port binding issues
- Resource constraints

**Debugging Steps:**
```bash
# 1. Check container logs
npm run debug:aci-logs

# 2. Check container status
npm run debug:aci-status

# 3. Execute commands in container
npm run debug:aci-exec
# Then run: ps aux, ls -la /app, cat /app/logs/*
```

**Common Solutions:**
- Verify environment variables are set correctly
- Check if application is binding to port 3000
- Ensure sufficient CPU/Memory resources
- Verify Playwright browser installation

### 2. Container Crashes Immediately

**Symptoms:**
- Container starts then immediately stops
- High restart count
- Exit code 1 or 2

**Debugging Steps:**
```bash
# 1. Check logs for startup errors
npm run debug:aci-logs

# 2. Test locally first
npm run debug:local-docker

# 3. Check if it's a dependency issue
npm run debug:aci-exec
# Then run: node --version, npm list
```

**Common Solutions:**
- Missing environment variables (NODE_ENV, PORT, etc.)
- Database connection issues
- Azure Key Vault access problems
- Playwright browser path issues

### 3. Health Check Failures

**Symptoms:**
- Health endpoint returns 500 or timeout
- Application starts but health check fails

**Debugging Steps:**
```bash
# 1. Test health endpoint
npm run debug:aci-exec
# Then run: curl http://localhost:3000/health

# 2. Check application logs
npm run debug:aci-logs

# 3. Verify port binding
npm run debug:aci-exec
# Then run: netstat -tlnp
```

**Common Solutions:**
- Application not binding to correct port
- Missing dependencies
- Environment variable issues

### 4. Playwright/PDF Generation Issues

**Symptoms:**
- PDF generation fails
- Playwright browser not found
- Chromium installation issues

**Debugging Steps:**
```bash
# 1. Check Playwright installation
npm run debug:aci-exec
# Then run: ls -la /ms-playwright

# 2. Test browser path
npm run debug:aci-exec
# Then run: /ms-playwright/chromium-*/chrome-linux/chrome --version

# 3. Check environment variable
npm run debug:aci-exec
# Then run: echo $PLAYWRIGHT_BROWSER_PATH
```

**Common Solutions:**
- Verify PLAYWRIGHT_BROWSER_PATH environment variable
- Check Chromium installation in Dockerfile
- Ensure proper file permissions

### 5. Azure Key Vault Access Issues

**Symptoms:**
- Authentication errors
- Secret retrieval failures
- Managed identity issues

**Debugging Steps:**
```bash
# 1. Check managed identity
npm run debug:aci-status

# 2. Test Key Vault access
npm run debug:aci-exec
# Then run: curl -H "Metadata: true" http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://vault.azure.net/
```

**Common Solutions:**
- Grant Key Vault access to managed identity
- Verify RBAC vs Policy-based authorization
- Check Key Vault name and region

## Local Testing Workflow

### Step 1: Test Docker Build
```bash
npm run debug:local-docker-build
```

### Step 2: Test Container Run
```bash
npm run debug:local-docker-run
```

### Step 3: Test Application
```bash
# Test health endpoint
curl http://localhost:3000/health

# Test PDF generation
curl -X POST http://localhost:3000/api/pdf/html-to-pdf \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Test</h1>", "title": "Test PDF"}'
```

### Step 4: Debug Inside Container
```bash
# Enter container
docker exec -it file-service-test /bin/bash

# Check processes
ps aux

# Check logs
ls -la /app/logs/
cat /app/logs/*

# Check environment
env | grep -E "(NODE_ENV|PORT|PLAYWRIGHT)"

# Test Playwright
/ms-playwright/chromium-*/chrome-linux/chrome --version
```

## Environment Variables Checklist

Ensure these environment variables are set in ACI:

```bash
NODE_ENV=production
PORT=3000
PLAYWRIGHT_BROWSER_PATH=/ms-playwright/chromium-*/chrome-linux/chrome
```

For Azure services:
```bash
AZURE_STORAGE_CONNECTION_STRING=<your-storage-connection-string>
AZURE_KEY_VAULT_URL=<your-key-vault-url>
```

## Resource Requirements

Minimum recommended resources for ACI:
- **CPU**: 1 core (2 for production)
- **Memory**: 2GB (4GB for production)
- **Storage**: 1GB (for Playwright browsers)

## Network and Security

### Port Configuration
- **Container Port**: 3000
- **Host Port**: 3000
- **Protocol**: TCP

### Firewall Rules
- Ensure port 3000 is accessible
- Check Azure Network Security Groups
- Verify Application Gateway settings (if used)

## Monitoring and Logging

### Azure Monitor
- Check Application Insights for application metrics
- Review Log Analytics for container logs
- Monitor resource utilization

### Container Logs
```bash
# Real-time logs
az container logs --name vorba-file-service-4 --resource-group vorba-file-service-rg --follow

# Recent logs
npm run debug:aci-logs
```

## Performance Optimization

### Memory Issues
- Increase memory allocation if seeing OOM errors
- Monitor memory usage with `npm run debug:aci-exec` then `free -h`

### CPU Issues
- Check CPU usage with `npm run debug:aci-exec` then `top`
- Consider scaling up CPU cores

### Startup Time
- Optimize Dockerfile layers
- Use multi-stage builds effectively
- Minimize dependencies

## Rollback Strategy

If deployment fails:

1. **Stop current ACI:**
   ```bash
   az container stop --name vorba-file-service-4 --resource-group vorba-file-service-rg
   ```

2. **Revert to previous image:**
   ```bash
   az container create --resource-group vorba-file-service-rg --name vorba-file-service-4 --image vorbaacr.azurecr.io/file-service:previous
   ```

3. **Or redeploy with working image:**
   ```bash
   # Trigger GitHub Actions with previous commit
   ```

## Getting Help

### Debug Information to Collect
1. Container logs: `npm run debug:aci-logs`
2. Container status: `npm run debug:aci-status`
3. Local test results: `npm run debug:local-docker`
4. Environment variables: `npm run debug:aci-exec` then `env`
5. Process list: `npm run debug:aci-exec` then `ps aux`

### Common Error Messages

**"Container failed to start"**
- Check application startup logs
- Verify environment variables
- Test locally first

**"Health check failed"**
- Verify port binding
- Check application startup
- Test health endpoint manually

**"Playwright browser not found"**
- Verify PLAYWRIGHT_BROWSER_PATH
- Check Chromium installation
- Test browser path manually

**"Permission denied"**
- Check file permissions in container
- Verify user permissions
- Check Azure Key Vault access

## Prevention Tips

1. **Always test locally first** using `npm run debug:local-docker`
2. **Use staging environment** for testing before production
3. **Monitor resource usage** to prevent OOM issues
4. **Keep logs enabled** for debugging
5. **Use health checks** to detect issues early
6. **Implement proper error handling** in application code
