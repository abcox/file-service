# Azure Resources Reference

This document provides a quick reference for the Azure resources deployed for the Vorba File Service.

## 🏗️ Deployed Resources

### Resource Group
- **Name**: `vorba-file-service-rg`
- **Location**: Canada East
- **Purpose**: Contains all file service resources

### App Service Plan
- **Name**: `vorba-file-service-plan`
- **SKU**: B1 (Basic)
- **OS**: Linux
- **Purpose**: Hosting plan for the web application

### App Service
- **Name**: `vorba-file-service`
- **URL**: https://vorba-file-service.azurewebsites.net
- **Runtime**: Node.js 18 LTS
- **Purpose**: Hosts the NestJS file service application

### Blob Storage Container
- **Storage Account**: `ccastore01` (existing)
- **Container**: `file-service-uploads`
- **Purpose**: Stores uploaded files

### Key Vault Integration
- **Key Vault**: `vorba-sand-kv-2` (existing)
- **Access**: Managed Identity with RBAC
- **Purpose**: Stores JWT secrets and other sensitive configuration

## 🔧 Configuration

### Environment Variables
The App Service is configured with these environment variables:
- `NODE_ENV=production`
- `AZURE_KEY_VAULT_URL=https://vorba-sand-kv-2.vault.azure.net/`
- `AZURE_STORAGE_CONNECTION_STRING=[auto-generated]`
- `WEBSITE_NODE_DEFAULT_VERSION=18.17.0`

### Managed Identity
- **Status**: Enabled
- **Purpose**: Allows the app to access Key Vault and Storage without storing credentials

### Key Vault Access
- **Method**: RBAC (Role-Based Access Control)
- **Role**: Key Vault Secrets User
- **Scope**: App Service managed identity

## 🔗 Useful URLs

### Application Endpoints
- **Main App**: https://vorba-file-service.azurewebsites.net
- **Health Check**: https://vorba-file-service.azurewebsites.net/health
- **API Documentation**: https://vorba-file-service.azurewebsites.net/api (if Swagger is enabled)

### Azure Portal Links
- **App Service**: https://portal.azure.com/#@vorba.com/resource/subscriptions/236217f7-0ad4-4dd6-8553-dc4b574fd2c5/resourceGroups/vorba-file-service-rg/providers/Microsoft.Web/sites/vorba-file-service
- **Resource Group**: https://portal.azure.com/#@vorba.com/resource/subscriptions/236217f7-0ad4-4dd6-8553-dc4b574fd2c5/resourceGroups/vorba-file-service-rg
- **Key Vault**: https://portal.azure.com/#@vorba.com/resource/subscriptions/236217f7-0ad4-4dd6-8553-dc4b574fd2c5/resourceGroups/vorba-sand-rg/providers/Microsoft.KeyVault/vaults/vorba-sand-kv-2
- **Storage Account**: https://portal.azure.com/#@vorba.com/resource/subscriptions/236217f7-0ad4-4dd6-8553-dc4b574fd2c5/resourceGroups/vorba-sand-rg/providers/Microsoft.Storage/storageAccounts/ccastore01

## 🛠️ Management Commands

### Check App Service Status
```bash
az webapp show --name vorba-file-service --resource-group vorba-file-service-rg
```

### View Logs
```bash
az webapp log tail --name vorba-file-service --resource-group vorba-file-service-rg
```

### Restart App Service
```bash
az webapp restart --name vorba-file-service --resource-group vorba-file-service-rg
```

### Check Environment Variables
```bash
az webapp config appsettings list --name vorba-file-service --resource-group vorba-file-service-rg
```

### Update Environment Variable
```bash
az webapp config appsettings set --name vorba-file-service --resource-group vorba-file-service-rg --settings NEW_VAR=value
```

## 📊 Monitoring

### Application Insights (Optional)
Consider enabling Application Insights for:
- Performance monitoring
- Error tracking
- Usage analytics
- Custom metrics

### Log Analytics (Optional)
Consider setting up Log Analytics for:
- Centralized logging
- Advanced querying
- Alerting

## 🔒 Security

### Network Security
- **HTTPS**: Enabled (Azure-managed certificates)
- **IP Restrictions**: None configured (allow all)
- **VNet Integration**: Not configured

### Authentication
- **JWT Bearer Tokens**: Required for all file operations
- **Health Endpoint**: Public (no authentication required)
- **Key Vault**: RBAC-protected

### Data Protection
- **Storage**: Azure Blob Storage with encryption at rest
- **Secrets**: Stored in Key Vault
- **Connection Strings**: Managed by Azure App Service

## 💰 Cost Estimation

### Current Resources
- **App Service Plan (B1)**: ~$13/month
- **App Service**: Included in plan
- **Storage**: Pay per use (~$0.02/GB/month)
- **Key Vault**: Pay per use (~$0.03/10K operations)

### Total Estimated Cost
- **Monthly**: ~$15-20 USD
- **Annual**: ~$180-240 USD

## 🚀 Scaling Options

### Vertical Scaling
- Upgrade App Service Plan to S1, S2, S3, etc.
- More CPU, memory, and features

### Horizontal Scaling
- Enable multiple instances
- Add load balancer
- Use Azure Front Door for global distribution

### Storage Scaling
- Upgrade to Premium Storage for better performance
- Add CDN for global file access
- Implement file lifecycle management 