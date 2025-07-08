#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure Deployment Script for Vorba File Service

.DESCRIPTION
    This script checks for existing Azure resources and creates any missing ones.
    It supports deployment to different subscriptions and resource groups.

.PARAMETER SubscriptionId
    Azure Subscription ID (optional - will use current if not specified)

.PARAMETER ResourceGroupName
    Resource Group name (default: "vorba-file-service-rg")

.PARAMETER Location
    Azure region (default: "East US")

.PARAMETER AppServiceName
    App Service name (default: "vorba-file-service")

.PARAMETER AppServicePlanName
    App Service Plan name (default: "vorba-file-service-plan")

.PARAMETER KeyVaultName
    Existing Key Vault name (required)

.PARAMETER StorageAccountName
    Existing Storage Account name (required)

.PARAMETER ContainerName
    Blob container name (default: "file-service-uploads")

.PARAMETER SkipResourceCreation
    Skip resource creation and only configure existing resources

.PARAMETER DryRun
    Show what would be created/configured without making any changes

.EXAMPLE
    .\deploy-infra.ps1 -KeyVaultName "my-keyvault" -StorageAccountName "mystorageaccount"

.EXAMPLE
    .\deploy-infra.ps1 -SubscriptionId "12345678-1234-1234-1234-123456789012" -ResourceGroupName "my-rg"

.EXAMPLE
    .\deploy-infra.ps1 -KeyVaultName "my-keyvault" -StorageAccountName "mystorage" -DryRun
#>

param(
    [string]$SubscriptionId,
    [string]$ResourceGroupName = "vorba-file-service-rg",
    [string]$Location = "Canada East",
    [string]$AppServiceName = "vorba-file-service",
    [string]$AppServicePlanName = "vorba-file-service-plan",
    
    # TODO: review and implement these parameters:
    [string]$AppServicePrincipleDisplayName = "file-service-sp",
    [string]$KeyVaultName = "vorba-file-service-kv",
    [string]$StorageAccountName = "ccastore01",
    # TODO: review and implement these parameters:
    [string]$AzureClientId,
    [string]$AzureClientSecret, # WARNING: we can't retrieve, but we can "reset", which means each run would result in indempotent deployment reconfig of the App Service settings with new AZURE_CLIENT_SECRET
    [string]$AzureTenantId,

    # TODO: review and implement these parameters:
    [string]$Port = "8080",
    
    [Parameter(Mandatory=$true)]
    [string]$ContainerName = "file-service-uploads",
    [switch]$SkipResourceCreation,
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "Vorba File Service Azure Deployment Script" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Show resource dependencies
Write-Host "`n[INFO] Resource Dependencies:" -ForegroundColor Cyan
Write-Host "  - App Service Plan requires: Resource Group" -ForegroundColor Gray
Write-Host "  - App Service requires: Resource Group + App Service Plan" -ForegroundColor Gray
Write-Host "  - Blob Container requires: Storage Account (independent)" -ForegroundColor Gray
Write-Host "  - Key Vault and Storage Account: Must exist (external dependencies)" -ForegroundColor Gray

# Function to check if Azure CLI is installed
function Test-AzureCLI {
    try {
        $null = az version
        Write-Host "[OK] Azure CLI is installed" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERROR] Azure CLI is not installed. Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Red
        return $false
    }
}

# Function to check if logged in to Azure
function Test-AzureLogin {
    try {
        $account = az account show 2>$null | ConvertFrom-Json
        if ($account) {
                    Write-Host "[OK] Logged in to Azure as: $($account.user.name)" -ForegroundColor Green
        Write-Host "   Subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan
            return $account
        }
        else {
            Write-Host "[ERROR] Not logged in to Azure" -ForegroundColor Red
            return $null
        }
    }
    catch {
        Write-Host "[ERROR] Not logged in to Azure" -ForegroundColor Red
        return $null
    }
}

# Function to set subscription
function Set-AzureSubscription {
    param([string]$SubscriptionId)
    
    if ($SubscriptionId) {
        Write-Host "[INFO] Setting subscription to: $SubscriptionId" -ForegroundColor Yellow
        az account set --subscription $SubscriptionId
        $account = az account show | ConvertFrom-Json
        Write-Host "[OK] Subscription set to: $($account.name)" -ForegroundColor Green
    }
}

