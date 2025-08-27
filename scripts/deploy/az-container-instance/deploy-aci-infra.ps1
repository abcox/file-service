#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure Container Instances Infrastructure Deployment Script

.DESCRIPTION
    This script creates the infrastructure needed for Azure Container Instances deployment.
    It sets up ACR, ACI, and related resources without deploying application code.

.PARAMETER SubscriptionId
    Azure Subscription ID (optional - will use current if not specified)

.PARAMETER ResourceGroupName
    Resource Group name (default: "vorba-file-service-rg")

.PARAMETER Location
    Azure region (default: "Canada East")

.PARAMETER ContainerRegistryName
    Azure Container Registry name (default: "vorbaacr")

.PARAMETER AciName
    ACI instance name (default: "vorba-file-service-4")

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
    .\deploy-aci-infra.ps1 -KeyVaultName "my-keyvault" -StorageAccountName "mystorageaccount"

.EXAMPLE
    .\deploy-aci-infra.ps1 -SubscriptionId "12345678-1234-1234-1234-123456789012" -ResourceGroupName "my-rg"

.EXAMPLE
    .\deploy-aci-infra.ps1 -KeyVaultName "my-keyvault" -StorageAccountName "mystorage" -DryRun
#>

param(
    [string]$SubscriptionId,
    [string]$ResourceGroupName = "vorba-file-service-rg",
    [string]$Location = "Canada East",
    [string]$ContainerRegistryName = "vorbaacr",
    [string]$AciName = "vorba-file-service-4",
    [string]$KeyVaultName = "vorba-file-service-kv",
    [string]$StorageAccountName = "ccastore01",
    [string]$ContainerName = "file-service-uploads",
    [switch]$SkipResourceCreation,
    [switch]$DryRun
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "Azure Container Instances Infrastructure Deployment Script" -ForegroundColor Green
Write-Host "=============================================================" -ForegroundColor Green

# Show resource dependencies
Write-Host "`n[INFO] Resource Dependencies:" -ForegroundColor Cyan
Write-Host "  - Container Registry requires: Resource Group" -ForegroundColor Gray
Write-Host "  - ACI requires: Resource Group + Container Registry" -ForegroundColor Gray
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
        $account = az account show --output json | ConvertFrom-Json
        Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
        Write-Host "[OK] Subscription: $($account.name)" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERROR] Not logged in to Azure. Run: az login" -ForegroundColor Red
        return $false
    }
}

# Function to check if Docker is installed
function Test-Docker {
    try {
        $dockerVersion = docker --version
        Write-Host "[OK] Docker is installed: $dockerVersion" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERROR] Docker is not installed. Please install Docker Desktop" -ForegroundColor Red
        return $false
    }
}

# Function to register required Azure providers
function Register-AzureProviders {
    Write-Host "Registering required Azure providers..." -ForegroundColor Yellow
    
    $providers = @(
        "Microsoft.ContainerInstance",
        "Microsoft.OperationalInsights", 
        "Microsoft.Insights"
    )
    
    foreach ($provider in $providers) {
        Write-Host "Checking provider: $provider" -ForegroundColor Cyan
        
        try {
            $state = az provider show --namespace $provider --query "registrationState" --output tsv 2>$null
            if ($state -eq "Registered") {
                Write-Host "[OK] Provider '$provider' is already registered" -ForegroundColor Green
            }
            else {
                Write-Host "Registering provider: $provider" -ForegroundColor Yellow
                az provider register --namespace $provider --output none
                Write-Host "[OK] Provider '$provider' registration initiated" -ForegroundColor Green
            }
        }
        catch {
            Write-Host "[WARNING] Could not check provider '$provider' status" -ForegroundColor Yellow
        }
    }
    
    Write-Host "Provider registration complete. Some registrations may take a few minutes to complete." -ForegroundColor Cyan
}

# Function to create resource group
function New-ResourceGroup {
    param([string]$Name, [string]$Location)
    
    Write-Host "Creating Resource Group: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create Resource Group: $Name in $Location" -ForegroundColor Cyan
        return
    }
    
    try {
        az group create --name $Name --location $Location --output none
        Write-Host "[OK] Resource Group '$Name' created successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to create Resource Group: $Name" -ForegroundColor Red
        throw
    }
}

