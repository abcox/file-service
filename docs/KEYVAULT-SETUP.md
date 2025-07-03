# Azure Key Vault Integration Setup

## Overview

This guide explains how to set up Azure Key Vault integration for secure configuration management in your NestJS file service.

## Prerequisites

1. **Azure Subscription** with Key Vault access
2. **Azure CLI** installed locally
3. **Application deployed** to Azure App Service

## Step 1: Create Azure Key Vault

### Using Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **Key Vault**
3. Choose your subscription and resource group
4. Set a unique vault name (e.g., `abcox-file-service-kv`)
5. Select your region
6. Choose **Standard** pricing tier
7. Configure access policies (we'll set up managed identity later)

### Using Azure CLI

```bash
# Create resource group (if not exists)
az group create --name file-service-rg --location eastus

# Create Key Vault
az keyvault create \
  --name abcox-file-service-kv \
  --resource-group file-service-rg \
  --location eastus \
  --sku standard
```

## Step 2: Add Secrets to Key Vault

### Using Azure Portal

1. Go to your Key Vault → **Secrets**
2. Click **Generate/Import**
3. Add these secrets:

| Secret Name                       | Description                     | Example Value                                    |
| --------------------------------- | ------------------------------- | ------------------------------------------------ |
| `AZURE-STORAGE-CONNECTION-STRING` | Azure Storage connection string | `DefaultEndpointsProtocol=https;AccountName=...` |
| `JWT-SECRET-KEY`                  | JWT signing secret              | `your-super-secret-jwt-key-here`                 |
| `DATABASE-CONNECTION-STRING`      | Database connection (if needed) | `Server=...;Database=...;`                       |

### Using Azure CLI

```bash
# Add storage connection string
az keyvault secret set \
  --vault-name abcox-file-service-kv \
  --name AZURE-STORAGE-CONNECTION-STRING \
  --value "your-storage-connection-string"

# Add JWT secret
az keyvault secret set \
  --vault-name abcox-file-service-kv \
  --name JWT-SECRET-KEY \
  --value "your-jwt-secret-key"

# Add database connection (if needed)
az keyvault secret set \
  --vault-name abcox-file-service-kv \
  --name DATABASE-CONNECTION-STRING \
  --value "your-database-connection-string"
```

## Step 3: Set Up Managed Identity

### Enable Managed Identity on App Service

1. Go to your App Service → **Identity**
2. Enable **System assigned** managed identity
3. Save the changes

### Grant Key Vault Access

1. Go to your Key Vault → **Access policies**
2. Click **Add Access Policy**
3. Configure:
   - **Secret permissions**: Get, List
   - **Select principal**: Choose your App Service's managed identity
4. Click **Add**

### Using Azure CLI

```bash
# Get App Service principal ID
APP_SERVICE_PRINCIPAL_ID=$(az webapp identity show \
  --name abcox-file-service \
  --resource-group file-service-rg \
  --query principalId \
  --output tsv)

# Grant Key Vault access
az keyvault set-policy \
  --name abcox-file-service-kv \
  --object-id $APP_SERVICE_PRINCIPAL_ID \
  --secret-permissions get list
```

## Step 4: Configure App Service

### Add Environment Variables

In Azure App Service → **Configuration** → **Application settings**, add:

```
AZURE_KEY_VAULT_URL=https://abcox-file-service-kv.vault.azure.net/
NODE_ENV=production
```

### Using Azure CLI

```bash
# Set Key Vault URL
az webapp config appsettings set \
  --name abcox-file-service \
  --resource-group file-service-rg \
  --settings \
    AZURE_KEY_VAULT_URL=https://abcox-file-service-kv.vault.azure.net/ \
    NODE_ENV=production
```

## Step 5: Update Configuration Files

### Production Config (`env/config.production.json`)

```json
{
  "storage": {
    "azure": {
      "connectionString": "{{SECRET:AZURE-STORAGE-CONNECTION-STRING}}"
    }
  }
}
```

### Development Config (`env/config.development.json`)

Keep using local environment variables for development:

```json
{
  "storage": {
    "azure": {
      "connectionString": "UseDevelopmentStorage=true"
    }
  }
}
```

## Step 6: Test the Integration

### Deploy and Test

1. **Push your changes** to GitHub
2. **Monitor the deployment** in GitHub Actions
3. **Check App Service logs** for Key Vault integration messages
4. **Test your API endpoints**

### Verify Secret Resolution

Check the logs for messages like:

```
[INFO] Retrieved secret: AZURE-STORAGE-CONNECTION-STRING
[INFO] Resolved secret reference: AZURE-STORAGE-CONNECTION-STRING
```

## Security Best Practices

### 1. **Secret Naming Convention**

- Use kebab-case: `AZURE-STORAGE-CONNECTION-STRING`
- Prefix with service name: `FILE-SERVICE-JWT-SECRET`
- Use descriptive names: `DATABASE-CONNECTION-STRING`

### 2. **Access Control**

- Use **Managed Identity** instead of service principals
- Grant **minimum required permissions**
- Regularly **rotate secrets**

### 3. **Monitoring**

- Enable **Key Vault logging**
- Set up **alerts** for secret access
- Monitor **App Service logs** for errors

### 4. **Development vs Production**

- **Development**: Use local environment variables
- **Production**: Use Key Vault secrets
- **Staging**: Use separate Key Vault or environment

## Troubleshooting

### Common Issues

1. **"Key Vault client not initialized"**
   - Check `AZURE_KEY_VAULT_URL` environment variable
   - Verify App Service has managed identity enabled

2. **"Failed to retrieve secret"**
   - Check Key Vault access policies
   - Verify secret names match exactly
   - Check managed identity permissions

3. **"Failed to resolve secret"**
   - Verify secret exists in Key Vault
   - Check secret name spelling
   - Ensure App Service has access

### Debug Commands

```bash
# Check App Service identity
az webapp identity show --name abcox-file-service --resource-group file-service-rg

# List Key Vault secrets
az keyvault secret list --vault-name abcox-file-service-kv

# Test secret access
az keyvault secret show --vault-name abcox-file-service-kv --name AZURE-STORAGE-CONNECTION-STRING
```

## Cost Considerations

- **Key Vault Standard**: ~$3/month + per-10K operations
- **Managed Identity**: Free
- **Secret operations**: ~$0.03 per 10,000 operations

## Next Steps

1. **Set up Application Insights** for monitoring
2. **Configure secret rotation** policies
3. **Add more secrets** as needed (API keys, etc.)
4. **Set up staging environment** with separate Key Vault
