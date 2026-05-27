# Azure Resources Reference

This document provides a quick reference for the Azure resources deployed for the Vorba File Service.

## Cost and Deployment Resource Map

This section explains which deployment references map to billable Azure resources, where they live, and how they affect cost.

### Scope Clarification
- The repository currently references two hosting patterns:
	- App Service deployment path (web app resources).
	- Azure Container Instances deployment path via workflow `.github/workflows/azure-deploy-aci.yml`.
- Most recent cost concern was tied to the ACI path, specifically `vorba-file-service-4`.

### Deployment Reference to Billable Resource Mapping

| Deployment Reference | Azure Resource | Resource Group | Cost Behavior | Notes |
|---|---|---|---|---|
| `RESOURCE_GROUP=vorba-file-service-rg` | Resource container for file-service stack | `vorba-file-service-rg` | No direct cost | Holds most compute/monitoring resources. |
| `ACI_NAME=vorba-file-service-4` | Azure Container Instance container group | `vorba-file-service-rg` | Charged while running (CPU + memory per second) | Includes app container and Caddy sidecar. |
| Caddy sidecar in ACI template | Additional container in same ACI group | `vorba-file-service-rg` | Increases runtime compute cost while ACI is running | Adds HTTPS and reverse proxy. |
| `LOG_ANALYTICS_WORKSPACE_NAME=vorba-file-service-logs` | Log Analytics workspace | `vorba-file-service-rg` | Ingestion and retention costs | Used for ACI logging. |
| App Insights (`vorba-file-service-4-insights`) | Application Insights component | `vorba-file-service-rg` | Data volume and retention costs | Linked to workspace-backed monitoring. |
| `ACR_NAME=vorbaacr` | Azure Container Registry (Basic) | `vorba-file-service-rg` | Baseline registry + storage/network usage | Stores deployment images. |
| `STORAGE_ACCOUNT_NAME=ccastore01` + Caddy shares | Azure Files shares (`aci-caddy-config`, `aci-caddy-data`, `aci-caddy-state`) | `cca-cc-rg-01` | Storage capacity/transactions | Persists Caddy config and certificate state. |
| `SQL_SERVER_NAME=vorba-sql-svr-1` | Azure SQL logical server + databases | `vorba-file-service-rg` | Compute/storage/service tier charges | Cost independent of ACI run state. |
| `vorba-file-service-plan` (B1) | App Service Plan | `vorba-file-service-rg` | Baseline monthly compute cost | Supports web app hosting path. |
| `vorba-file-service`, `-2`, `-3` | App Services | `vorba-file-service-rg` | Included in plan capacity, plus optional diagnostics | Web endpoints hosted on App Service. |

### Current Cost-Relevant State
- `vorba-file-service-4` was stopped to reduce cost.
- Additional ACI groups (`vorba-file-service-5`, `vorba-file-service-debug`) exist and should be reviewed for retention or cleanup.
- Monitoring resources and registry/storage can still generate cost even when ACI compute is stopped.

### Cost Control Priority (Dev Mode)
1. Keep ACI-based PDF service stopped unless explicitly needed.
2. Split PDF generation into its own on-demand service path.
3. Consolidate overlapping monitoring workspaces/components.
4. Keep core web/API traffic on lighter always-on hosting.

## 🏗️ Deployed Resources

### Resource Group
- **Name**: `vorba-file-service-rg`
- **Location**: Canada East
- **Purpose**: Contains all file service resources

### App Service Plan
- **Purpose**: Hosting plan for the web application

- **Purpose**: Hosts the NestJS file service application


### Key Vault Integration

## 🔧 Configuration
## 🏗️ Deployed Resources - Two Deployment Paths
- `NODE_ENV=production`
- `AZURE_KEY_VAULT_URL=https://vorba-sand-kv-2.vault.azure.net/`
- **Purpose**: Allows the app to access Key Vault and Storage without storing credentials


### Application Endpoints
- **Storage Account**: https://portal.azure.com/#@vorba.com/resource/subscriptions/236217f7-0ad4-4dd6-8553-dc4b574fd2c5/resourceGroups/vorba-sand-rg/providers/Microsoft.Storage/storageAccounts/ccastore01

```bash
az webapp show --name vorba-file-service --resource-group vorba-file-service-rg
```

### View Logs
```bash
az webapp log tail --name vorba-file-service --resource-group vorba-file-service-rg
## 🛠️ Management Commands
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

Use the mapping in **Cost and Deployment Resource Map** as the primary source for cost attribution.

For deeper analysis, action tracking, and optimization steps, see:
- `docs/AZURE_RESOURCE_COST_BUDGET.md`

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