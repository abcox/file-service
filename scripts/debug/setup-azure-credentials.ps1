#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Setup Azure Credentials for Local Testing

.DESCRIPTION
    This script helps set up Azure credentials for local testing with Key Vault access.
    It creates a service principal and sets environment variables for authentication.

.EXAMPLE
    .\setup-azure-credentials.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "Setting up Azure Credentials for Local Testing" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Check if already logged in
try {
    $account = az account show 2>$null
    if ($account) {
        Write-Host "[OK] Already logged into Azure" -ForegroundColor Green
        $accountInfo = $account | ConvertFrom-Json
        Write-Host "Subscription: $($accountInfo.name)" -ForegroundColor Cyan
        Write-Host "Tenant ID: $($accountInfo.tenantId)" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Not logged into Azure. Please run 'az login' first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Azure CLI not available or not logged in." -ForegroundColor Red
    Write-Host "Please install Azure CLI and run 'az login'" -ForegroundColor Yellow
    exit 1
}

# Get current subscription
$subscription = az account show --query "id" --output tsv
$tenantId = az account show --query "tenantId" --output tsv

Write-Host "`n[STEP 1] Creating Service Principal for local testing..." -ForegroundColor Yellow

# Create service principal name
$spName = "file-service-local-test-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

try {
    # Create service principal
    $spResult = az ad sp create-for-rbac --name $spName --role "Key Vault Secrets User" --scopes "/subscriptions/$subscription" --output json 2>$null
    
    if ($spResult) {
        $spInfo = $spResult | ConvertFrom-Json
        Write-Host "[SUCCESS] Service Principal created" -ForegroundColor Green
        Write-Host "App ID: $($spInfo.appId)" -ForegroundColor Cyan
        Write-Host "Display Name: $($spInfo.displayName)" -ForegroundColor Cyan
        
        # Set environment variables
        $env:AZURE_CLIENT_ID = $spInfo.appId
        $env:AZURE_TENANT_ID = $tenantId
        $env:AZURE_CLIENT_SECRET = $spInfo.password
        
        Write-Host "`n[STEP 2] Setting environment variables..." -ForegroundColor Yellow
        Write-Host "AZURE_CLIENT_ID=$($spInfo.appId)" -ForegroundColor Gray
        Write-Host "AZURE_TENANT_ID=$tenantId" -ForegroundColor Gray
        Write-Host "AZURE_CLIENT_SECRET=***hidden***" -ForegroundColor Gray
        
        # Save to file for future use
        $envFile = "scripts\debug\.env.local"
        @"
# Azure Credentials for Local Testing
# Generated on $(Get-Date)
AZURE_CLIENT_ID=$($spInfo.appId)
AZURE_TENANT_ID=$tenantId
AZURE_CLIENT_SECRET=$($spInfo.password)
"@ | Out-File -FilePath $envFile -Encoding UTF8
        
        Write-Host "`n[SUCCESS] Credentials saved to $envFile" -ForegroundColor Green
        
        # Test Key Vault access
        Write-Host "`n[STEP 3] Testing Key Vault access..." -ForegroundColor Yellow
        
        # Get Key Vault name from config
        $configPath = "src\config\config.json"
        if (Test-Path $configPath) {
            $config = Get-Content $configPath | ConvertFrom-Json
            $keyVaultUrl = $config.azure.keyVaultUrl
            
            if ($keyVaultUrl) {
                $keyVaultName = ($keyVaultUrl -split "//")[1] -split "\." | Select-Object -First 1
                Write-Host "Testing access to Key Vault: $keyVaultName" -ForegroundColor Cyan
                
                # Test listing secrets
                try {
                    $secrets = az keyvault secret list --vault-name $keyVaultName --output table 2>$null
                    if ($secrets) {
                        Write-Host "[SUCCESS] Key Vault access confirmed" -ForegroundColor Green
                        Write-Host "Available secrets:" -ForegroundColor Cyan
                        Write-Host $secrets -ForegroundColor Gray
                    } else {
                        Write-Host "[WARNING] No secrets found or access denied" -ForegroundColor Yellow
                    }
                } catch {
                    Write-Host "[WARNING] Could not test Key Vault access: $_" -ForegroundColor Yellow
                }
            } else {
                Write-Host "[WARNING] Key Vault URL not found in config" -ForegroundColor Yellow
            }
        } else {
            Write-Host "[WARNING] Config file not found at $configPath" -ForegroundColor Yellow
        }
        
        Write-Host "`n[COMPLETE] Azure credentials setup complete!" -ForegroundColor Green
        Write-Host "You can now run: npm run debug:local-docker" -ForegroundColor Cyan
        Write-Host "`n[IMPORTANT] These credentials are for local testing only." -ForegroundColor Yellow
        Write-Host "Delete the service principal when done: az ad sp delete --id $($spInfo.appId)" -ForegroundColor Yellow
        
    } else {
        Write-Host "[ERROR] Failed to create service principal" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Failed to create service principal: $_" -ForegroundColor Red
    exit 1
}