# Function to create Azure Container Registry
function New-ContainerRegistry {
    param([string]$Name, [string]$ResourceGroup, [string]$Location)
    
    Write-Host "Creating Azure Container Registry: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create ACR: $Name in Resource Group: $ResourceGroup" -ForegroundColor Cyan
        return
    }
    
    try {
        # Create ACR with admin user enabled
        az acr create `
            --resource-group $ResourceGroup `
            --name $Name `
            --sku Basic `
            --admin-enabled true `
            --output none
            
        Write-Host "[OK] Container Registry '$Name' created successfully" -ForegroundColor Green
        
        # Get ACR login server
        $acrLoginServer = az acr show --name $Name --resource-group $ResourceGroup --query "loginServer" --output tsv
        Write-Host "[INFO] ACR Login Server: $acrLoginServer" -ForegroundColor Cyan
        
        return $acrLoginServer
    }
    catch {
        Write-Host "[ERROR] Failed to create Container Registry: $Name" -ForegroundColor Red
        throw
    }
}

# Function to verify existing resources
function Test-ExistingResources {
    Write-Host "Verifying existing resources..." -ForegroundColor Yellow
    
    # Check Key Vault
    try {
        $kv = az keyvault show --name $KeyVaultName --output json 2>$null | ConvertFrom-Json
        if ($kv) {
            Write-Host "[OK] Key Vault '$KeyVaultName' exists" -ForegroundColor Green
        }
        else {
            Write-Host "[WARNING] Key Vault '$KeyVaultName' not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[WARNING] Key Vault '$KeyVaultName' not found" -ForegroundColor Yellow
    }
    
    # Check Storage Account
    try {
        $sa = az storage account show --name $StorageAccountName --output json 2>$null | ConvertFrom-Json
        if ($sa) {
            Write-Host "[OK] Storage Account '$StorageAccountName' exists" -ForegroundColor Green
        }
        else {
            Write-Host "[WARNING] Storage Account '$StorageAccountName' not found" -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "[WARNING] Storage Account '$StorageAccountName' not found" -ForegroundColor Yellow
    }
}

# Function to create Log Analytics Workspace
function New-LogAnalyticsWorkspace {
    param([string]$Name, [string]$ResourceGroup, [string]$Location)
    
    Write-Host "Creating Log Analytics Workspace: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create Log Analytics Workspace: $Name" -ForegroundColor Cyan
        return $null
    }
    
    try {
        $workspace = az monitor log-analytics workspace create `
            --resource-group $ResourceGroup `
            --workspace-name $Name `
            --location $Location `
            --output json | ConvertFrom-Json
            
        Write-Host "[OK] Log Analytics Workspace '$Name' created successfully" -ForegroundColor Green
        return $workspace.customerId
    }
    catch {
        Write-Host "[ERROR] Failed to create Log Analytics Workspace: $Name" -ForegroundColor Red
        throw
    }
}

# Function to create Application Insights
function New-ApplicationInsights {
    param([string]$Name, [string]$ResourceGroup, [string]$Location, [string]$WorkspaceName)
    
    Write-Host "Creating Application Insights: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would create Application Insights: $Name" -ForegroundColor Cyan
        return $null
    }
    
    try {
        $appInsights = az monitor app-insights component create `
            --app $Name `
            --location $Location `
            --resource-group $ResourceGroup `
            --workspace $WorkspaceName `
            --output json | ConvertFrom-Json
            
        Write-Host "[OK] Application Insights '$Name' created successfully" -ForegroundColor Green
        return $appInsights.instrumentationKey
    }
    catch {
        Write-Host "[ERROR] Failed to create Application Insights: $Name" -ForegroundColor Red
        throw
    }
}

