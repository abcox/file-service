# Quick Start: Azure Deployment

## Prerequisites

1. **Azure CLI** installed and logged in
2. **Existing Key Vault** and **Storage Account** (you mentioned you have these)
3. **PowerShell** (Windows or PowerShell Core)

## Step 1: Run the Deployment Script

### Option A: Using the Batch File (Recommended)

1. **Copy the configuration template:**
   ```cmd
   copy scripts\deploy\deploy-infra-config.bat scripts\deploy\deploy.bat
   ```

2. **Edit `scripts\deploy\deploy.bat`** and update the required values:
   ```cmd
   set KEYVAULT_NAME=your-keyvault-name
   set STORAGE_ACCOUNT_NAME=your-storage-account-name
   ```

3. **Run the deployment:**
   ```cmd
   # For dry run (recommended first)
   scripts\deploy\deploy-infra.bat
   
   # Or edit deploy-infra.bat and set DRY_RUN=true for dry run
   # Then set DRY_RUN=false for actual deployment
   ```

### Option B: Using PowerShell Directly

From the project root directory, run:

```powershell
# Basic deployment (uses existing Key Vault and Storage Account)
.\scripts\deploy\deploy-infra.ps1 -KeyVaultName "your-keyvault-name" -StorageAccountName "your-storage-account-name"

# Example with custom resource group
.\scripts\deploy\deploy-infra.ps1 -KeyVaultName "vorba-kv" -StorageAccountName "vorbastorage" -ResourceGroupName "vorba-rg"

# Skip resource creation (only configure existing App Service)
.\scripts\deploy\deploy-infra.ps1 -KeyVaultName "your-keyvault" -StorageAccountName "your-storage" -SkipResourceCreation

# Dry run (see what would be created without making changes)
.\scripts\deploy\deploy-infra.ps1 -KeyVaultName "your-keyvault" -StorageAccountName "your-storage" -DryRun

## Step 2: What the Script Does

The script will:

1. ✅ **Check prerequisites** (Azure CLI, login status)
2. ✅ **Verify existing resources** (Key Vault, Storage Account)
3. ✅ **Create missing resources** (Resource Group, App Service Plan, App Service, Blob Container)
4. ✅ **Configure App Service** (environment variables, managed identity)
5. ✅ **Grant Key Vault access** (for managed identity)
6. ✅ **Generate publish profile** (for GitHub Actions)

## Step 3: GitHub Actions Setup

After running the script:

1. **Copy the publish profile** content from the generated file
2. **Go to GitHub** → Your repo → Settings → Secrets and variables → Actions
3. **Add secret**: `AZURE_WEBAPP_PUBLISH_PROFILE` with the publish profile content

## Step 4: Deploy

Push to the `main` branch to trigger automatic deployment:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

## Dry Run Mode

Before making actual changes, you can run the script in dry-run mode to see what would be created:

### Using Batch File
```cmd
# Edit deploy-infra.bat and set:
set DRY_RUN=true

# Then run:
scripts\deploy\deploy-infra.bat
```

### Using PowerShell
```powershell
.\scripts\deploy.ps1 -KeyVaultName "your-keyvault" -StorageAccountName "your-storage" -DryRun
```

### What Dry Run Shows
- ✅ **Existing resources** that will be used
- 🔍 **Resources that would be created** (with details)
- ⚙️ **Configuration changes** that would be applied
- 📋 **Next steps** after deployment

## Troubleshooting

### Common Issues

1. **"Azure CLI not installed"**
   - Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

2. **"Not logged in to Azure"**
   - Run: `az login`

3. **"Key Vault does not exist"**
   - Verify the Key Vault name is correct
   - Ensure you have access to the Key Vault

4. **"Storage Account does not exist"**
   - Verify the Storage Account name is correct
   - Ensure you have access to the Storage Account

### Script Parameters

| Parameter | Required | Default | Description |
|-----------|----------|---------|-------------|
| `KeyVaultName` | ✅ | - | Your existing Key Vault name |
| `StorageAccountName` | ✅ | - | Your existing Storage Account name |
| `ResourceGroupName` | ❌ | `vorba-file-service-rg` | Resource Group name |
| `AppServiceName` | ❌ | `vorba-file-service` | App Service name |
| `Location` | ❌ | `East US` | Azure region |
| `SubscriptionId` | ❌ | Current | Azure Subscription ID |
| `SkipResourceCreation` | ❌ | `false` | Skip creating resources |
| `DryRun` | ❌ | `false` | Show what would be created without making changes |

### Environment Variables Set

The script configures these App Service settings:

- `NODE_ENV=production`
- `AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/`
- `AZURE_STORAGE_CONNECTION_STRING=your-connection-string`
- `WEBSITE_NODE_DEFAULT_VERSION=18.17.0`

## Next Steps

After successful deployment:

1. **Test the API** at: `https://vorba-file-service.azurewebsites.net`
2. **Check logs** in Azure App Service → Log stream
3. **Monitor** in GitHub Actions tab
4. **Set up monitoring** with Application Insights (optional)

## Security Notes

- ✅ **Managed Identity** is enabled for secure Key Vault access
- ✅ **Secrets** are stored in Key Vault, not in code
- ✅ **HTTPS** is enabled by default
- ✅ **Environment variables** are encrypted in App Service 