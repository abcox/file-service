# Enhanced Troubleshooting Guide

## 🎯 Overview

This guide documents the improvements made to the configuration service and startup process to provide better troubleshooting capabilities during deployment issues.

## 🔍 Key Improvements Made

### 1. **Enhanced Configuration Service Diagnostics**

The `AppConfigService` now includes comprehensive diagnostics:

- **Environment Detection**: Clear logging of NODE_ENV, working directory, and platform
- **File System Validation**: Checks all possible config file paths with detailed status
- **Key Vault Error Diagnostics**: Enhanced error reporting with troubleshooting hints
- **Azure Credentials Validation**: Checks for Managed Identity and service principal credentials

### 2. **New ConfigDebugService**

A dedicated service for startup diagnostics:

```typescript
// Features:
- Environment diagnostics (NODE_ENV, PORT, container detection)
- File system path validation
- Environment variable validation
- Azure credentials diagnostics
- Network connectivity testing
- Comprehensive diagnostic reports
```

### 3. **Enhanced Main.ts Startup Process**

The main application startup now includes:

- **Pre-bootstrap diagnostics** (when DEBUG_STARTUP=true)
- **Enhanced error reporting** with troubleshooting hints
- **Post-bootstrap diagnostics** for module validation
- **Graceful error handling** with detailed context

## 🚀 How to Use Enhanced Troubleshooting

### Enable Debug Mode

```bash
# Option 1: Set environment variable
export DEBUG_STARTUP=true

# Option 2: Use PowerShell script
npm run debug:enable

# Option 3: Set in Azure Container Instance
az container create --environment-variables DEBUG_STARTUP=true
```

### Run Local Docker with Debug

```bash
npm run debug:local-docker
```

### Check Azure Container Logs

```bash
npm run debug:aci-logs
```

## 📊 Diagnostic Output Examples

### Environment Diagnostics
```
🔍 Starting Configuration Diagnostics...
📋 Environment Diagnostics
  NODE_ENV: production
  PORT: 3000
  cwd: /app
  platform: linux
  arch: x64
```

### File System Diagnostics
```
📁 File System Diagnostics
📄 Config Path Check: /app/dist/config.json
  exists: true
  size: 2048
  modified: 2025-08-28T17:14:40.234Z
✅ Config File Valid: /app/dist/config.json
  hasKeyVaultUrl: true
  hasAuthConfig: true
  hasStorageConfig: true
```

### Key Vault Error Diagnostics
```
❌ Failed to load secrets from Key Vault
🔍 Key Vault Error Diagnostics
  environment: production
  keyVaultUrl: https://vorba-file-service-kv.vault.azure.net/
  errorMessage: ChainedTokenCredential authentication failed
  hasAzureCredentials: false
  isContainer: true
  hasManagedIdentity: true
🔧 Production Key Vault Troubleshooting Steps
  - Check if Managed Identity is properly configured
  - Verify role assignments for Key Vault access
  - Ensure Key Vault URL is correct
  - Check network connectivity to Key Vault
  - Verify Key Vault secrets exist and are accessible
```

## 🔧 Troubleshooting Workflow

### 1. **Container Startup Issues**

**Symptoms**: Container crashes immediately, no logs generated

**Diagnostic Steps**:
1. Enable debug mode: `export DEBUG_STARTUP=true`
2. Run local Docker test: `npm run debug:local-docker`
3. Check for config file issues
4. Verify environment variables

**Common Solutions**:
- Ensure config.json is copied to correct location in Dockerfile
- Verify NODE_ENV is set correctly (production vs development)
- Check file permissions in container

### 2. **Key Vault Authentication Issues**

**Symptoms**: `ChainedTokenCredential authentication failed`

**Diagnostic Steps**:
1. Check Managed Identity role assignments
2. Verify Key Vault URL configuration
3. Test network connectivity
4. Review Azure credentials setup

**Common Solutions**:
- Assign "Key Vault Secrets User" role to Managed Identity
- Verify Key Vault secrets exist
- Check network security rules
- Ensure correct tenant and subscription

### 3. **Configuration File Issues**

**Symptoms**: `Configuration file not found`

**Diagnostic Steps**:
1. Check config file paths in diagnostics
2. Verify Dockerfile COPY commands
3. Validate file permissions
4. Confirm working directory

**Common Solutions**:
- Update Dockerfile to copy config to correct location
- Ensure config file exists in source
- Check file permissions in container
- Verify NODE_ENV setting

## 📝 Debug Scripts Available

### Local Development
- `npm run debug:check-prerequisites` - Check development environment
- `npm run debug:setup-azure-credentials` - Setup local Azure credentials
- `npm run debug:local-docker` - Test Docker container locally
- `npm run debug:enable` - Enable debug mode

### Azure Container Instance
- `npm run debug:aci-status` - Check ACI status
- `npm run debug:aci-logs` - Get container logs
- `npm run debug:aci-exec` - Execute commands in container
- `npm run debug:aci-restart` - Restart container
- `npm run debug:aci-all` - Run all ACI diagnostics

## 🎯 Best Practices

### 1. **Always Enable Debug Mode for Troubleshooting**
```bash
export DEBUG_STARTUP=true
```

### 2. **Test Locally First**
```bash
npm run debug:local-docker
```

### 3. **Check Logs Immediately After Deployment**
```bash
npm run debug:aci-logs
```

### 4. **Use Diagnostic Reports**
The system generates comprehensive diagnostic reports that can be used to:
- Identify configuration issues
- Validate Azure service connectivity
- Verify file system setup
- Check environment variables

### 5. **Follow Error Hints**
The enhanced error messages include specific troubleshooting steps:
- Check role assignments
- Verify network connectivity
- Validate configuration files
- Review Azure service setup

## 🔄 Continuous Improvement

The troubleshooting system is designed to be extensible:

1. **Add New Diagnostics**: Extend `ConfigDebugService` with new diagnostic methods
2. **Custom Error Handling**: Add specific error handling for new services
3. **Enhanced Logging**: Include more context in error messages
4. **Automated Testing**: Add diagnostic tests to CI/CD pipeline

## 📞 Support

When encountering issues:

1. **Enable debug mode** and capture full diagnostic output
2. **Run local tests** to isolate issues from Azure deployment
3. **Check this guide** for common solutions
4. **Review diagnostic reports** for specific error details
5. **Use troubleshooting hints** provided in error messages

The enhanced troubleshooting system provides comprehensive visibility into the application startup process, making it easier to identify and resolve configuration and deployment issues.