# Function to check if resource group exists
function Test-ResourceGroup {
    param([string]$ResourceGroupName)
    
    Write-Host "[DEBUG] Checking for Resource Group: $ResourceGroupName" -ForegroundColor Magenta
    
    # Method 1: Use az group list with query filter (more reliable)
    try {
        $rg = az group list --query "[?name=='$ResourceGroupName']" --output json 2>$null | ConvertFrom-Json
        if ($rg -and $rg.Count -gt 0) {
            Write-Host "[OK] Resource Group exists: $ResourceGroupName" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[INFO] Resource Group does not exist: $ResourceGroupName" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "[INFO] Resource Group does not exist: $ResourceGroupName" -ForegroundColor Yellow
        return $false
    }
}

# Function to create resource group
function New-ResourceGroup {
    param([string]$ResourceGroupName, [string]$Location, [bool]$DryRun = $false)
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create Resource Group: $ResourceGroupName in $Location" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Creating Resource Group: $ResourceGroupName in $Location" -ForegroundColor Yellow
    az group create --name $ResourceGroupName --location $Location
    Write-Host "[OK] Resource Group created: $ResourceGroupName" -ForegroundColor Green
}

# Function to check if App Service Plan exists
function Test-AppServicePlan {
    param([string]$AppServicePlanName, [string]$ResourceGroupName)
    
    # First check if the resource group exists
    try {
        $rg = az group list --query "[?name=='$ResourceGroupName']" --output json 2>$null | ConvertFrom-Json
        if (-not $rg -or $rg.Count -eq 0) {
            Write-Host "[INFO] Resource Group does not exist: $ResourceGroupName" -ForegroundColor Yellow
            Write-Host "[INFO] Checking for App Service Plan globally..." -ForegroundColor Yellow
            
            # Global search for App Service Plan
            $globalPlan = az appservice plan list --query "[?name=='$AppServicePlanName']" --output json 2>$null | ConvertFrom-Json
            if ($globalPlan -and $globalPlan.Count -gt 0) {
                $foundRg = $globalPlan[0].resourceGroup
                Write-Host "[WARNING] App Service Plan exists in different Resource Group: $AppServicePlanName (in $foundRg)" -ForegroundColor Yellow
                return $true
            }
            else {
                Write-Host "[INFO] App Service Plan does not exist globally: $AppServicePlanName" -ForegroundColor Yellow
                return $false
            }
        }
        
        $plan = az appservice plan show --name $AppServicePlanName --resource-group $ResourceGroupName 2>$null | ConvertFrom-Json
        if ($plan) {
            Write-Host "[OK] App Service Plan exists: $AppServicePlanName" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[INFO] App Service Plan does not exist: $AppServicePlanName" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "[INFO] Resource Group does not exist: $ResourceGroupName" -ForegroundColor Yellow
        Write-Host "[INFO] Checking for App Service Plan globally..." -ForegroundColor Yellow
        
        # Global search for App Service Plan
        try {
            $globalPlan = az appservice plan list --query "[?name=='$AppServicePlanName']" --output json 2>$null | ConvertFrom-Json
            if ($globalPlan -and $globalPlan.Count -gt 0) {
                $foundRg = $globalPlan[0].resourceGroup
                Write-Host "[WARNING] App Service Plan exists in different Resource Group: $AppServicePlanName (in $foundRg)" -ForegroundColor Yellow
                return $true
            }
            else {
                Write-Host "[INFO] App Service Plan does not exist globally: $AppServicePlanName" -ForegroundColor Yellow
                return $false
            }
        }
        catch {
            Write-Host "[INFO] App Service Plan does not exist globally: $AppServicePlanName" -ForegroundColor Yellow
            return $false
        }
    }
}

# Function to create App Service Plan
function New-AppServicePlan {
    param([string]$AppServicePlanName, [string]$ResourceGroupName, [string]$Location, [bool]$DryRun = $false)
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create App Service Plan: $AppServicePlanName in $ResourceGroupName" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Creating App Service Plan: $AppServicePlanName" -ForegroundColor Yellow
    az appservice plan create --name $AppServicePlanName --resource-group $ResourceGroupName --location $Location --sku B1 --is-linux
    Write-Host "[OK] App Service Plan created: $AppServicePlanName" -ForegroundColor Green
}

# Function to check if App Service exists
function Test-AppService {
    param([string]$AppServiceName, [string]$ResourceGroupName)
    
    Write-Host "[DEBUG] Checking for App Service: $AppServiceName in $ResourceGroupName" -ForegroundColor Magenta
    
    try {
        # First try to check in the specific resource group
        $app = az webapp show --name $AppServiceName --resource-group $ResourceGroupName 2>$null | ConvertFrom-Json
        if ($app) {
            Write-Host "[OK] App Service exists: $AppServiceName" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[INFO] App Service does not exist in resource group: $AppServiceName" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "[INFO] App Service does not exist in resource group: $AppServiceName" -ForegroundColor Yellow
        return $false
    }
}

# Function to create App Service
function New-AppService {
    param([string]$AppServiceName, [string]$ResourceGroupName, [string]$AppServicePlanName, [bool]$DryRun = $false)
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create App Service: $AppServiceName in $ResourceGroupName" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Creating App Service: $AppServiceName" -ForegroundColor Yellow
    az webapp create --name $AppServiceName --resource-group $ResourceGroupName --plan $AppServicePlanName --runtime "NODE:22-lts"
    Write-Host "[OK] App Service created: $AppServiceName" -ForegroundColor Green
    
    # Configure startup command for proper file structure
    Write-Host "[INFO] Configuring startup command..." -ForegroundColor Yellow
    az webapp config set --name $AppServiceName --resource-group $ResourceGroupName --startup-file "node dist/main.js"
    Write-Host "[OK] Startup command configured: node dist/main.js" -ForegroundColor Green
}

# Function to check if Key Vault exists
function Test-KeyVault {
    param([string]$KeyVaultName)
    
    $kv = az keyvault show --name $KeyVaultName 2>$null | ConvertFrom-Json
    if ($kv) {
        Write-Host "[OK] Key Vault exists: $KeyVaultName" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[ERROR] Key Vault does not exist: $KeyVaultName" -ForegroundColor Red
        return $false
    }
}

# Function to check if Storage Account exists
function Test-StorageAccount {
    param([string]$StorageAccountName)
    
    $sa = az storage account show --name $StorageAccountName 2>$null | ConvertFrom-Json
    if ($sa) {
        Write-Host "[OK] Storage Account exists: $StorageAccountName" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[ERROR] Storage Account does not exist: $StorageAccountName" -ForegroundColor Red
        return $false
    }
}

# Function to check if blob container exists
function Test-BlobContainer {
    param([string]$StorageAccountName, [string]$ContainerName)
    
    Write-Host "[DEBUG] Checking for Blob Container: $ContainerName in $StorageAccountName" -ForegroundColor Magenta
    
    try {
        $container = az storage container show --name $ContainerName --account-name $StorageAccountName 2>$null | ConvertFrom-Json
        if ($container) {
            Write-Host "[OK] Blob Container exists: $ContainerName" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[INFO] Blob Container does not exist: $ContainerName" -ForegroundColor Yellow
            return $false
        }
    }
    catch {
        Write-Host "[INFO] Blob Container does not exist: $ContainerName" -ForegroundColor Yellow
        return $false
    }
}

# Function to create blob container
function New-BlobContainer {
    param([string]$StorageAccountName, [string]$ContainerName, [bool]$DryRun = $false)
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create Blob Container: $ContainerName in $StorageAccountName" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Creating Blob Container: $ContainerName" -ForegroundColor Yellow
    az storage container create --name $ContainerName --account-name $StorageAccountName
    Write-Host "[OK] Blob Container created: $ContainerName" -ForegroundColor Green
}

# Function to configure App Service settings
function Set-AppServiceConfiguration {
    param([string]$AppServiceName, [string]$ResourceGroupName, [string]$StorageAccountName, [string]$KeyVaultName = "", [bool]$DryRun = $false)
    
    # TDDO: review this as I see hardcoded values (e.g. WEBSITE_NODE_DEFAULT_VERSION=22.14.0)
    if ($DryRun) {
        Write-Host "[DRY RUN] Would configure App Service settings for: $AppServiceName" -ForegroundColor Cyan
        Write-Host "   - NODE_ENV=production" -ForegroundColor Gray
        Write-Host "   - AZURE_KEY_VAULT_URL=https://$KeyVaultName.vault.azure.net/" -ForegroundColor Gray
        Write-Host "   - AZURE_STORAGE_CONNECTION_STRING=[connection string]" -ForegroundColor Gray
        Write-Host "   - WEBSITE_NODE_DEFAULT_VERSION=22.14.0" -ForegroundColor Gray
        Write-Host "   - AZURE_CLIENT_ID=[principalId]" -ForegroundColor Gray
        Write-Host "   - AZURE_TENANT_ID=[tenantId]" -ForegroundColor Gray
        Write-Host "   - AZURE_SUBSCRIPTION_ID=[subscriptionId]" -ForegroundColor Gray
        return
    }
    
    Write-Host "[INFO] Configuring App Service settings..." -ForegroundColor Yellow
    
    try {
        # Get storage account connection string
        Write-Host "[DEBUG] Getting storage account key..." -ForegroundColor Magenta
        $storageKey = az storage account keys list --account-name $StorageAccountName --query "[0].value" --output tsv
        if (-not $storageKey) {
            Write-Host "[ERROR] Failed to get storage account key" -ForegroundColor Red
            return
        }
        
        $connectionString = "DefaultEndpointsProtocol=https;AccountName=$StorageAccountName;AccountKey=$storageKey;EndpointSuffix=core.windows.net"
        
        # Get Key Vault URL
        $keyVaultUrl = "https://$KeyVaultName.vault.azure.net/"

        # Get App Service principalId for managed identity
        Write-Host "[DEBUG] Getting App Service principalId for managed identity..." -ForegroundColor Magenta
        $principalId = az webapp identity show --name $AppServiceName --resource-group $ResourceGroupName --query principalId --output tsv
        if (-not $principalId) {
            Write-Host "[WARNING] Could not get principalId for managed identity - will retry..." -ForegroundColor Yellow
            # Wait a moment for managed identity to propagate
            Start-Sleep -Seconds 10
            $principalId = az webapp identity show --name $AppServiceName --resource-group $ResourceGroupName --query principalId --output tsv
            if (-not $principalId) {
                Write-Host "[ERROR] Could not get principalId for managed identity after retry" -ForegroundColor Red
                return
            }
        }
        Write-Host "[OK] principalId for managed identity: $principalId" -ForegroundColor Green

        # Get tenant ID and subscription ID for additional context
        Write-Host "[DEBUG] Getting tenant and subscription IDs..." -ForegroundColor Magenta
        $account = az account show | ConvertFrom-Json
        $tenantId = $account.tenantId
        $subscriptionId = $account.id
        Write-Host "[OK] Tenant ID: $tenantId, Subscription ID: $subscriptionId" -ForegroundColor Green
        
        Write-Host "[DEBUG] Setting app settings..." -ForegroundColor Magenta
        
        # Build settings array based on available resources
        $settings = @(
            "NODE_ENV=production",
            "AZURE_STORAGE_CONNECTION_STRING=$connectionString",
            "WEBSITE_NODE_DEFAULT_VERSION=22.14.0"

            # TODO: add AZURE_CLIENT_ID, AZURE_TENANT_ID, AZURE_CLIENT_SECRET
            # And make sure to get these values from the service principal "file-service-sp"
        )
        
        # Add managed identity settings if available
        if ($principalId) {
            $settings += @(
                "AZURE_CLIENT_ID=$principalId",
                "AZURE_TENANT_ID=$tenantId",
                "AZURE_SUBSCRIPTION_ID=$subscriptionId"
            )
            Write-Host "[INFO] Managed identity settings included" -ForegroundColor Yellow
        } else {
            Write-Host "[WARNING] Managed identity settings skipped (not available)" -ForegroundColor Yellow
        }
        
        # Add Key Vault URL if Key Vault is provided
        if ($KeyVaultName -and $KeyVaultName -ne "") {
            $settings += "AZURE_KEY_VAULT_URL=$keyVaultUrl"
            Write-Host "[INFO] Key Vault configuration included" -ForegroundColor Yellow
        } else {
            Write-Host "[INFO] Key Vault configuration skipped (not provided)" -ForegroundColor Yellow
        }
        
        # Configure app settings
        $result = az webapp config appsettings set --name $AppServiceName --resource-group $ResourceGroupName --settings $settings 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] App Service configuration completed" -ForegroundColor Green
            # Verify settings were applied (without showing sensitive values)
            Write-Host "[DEBUG] Verifying app settings..." -ForegroundColor Magenta
            $settings = az webapp config appsettings list --name $AppServiceName --resource-group $ResourceGroupName --query "[?name=='NODE_ENV' || name=='AZURE_KEY_VAULT_URL' || name=='WEBSITE_NODE_DEFAULT_VERSION' || name=='AZURE_CLIENT_ID' || name=='AZURE_TENANT_ID' || name=='AZURE_SUBSCRIPTION_ID'].{name:name,value:value}" --output json 2>$null | ConvertFrom-Json
            if ($settings) {
                Write-Host "[OK] App settings verified" -ForegroundColor Green
            }
        } else {
            Write-Host "[ERROR] App Service configuration failed: $result" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] Exception during App Service configuration: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to enable managed identity
function Enable-ManagedIdentity {
    param([string]$AppServiceName, [string]$ResourceGroupName, [bool]$DryRun = $false)
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would enable managed identity for: $AppServiceName" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Enabling managed identity..." -ForegroundColor Yellow
    try {
        $result = az webapp identity assign --name $AppServiceName --resource-group $ResourceGroupName 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Managed identity enabled" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Failed to enable managed identity: $result" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] Exception during managed identity setup: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to grant Key Vault access
function Grant-KeyVaultAccess {
    param([string]$AppServiceName, [string]$ResourceGroupName, [string]$KeyVaultName = "", [bool]$DryRun = $false)
    
    if (-not $KeyVaultName -or $KeyVaultName -eq "") {
        Write-Host "[INFO] Key Vault access skipped (no Key Vault provided)" -ForegroundColor Yellow
        return
    }
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would grant Key Vault access for: $AppServiceName to $KeyVaultName" -ForegroundColor Cyan
        return
    }
    
    Write-Host "[INFO] Granting Key Vault access..." -ForegroundColor Yellow
    
    try {
        # Get App Service principal ID
        Write-Host "[DEBUG] Getting principal ID..." -ForegroundColor Magenta
        $principalId = az webapp identity show --name $AppServiceName --resource-group $ResourceGroupName --query principalId --output tsv 2>$null
        
        if ($principalId) {
            Write-Host "[DEBUG] Principal ID: $principalId" -ForegroundColor Magenta
            
            # Check if Key Vault uses RBAC or policy-based authorization
            Write-Host "[DEBUG] Checking Key Vault authorization type..." -ForegroundColor Magenta
            $kvInfo = az keyvault show --name $KeyVaultName --query "properties.enableRbacAuthorization" --output tsv 2>$null
            $subscriptionId = az account show --query id --output tsv
            $resourceGroup = az keyvault show --name $KeyVaultName --query resourceGroup --output tsv
            $scope = "/subscriptions/$subscriptionId/resourceGroups/$resourceGroup/providers/Microsoft.KeyVault/vaults/$KeyVaultName"
            
            if ($kvInfo -eq "true") {
                Write-Host "[INFO] Key Vault uses RBAC authorization. Checking for existing role assignment..." -ForegroundColor Yellow
                # Check for existing role assignment
                $existingRole = az role assignment list --assignee $principalId --scope $scope --query "[?roleDefinitionName=='Key Vault Secrets User']" --output json 2>$null | ConvertFrom-Json
                if ($existingRole -and $existingRole.Count -gt 0) {
                    Write-Host "[OK] Key Vault Secrets User role already assigned to managed identity." -ForegroundColor Green
                } else {
                    Write-Host "[INFO] Assigning Key Vault Secrets User role..." -ForegroundColor Yellow
                    $result = az role assignment create --assignee $principalId --role "Key Vault Secrets User" --scope $scope 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "[OK] Key Vault RBAC access granted" -ForegroundColor Green
                    } else {
                        Write-Host "[ERROR] Failed to grant Key Vault RBAC access: $result" -ForegroundColor Red
                    }
                }
            } else {
                Write-Host "[INFO] Key Vault uses policy-based authorization. Setting access policy..." -ForegroundColor Yellow
                # Use traditional policy-based access
                $result = az keyvault set-policy --name $KeyVaultName --object-id $principalId --secret-permissions get list 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "[OK] Key Vault policy access granted" -ForegroundColor Green
                } else {
                    Write-Host "[ERROR] Failed to grant Key Vault policy access: $result" -ForegroundColor Red
                }
            }
        }
        else {
            Write-Host "[WARNING] Could not get principal ID for managed identity" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[ERROR] Exception during Key Vault access setup: $($_.Exception.Message)" -ForegroundColor Red
    }
}



# Main execution
try {
    Write-Host "[DEBUG] Starting main execution..." -ForegroundColor Magenta
    
    # Check prerequisites
    Write-Host "[DEBUG] Checking Azure CLI..." -ForegroundColor Magenta
    if (-not (Test-AzureCLI)) {
        exit 1
    }
    
    Write-Host "[DEBUG] Checking Azure login..." -ForegroundColor Magenta
    $account = Test-AzureLogin
    if (-not $account) {
        Write-Host "[INFO] Please log in to Azure..." -ForegroundColor Yellow
        az login
        $account = Test-AzureLogin
        if (-not $account) {
            Write-Host "[ERROR] Failed to log in to Azure" -ForegroundColor Red
            exit 1
        }
    }
    
    # Set subscription if specified
    Write-Host "[DEBUG] Setting subscription..." -ForegroundColor Magenta
    Set-AzureSubscription -SubscriptionId $SubscriptionId
    
    # Check existing resources
    Write-Host "`n[INFO] Checking existing resources..." -ForegroundColor Cyan
    
    Write-Host "[DEBUG] Checking Storage Account: $StorageAccountName" -ForegroundColor Magenta
    $storageExists = Test-StorageAccount -StorageAccountName $StorageAccountName
    Write-Host "[DEBUG] Storage Account exists: $storageExists" -ForegroundColor Magenta
    
    # Check Key Vault only if provided
    $keyVaultExists = $true
    if ($KeyVaultName -and $KeyVaultName -ne "") {
        Write-Host "[DEBUG] Checking Key Vault: $KeyVaultName" -ForegroundColor Magenta
        $keyVaultExists = Test-KeyVault -KeyVaultName $KeyVaultName
        Write-Host "[DEBUG] Key Vault exists: $keyVaultExists" -ForegroundColor Magenta
    } else {
        Write-Host "[INFO] Key Vault check skipped (not provided)" -ForegroundColor Yellow
    }
    
    # Fail if required resources don't exist
    if (-not $storageExists) {
        Write-Host "[ERROR] Required resource (Storage Account) does not exist" -ForegroundColor Red
        exit 1
    }
    
    if ($KeyVaultName -and $KeyVaultName -ne "" -and -not $keyVaultExists) {
        Write-Host "[ERROR] Required resource (Key Vault) does not exist" -ForegroundColor Red
        exit 1
    }
    
    # Show dry run mode
    if ($DryRun) {
        Write-Host "`n[DRY RUN] DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
        Write-Host "=============================================" -ForegroundColor Yellow
    }
    
    # Resource creation (if not skipped)
    Write-Host "[DEBUG] SkipResourceCreation: $SkipResourceCreation" -ForegroundColor Magenta
    if (-not $SkipResourceCreation) {
        Write-Host "`n[INFO] Creating resources..." -ForegroundColor Cyan
        Write-Host "[DEBUG] About to check Resource Group: $ResourceGroupName" -ForegroundColor Magenta
        
        # Resource Group (always check first)
        $resourceGroupExists = Test-ResourceGroup -ResourceGroupName $ResourceGroupName
        Write-Host "[DEBUG] Resource Group exists: $resourceGroupExists" -ForegroundColor Magenta
        
        if (-not $resourceGroupExists) {
            Write-Host "[DEBUG] About to create Resource Group..." -ForegroundColor Magenta
            New-ResourceGroup -ResourceGroupName $ResourceGroupName -Location $Location -DryRun $DryRun
            # Update the flag after creation (unless it's a dry run)
            if (-not $DryRun) {
                $resourceGroupExists = $true
                Write-Host "[DEBUG] Updated resourceGroupExists to: $resourceGroupExists" -ForegroundColor Magenta
            }
        }
        
        # App Service Plan (only check if Resource Group exists or will be created)
        if ($resourceGroupExists -or $DryRun) {
            if (-not (Test-AppServicePlan -AppServicePlanName $AppServicePlanName -ResourceGroupName $ResourceGroupName)) {
                New-AppServicePlan -AppServicePlanName $AppServicePlanName -ResourceGroupName $ResourceGroupName -Location $Location -DryRun $DryRun
            }
        }
        
        # App Service (only check if Resource Group exists or will be created)
        if ($resourceGroupExists -or $DryRun) {
            if (-not (Test-AppService -AppServiceName $AppServiceName -ResourceGroupName $ResourceGroupName)) {
                New-AppService -AppServiceName $AppServiceName -ResourceGroupName $ResourceGroupName -AppServicePlanName $AppServicePlanName -DryRun $DryRun
            }
        }
        
        # Blob Container
        Write-Host "[DEBUG] About to check Blob Container..." -ForegroundColor Magenta
        if (-not (Test-BlobContainer -StorageAccountName $StorageAccountName -ContainerName $ContainerName)) {
            Write-Host "[DEBUG] About to create Blob Container..." -ForegroundColor Magenta
            New-BlobContainer -StorageAccountName $StorageAccountName -ContainerName $ContainerName -DryRun $DryRun
        }
    }
    
    # Configuration
    Write-Host "`n[INFO] Configuring resources..." -ForegroundColor Cyan
    
    Write-Host "[DEBUG] About to enable managed identity..." -ForegroundColor Magenta
    Enable-ManagedIdentity -AppServiceName $AppServiceName -ResourceGroupName $ResourceGroupName -DryRun $DryRun
    
    Write-Host "[DEBUG] About to configure App Service settings..." -ForegroundColor Magenta
    Set-AppServiceConfiguration -AppServiceName $AppServiceName -ResourceGroupName $ResourceGroupName -KeyVaultName $KeyVaultName -StorageAccountName $StorageAccountName -DryRun $DryRun
    
    Write-Host "[DEBUG] About to grant Key Vault access..." -ForegroundColor Magenta
    Grant-KeyVaultAccess -AppServiceName $AppServiceName -ResourceGroupName $ResourceGroupName -KeyVaultName $KeyVaultName -DryRun $DryRun
    
    # Note: Publish profiles can be obtained from Azure Portal when needed for GitHub Actions
    Write-Host "[INFO] Publish profiles can be downloaded from Azure Portal for GitHub Actions" -ForegroundColor Cyan
    Write-Host "[INFO] Portal path: App Service > Get publish profile" -ForegroundColor Cyan
    
    if ($DryRun) {
        Write-Host "`n[DRY RUN] DRY RUN COMPLETED - No changes were made" -ForegroundColor Yellow
        Write-Host "`n[INFO] To proceed with actual deployment, run without -DryRun flag" -ForegroundColor Cyan
    } else {
        Write-Host "`n[SUCCESS] Deployment setup completed successfully!" -ForegroundColor Green
        Write-Host "`n[INFO] Next steps:" -ForegroundColor Cyan
        Write-Host "1. Run 'npm run deploy-build' to deploy your application" -ForegroundColor White
        Write-Host "2. For GitHub Actions: Get publish profile from Azure Portal" -ForegroundColor White
        Write-Host "3. Add publish profile to GitHub Secrets as AZURE_WEBAPP_PUBLISH_PROFILE" -ForegroundColor White
    }
    
}
catch {
    Write-Host "`n[ERROR] Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} 