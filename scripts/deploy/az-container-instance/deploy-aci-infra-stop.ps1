#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure Container Instances Stop Script

.DESCRIPTION
    This script stops billable ACI resources to prevent charges when not in use.
    It stops the ACI instance but preserves all infrastructure.

.PARAMETER ResourceGroupName
    Resource Group name (default: "vorba-file-service-rg")

.PARAMETER AciName
    ACI instance name (default: "vorba-file-service-4")

.PARAMETER DryRun
    Show what would be stopped without making any changes

.PARAMETER Force
    Skip confirmation prompts

.EXAMPLE
    .\deploy-aci-infra-stop.ps1

.EXAMPLE
    .\deploy-aci-infra-stop.ps1 -DryRun

.EXAMPLE
    .\deploy-aci-infra-stop.ps1 -Force
#>

param(
    [string]$ResourceGroupName = "vorba-file-service-rg",
    [string]$AciName = "vorba-file-service-4",
    [switch]$DryRun,
    [switch]$Force
)

# Set error action preference
$ErrorActionPreference = "Stop"

Write-Host "Azure Container Instances Stop Script" -ForegroundColor Yellow
Write-Host "=====================================" -ForegroundColor Yellow

# Show what will be stopped
Write-Host "`n[INFO] Resources that will be stopped:" -ForegroundColor Yellow
Write-Host "  - ACI Instance: $AciName" -ForegroundColor Gray

Write-Host "`n[INFO] Resources that will be preserved:" -ForegroundColor Green
Write-Host "  - Container Registry: vorbaacr" -ForegroundColor Gray
Write-Host "  - Log Analytics Workspace: $AciName-workspace" -ForegroundColor Gray
Write-Host "  - Application Insights: $AciName-insights" -ForegroundColor Gray
Write-Host "  - Resource Group: $ResourceGroupName" -ForegroundColor Gray

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

# Function to confirm stop
function Confirm-Stop {
    if ($Force) {
        return $true
    }
    
    Write-Host "`n[INFO] This will stop the ACI instance to prevent charges:" -ForegroundColor Yellow
    Write-Host "  - ACI Instance: $AciName" -ForegroundColor Gray
    Write-Host "  - All infrastructure will be preserved" -ForegroundColor Gray
    Write-Host "  - You can restart it anytime with: npm run deploy:aci" -ForegroundColor Gray
    
    $confirmation = Read-Host "`nDo you want to stop the ACI instance? (y/N)"
    return $confirmation -eq "y" -or $confirmation -eq "Y"
}

# Function to check ACI status
function Get-ContainerInstanceStatus {
    param([string]$Name, [string]$ResourceGroup)
    
    try {
        $aci = az container show --name $Name --resource-group $ResourceGroup --output json 2>$null | ConvertFrom-Json
        return $aci
    }
    catch {
        return $null
    }
}

# Function to stop ACI instance
function Stop-ContainerInstance {
    param([string]$Name, [string]$ResourceGroup)
    
    Write-Host "Stopping ACI Instance: $Name" -ForegroundColor Yellow
    
    if ($DryRun) {
        Write-Host "[DRY RUN] Would stop ACI Instance: $Name" -ForegroundColor Cyan
        return
    }
    
    try {
        az container stop --name $Name --resource-group $ResourceGroup --output none
        Write-Host "[OK] ACI Instance '$Name' stopped successfully" -ForegroundColor Green
    }
    catch {
        Write-Host "[WARNING] Failed to stop ACI Instance '$Name' (may not exist or already stopped): $($_.Exception.Message)" -ForegroundColor Yellow
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

# Function to show cost savings
function Show-CostSavings {
    Write-Host "`n[INFO] Cost Savings:" -ForegroundColor Cyan
    Write-Host "  - ACI charges: ~$0.12/hour when running" -ForegroundColor Gray
    Write-Host "  - ACI charges: $0.00/hour when stopped" -ForegroundColor Gray
    Write-Host "  - Daily savings: ~$2.88 when stopped" -ForegroundColor Gray
    Write-Host "  - Monthly savings: ~$86 when stopped" -ForegroundColor Gray
}

# Main execution
try {
    Write-Host "`n[STEP] Checking prerequisites..." -ForegroundColor Blue
    
    if (-not (Test-AzureCLI)) { exit 1 }
    if (-not (Test-AzureLogin)) { exit 1 }
    
    # Check if resource group exists
    if (-not (Test-ResourceGroup -Name $ResourceGroupName)) {
        Write-Host "[WARNING] Resource Group '$ResourceGroupName' does not exist. Nothing to stop." -ForegroundColor Yellow
        exit 0
    }
    
    # Check ACI status
    Write-Host "`n[STEP] Checking ACI status..." -ForegroundColor Blue
    $aciStatus = Get-ContainerInstanceStatus -Name $AciName -ResourceGroup $ResourceGroupName
    
    if (-not $aciStatus) {
        Write-Host "[INFO] ACI Instance '$AciName' does not exist. Nothing to stop." -ForegroundColor Yellow
        Show-CostSavings
        exit 0
    }
    
    $currentState = $aciStatus.provisioningState
    Write-Host "[INFO] ACI Instance '$AciName' current state: $currentState" -ForegroundColor Cyan
    
    if ($currentState -eq "Succeeded") {
        $running = $aciStatus.containers[0].instanceView.currentState.state
        Write-Host "[INFO] Container state: $running" -ForegroundColor Cyan
        
        if ($running -eq "Running") {
            Write-Host "[INFO] ACI is currently running and incurring charges" -ForegroundColor Yellow
        }
        else {
            Write-Host "[INFO] ACI is already stopped (state: $running)" -ForegroundColor Green
            Show-CostSavings
            exit 0
        }
    }
    else {
        Write-Host "[INFO] ACI is not in a running state (state: $currentState)" -ForegroundColor Yellow
        Show-CostSavings
        exit 0
    }
    
    Write-Host "`n[STEP] Confirming stop..." -ForegroundColor Blue
    
    if (-not (Confirm-Stop)) {
        Write-Host "[INFO] Stop cancelled by user" -ForegroundColor Yellow
        exit 0
    }
    
    Write-Host "`n[STEP] Stopping ACI..." -ForegroundColor Blue
    
    # Stop ACI instance
    Stop-ContainerInstance -Name $AciName -ResourceGroup $ResourceGroupName
    
    Write-Host "`n[STEP] Stop complete!" -ForegroundColor Green
    Write-Host "`n[INFO] Preserved resources:" -ForegroundColor Cyan
    Write-Host "  - Container Registry: vorbaacr" -ForegroundColor Gray
    Write-Host "  - Log Analytics Workspace: $AciName-workspace" -ForegroundColor Gray
    Write-Host "  - Application Insights: $AciName-insights" -ForegroundColor Gray
    Write-Host "  - Resource Group: $ResourceGroupName" -ForegroundColor Gray
    
    Show-CostSavings
    
    Write-Host "`n[INFO] To restart ACI, run:" -ForegroundColor Cyan
    Write-Host "  npm run deploy:aci" -ForegroundColor Gray
    
    Write-Host "`n[INFO] To check ACI status, run:" -ForegroundColor Cyan
    Write-Host "  az container show --name $AciName --resource-group $ResourceGroupName --query 'containers[0].instanceView.currentState.state'" -ForegroundColor Gray
    
}
catch {
    Write-Host "`n[ERROR] Stop operation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