# Main execution
try {
    Write-Host "`n[STEP] Checking prerequisites..." -ForegroundColor Blue
    
    if (-not (Test-AzureCLI)) { exit 1 }
    if (-not (Test-AzureLogin)) { exit 1 }
    if (-not (Test-Docker)) { exit 1 }
    
    Write-Host "`n[STEP] Registering Azure providers..." -ForegroundColor Blue
    Register-AzureProviders
    
    Write-Host "`n[STEP] Verifying existing resources..." -ForegroundColor Blue
    Test-ExistingResources
    
    Write-Host "`n[STEP] Setting up infrastructure..." -ForegroundColor Blue
    
    if (-not $SkipResourceCreation) {
        # Create Resource Group if it doesn't exist
        $rgExists = az group show --name $ResourceGroupName --output json 2>$null | ConvertFrom-Json
        if (-not $rgExists) {
            New-ResourceGroup -Name $ResourceGroupName -Location $Location
        }
        else {
            Write-Host "[OK] Resource Group '$ResourceGroupName' already exists" -ForegroundColor Green
        }
        
        # Create Container Registry
        try {
            $acrExists = az acr show --name $ContainerRegistryName --resource-group $ResourceGroupName --output json 2>$null | ConvertFrom-Json
            if ($acrExists) {
                Write-Host "[OK] Container Registry '$ContainerRegistryName' already exists" -ForegroundColor Green
                $acrLoginServer = az acr show --name $ContainerRegistryName --resource-group $ResourceGroupName --query "loginServer" --output tsv
            }
            else {
                $acrLoginServer = New-ContainerRegistry -Name $ContainerRegistryName -ResourceGroup $ResourceGroupName -Location $Location
            }
        }
        catch {
            Write-Host "[INFO] Container Registry '$ContainerRegistryName' not found, creating new one..." -ForegroundColor Yellow
            $acrLoginServer = New-ContainerRegistry -Name $ContainerRegistryName -ResourceGroup $ResourceGroupName -Location $Location
        }
        
        # Create Log Analytics Workspace
        $workspaceName = "$AciName-workspace"
        try {
            $workspaceExists = az monitor log-analytics workspace show --resource-group $ResourceGroupName --workspace-name $workspaceName --output json 2>$null | ConvertFrom-Json
            if ($workspaceExists) {
                Write-Host "[OK] Log Analytics Workspace '$workspaceName' already exists" -ForegroundColor Green
                $workspaceId = az monitor log-analytics workspace show --resource-group $ResourceGroupName --workspace-name $workspaceName --query "customerId" --output tsv
            }
            else {
                $workspaceId = New-LogAnalyticsWorkspace -Name $workspaceName -ResourceGroup $ResourceGroupName -Location $Location
            }
        }
        catch {
            Write-Host "[INFO] Log Analytics Workspace '$workspaceName' not found, creating new one..." -ForegroundColor Yellow
            $workspaceId = New-LogAnalyticsWorkspace -Name $workspaceName -ResourceGroup $ResourceGroupName -Location $Location
        }
        
        # Create Application Insights
        $appInsightsName = "$AciName-insights"
        try {
            $appInsightsExists = az monitor app-insights component show --app $appInsightsName --resource-group $ResourceGroupName --output json 2>$null | ConvertFrom-Json
            if ($appInsightsExists) {
                Write-Host "[OK] Application Insights '$appInsightsName' already exists" -ForegroundColor Green
                $instrumentationKey = az monitor app-insights component show --app $appInsightsName --resource-group $ResourceGroupName --query "instrumentationKey" --output tsv
            }
            else {
                $instrumentationKey = New-ApplicationInsights -Name $appInsightsName -ResourceGroup $ResourceGroupName -Location $Location -WorkspaceName $workspaceName
            }
        }
        catch {
            Write-Host "[INFO] Application Insights '$appInsightsName' not found, creating new one..." -ForegroundColor Yellow
            $instrumentationKey = New-ApplicationInsights -Name $appInsightsName -ResourceGroup $ResourceGroupName -Location $Location -WorkspaceName $workspaceName
        }
    }
    
    Write-Host "`n[STEP] Infrastructure setup complete!" -ForegroundColor Green
    Write-Host "`n[INFO] Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Build and push Docker image to ACR" -ForegroundColor Gray
    Write-Host "  2. Deploy to ACI using azure-deploy-aci.yml" -ForegroundColor Gray
    Write-Host "  3. Configure environment variables in ACI" -ForegroundColor Gray
    Write-Host "  4. Test PDF generation with Playwright" -ForegroundColor Gray
    
    Write-Host "`n[INFO] Important notes:" -ForegroundColor Yellow
    Write-Host "  - ACI has no free tier - you pay per second of runtime" -ForegroundColor Gray
    Write-Host "  - Remember to stop ACI after testing to avoid charges" -ForegroundColor Gray
    Write-Host "  - Use 'az container stop' to manually stop ACI instances" -ForegroundColor Gray
    
}
catch {
    Write-Host "`n[ERROR] Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
