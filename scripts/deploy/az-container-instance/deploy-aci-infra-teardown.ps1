#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure Container Instances Infrastructure Teardown Script

.DESCRIPTION
    This script removes ACI-specific infrastructure resources while preserving
    dependent resources like Key Vault and Storage Account.

.PARAMETER ResourceGroupName
    Resource Group name (default: "vorba-file-service-rg")

.PARAMETER ContainerRegistryName
    Azure Container Registry name (default: "vorbaacr")

.PARAMETER AciName
    ACI instance name (default: "vorba-file-service-4")

.PARAMETER DryRun
    Show what would be deleted without making any changes

.PARAMETER Force
    Skip confirmation prompts

.EXAMPLE
    .\deploy-aci-infra-teardown.ps1

.EXAMPLE
    .\deploy-aci-infra-teardown.ps1 -DryRun

.EXAMPLE
    .\deploy-aci-infra-teardown.ps1 -Force
#>

param(
    [string]$ResourceGroupName = "vorba-file-service-rg",
    [string]$ContainerRegistryName = "vorbaacr",
    [string]$AciName = "vorba-file-service-4",
    [switch]$DryRun,
    [switch]$Force
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "Azure Container Instances Infrastructure Teardown Script" -ForegroundColor Red
Write-Host "=========================================================" -ForegroundColor Red

# Show what will be deleted
Write-Host "`n[INFO] Resources that will be deleted:" -ForegroundColor Yellow
Write-Host "  - ACI Instance: $AciName" -ForegroundColor Gray
Write-Host "  - Container Registry: $ContainerRegistryName" -ForegroundColor Gray
Write-Host "  - Log Analytics Workspace: $AciName-workspace" -ForegroundColor Gray
Write-Host "  - Application Insights: $AciName-insights" -ForegroundColor Gray

Write-Host "`n[INFO] Resources that will be preserved:" -ForegroundColor Green
Write-Host "  - Resource Group: $ResourceGroupName" -ForegroundColor Gray
Write-Host "  - Key Vault (external dependency)" -ForegroundColor Gray
Write-Host "  - Storage Account (external dependency)" -ForegroundColor Gray

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

# Function to confirm deletion
function Confirm-Deletion {
    if ($Force) {
        return $true
    }
    
    Write-Host "`n[WARNING] This will permanently delete the following resources:" -ForegroundColor Red
    Write-Host "  - ACI Instance: $AciName" -ForegroundColor Yellow
    Write-Host "  - Container Registry: $ContainerRegistryName" -ForegroundColor Yellow
    Write-Host "  - Log Analytics Workspace: $AciName-workspace" -ForegroundColor Yellow
    Write-Host "  - Application Insights: $AciName-insights" -ForegroundColor Yellow
    
    $confirmation = Read-Host "`nAre you sure you want to continue? (y/N)"
    return $confirmation -eq "y" -or $confirmation -eq "Y"
}

# Function to delete ACI instance
function Remove-ContainerInstance {
    param([string]$Name, [string]$ResourceGroup)
    
    Write-Host "Deleting ACI Instance: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would delete ACI Instance: $Name" -ForegroundColor Cyan
        return
    }
    
    try {
        az container delete --name $Name --resource-group $ResourceGroup --yes --output none
        Write-Host "[OK] ACI Instance '$Name' deleted successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Failed to delete ACI Instance '$Name' (may not exist): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to delete Container Registry
function Remove-ContainerRegistry {
    param([string]$Name, [string]$ResourceGroup)
    
    Write-Host "Deleting Container Registry: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would delete Container Registry: $Name" -ForegroundColor Cyan
        return
    }
    
    try {
        az acr delete --name $Name --resource-group $ResourceGroup --yes --output none
        Write-Host "[OK] Container Registry '$Name' deleted successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Failed to delete Container Registry '$Name' (may not exist): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to delete Log Analytics Workspace
function Remove-LogAnalyticsWorkspace {
    param([string]$Name, [string]$ResourceGroup)
    
    Write-Host "Deleting Log Analytics Workspace: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would delete Log Analytics Workspace: $Name" -ForegroundColor Cyan
        return
    }
    
    try {
        az monitor log-analytics workspace delete --workspace-name $Name --resource-group $ResourceGroup --yes --output none
        Write-Host "[OK] Log Analytics Workspace '$Name' deleted successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Failed to delete Log Analytics Workspace '$Name' (may not exist): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to delete Application Insights
function Remove-ApplicationInsights {
    param([string]$Name, [string]$ResourceGroup)
    
    Write-Host "Deleting Application Insights: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would delete Application Insights: $Name" -ForegroundColor Cyan
        return
    }
    
    try {
        az monitor app-insights component delete --app $Name --resource-group $ResourceGroup --yes --output none
        Write-Host "[OK] Application Insights '$Name' deleted successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Failed to delete Application Insights '$Name' (may not exist): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Function to check if resource group exists
function Test-ResourceGroup {
    param([string]$Name)
    
    try {
        $rg = az group show --name $Name --output json 2>$null | ConvertFrom-Json
        return $rg -ne $null
    }
    catch {
        return $false
    }
}

# Main execution
try {
    Write-Host "`n[STEP] Checking prerequisites..." -ForegroundColor Blue
    
    if (-not (Test-AzureCLI)) { exit 1 }
    if (-not (Test-AzureLogin)) { exit 1 }
    
    # Check if resource group exists
    if (-not (Test-ResourceGroup -Name $ResourceGroupName)) {
        Write-Host "[WARNING] Resource Group '$ResourceGroupName' does not exist. Nothing to delete." -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "`n[STEP] Confirming deletion..." -ForegroundColor Blue
    
    if (-not (Confirm-Deletion)) {
        Write-Host "[INFO] Teardown cancelled by user" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "`n[STEP] Starting teardown..." -ForegroundColor Blue
    
    # Delete ACI instance first (if it exists)
    Remove-ContainerInstance -Name $AciName -ResourceGroup $ResourceGroupName
    
    # Delete Application Insights
    Remove-ApplicationInsights -Name "$AciName-insights" -ResourceGroup $ResourceGroupName
    
    # Delete Log Analytics Workspace
    Remove-LogAnalyticsWorkspace -Name "$AciName-workspace" -ResourceGroup $ResourceGroupName
    
    # Delete Container Registry (this will also delete all container images)
    Remove-ContainerRegistry -Name $ContainerRegistryName -ResourceGroup $ResourceGroupName
    
    Write-Host "`n[STEP] Teardown complete!" -ForegroundColor Green
    Write-Host "`n[INFO] Preserved resources:" -ForegroundColor Cyan
    Write-Host "  - Resource Group: $ResourceGroupName" -ForegroundColor Gray
    Write-Host "  - Key Vault (external dependency)" -ForegroundColor Gray
    Write-Host "  - Storage Account (external dependency)" -ForegroundColor Gray
    
    Write-Host "`n[INFO] To recreate ACI infrastructure, run:" -ForegroundColor Cyan
    Write-Host "  npm run deploy:aci" -ForegroundColor Gray
    
}
catch {
    Write-Host "`n[ERROR] Teardown failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
