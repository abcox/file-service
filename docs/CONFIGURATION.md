# Configuration Management

This document explains how configuration is managed in the file service application.

## Configuration Architecture

The application uses a layered configuration approach:

1. **Base Configuration** (JSON files) - Non-sensitive app settings
2. **Environment Variables** (`.env` files) - Sensitive data for local development
3. **Azure Key Vault** - Sensitive data for production

## Configuration Sources (Priority Order)

### 1. Base Configuration (`env/config.*.json`)

Non-sensitive configuration loaded from JSON files:

```json
{
  "port": 3000,
  "environment": "development",
  "storage": {
    "type": "emulator",
    "local": {
      "subfolderPath": "uploads"
    },
    "azure": {
      "connectionString": "",
      "containerName": "uploads"
    },
    "emulator": {
      "connectionString": "UseDevelopmentStorage=true",
      "containerName": "uploads"
    },
    "options": {
      "safeMode": false
    }
  },
  "keyVault": {
    "vaultUrl": "https://vorba-sand-kv-2.vault.azure.net/",
    "enabled": true
  },
  "logging": {
    "level": "debug",
    "enableConsole": true
  },
  "auth": {
    "secret": ""
  }
}
```

### 2. Environment Variables (`.env` file)

Sensitive configuration for local development:

```env
# Environment Configuration
NODE_ENV=development

# Sensitive Configuration (use .env for local development)
# In production, these should be stored in Azure Key Vault or App Service Configuration

# Azure Storage Connection String
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true

# JWT Secret for API authentication
JWT_SECRET=your-super-secret-jwt-key-here

# API Key for external service authentication
API_KEY=your-api-key-here

# Azure Key Vault Configuration (for production)
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_TENANT_ID=your-tenant-id

# Development/Testing Flags
OFFLINE_MODE=false
```

### 3. Azure Key Vault (Production)

Sensitive configuration stored securely in Azure Key Vault:

- `AZURE_STORAGE_CONNECTION_STRING`
- `JWT_SECRET`
- `API_KEY`
- Other sensitive secrets

## Configuration Loading Process

1. **Load Base Config**: Read JSON file based on `NODE_ENV`
2. **Load Environment Variables**: Override sensitive values from `.env`
3. **Load Key Vault Secrets**: In production, fetch secrets from Azure Key Vault

## Using AppConfigService

The `AppConfigService` provides a clean interface for accessing configuration:

```typescript
// Inject the service
constructor(private configService: AppConfigService) {}

// Access configuration
const port = this.configService.getPort();
const storageType = this.configService.getStorageType();
const jwtSecret = this.configService.getJwtSecret();
const apiKey = this.configService.getApiKey();
```

## Environment-Specific Configuration

### Development
- Uses `env/config.development.json`
- Sensitive data from `.env` file
- Key Vault disabled

### Production
- Uses `env/config.production.json`
- Sensitive data from Azure Key Vault
- Key Vault enabled and required

### Staging
- Uses `env/config.staging.json`
- Sensitive data from Azure Key Vault
- Key Vault enabled but optional

## Security Best Practices

1. **Never commit sensitive data** to version control
2. **Use environment variables** for local development
3. **Use Azure Key Vault** for production secrets
4. **Rotate secrets regularly**
5. **Use least privilege access** for Key Vault permissions

## Troubleshooting

### Configuration Not Loading
- Check that `NODE_ENV` is set correctly
- Verify JSON config file exists
- Ensure `.env` file is in the root directory

### Key Vault Issues
- Verify Azure credentials are configured
- Check Key Vault URL and permissions
- Use `OFFLINE_MODE=true` for local development

### Environment Variable Issues
- Ensure `.env` file is not in `.gitignore`
- Check variable names match exactly
- Restart application after changing `.env` 