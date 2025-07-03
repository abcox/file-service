# Technical Debt

## Key Vault Authentication Bypass

### Current Status
- **Issue**: Key Vault authentication is failing with IMDS endpoint errors
- **Temporary Solution**: Using `AZURE_STORAGE_CONNECTION_STRING` environment variable as fallback
- **Location**: `src/config/config.service.ts` lines 35-42

### What Was Done
1. Added environment variable check before Key Vault resolution
2. If `AZURE_STORAGE_CONNECTION_STRING` is present, use it directly
3. Only attempt Key Vault if environment variable is not available
4. Added graceful fallback logging

### Code Changes
```typescript
// TEMPORARY BYPASS: Check for environment variable first
// TODO: Remove this bypass once Key Vault authentication is working properly
const envConnectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
if (envConnectionString && config.storage.type === 'azure') {
  logger.info('Using AZURE_STORAGE_CONNECTION_STRING from environment variable (Key Vault bypass)');
  config.storage.azure.connectionString = envConnectionString;
  logger.info('Storage connection string loaded from environment variable');
}
```

### Future Tasks
- [ ] Fix Key Vault Managed Identity authentication
- [ ] Remove environment variable bypass
- [ ] Ensure all secrets are properly stored in Key Vault
- [ ] Add proper error handling for Key Vault failures

### Security Considerations
- Environment variables are encrypted at rest in Azure App Service
- This is a temporary solution for development/testing
- Production should use Key Vault for all secrets

### Related Issues
- IMDS endpoint not available error
- Managed Identity authentication chain issues
- Azure environment variable interference with authentication

### Notes
- The bypass only affects storage connection string
- Auth secrets still attempt to load from Key Vault
- Key Vault infrastructure remains in place for future use 