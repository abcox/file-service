#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Test Managed Identity Key Vault Access

.DESCRIPTION
    This script tests if the Managed Identity can access Key Vault and what secrets are available.
    This helps debug the Azure Container Instance authentication issues.

.EXAMPLE
    .\test-managed-identity.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "Testing Managed Identity Key Vault Access" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# ACI details
$aciName = "vorba-file-service-4"
$resourceGroup = "vorba-file-service-rg"
$keyVaultName = "vorba-file-service-kv"

Write-Host "`n[STEP 1] Getting ACI Managed Identity..." -ForegroundColor Yellow

try {
    $aci = az container show --name $aciName --resource-group $resourceGroup --output json | ConvertFrom-Json
    $principalId = $aci.identity.principalId
    
    Write-Host "[OK] ACI Principal ID: $principalId" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Failed to get ACI details: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[STEP 2] Checking role assignments..." -ForegroundColor Yellow

try {
    $roleAssignments = az role assignment list --assignee $principalId --output table
    if ($roleAssignments) {
        Write-Host "[OK] Role assignments found:" -ForegroundColor Green
        Write-Host $roleAssignments -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] No role assignments found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to check role assignments: $_" -ForegroundColor Red
}

Write-Host "`n[STEP 3] Testing Key Vault access..." -ForegroundColor Yellow

try {
    $secrets = az keyvault secret list --vault-name $keyVaultName --output table
    if ($secrets) {
        Write-Host "[OK] Key Vault secrets accessible:" -ForegroundColor Green
        Write-Host $secrets -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] No secrets found or access denied" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Failed to access Key Vault: $_" -ForegroundColor Red
}

Write-Host "`n[STEP 4] Testing specific secret access..." -ForegroundColor Yellow

$requiredSecrets = @(
    "auth--session--secret",
    "azure--database--azureSql--connectionString", 
    "gptConfig--apiKey",
    "storage--azure--connectionString"
)

foreach ($secretName in $requiredSecrets) {
    try {
        $secret = az keyvault secret show --vault-name $keyVaultName --name $secretName --query "value" --output tsv 2>$null
        if ($secret) {
            Write-Host "[OK] Secret '$secretName' accessible" -ForegroundColor Green
        } else {
            Write-Host "[WARNING] Secret '$secretName' not found or empty" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] Failed to access secret '$secretName': $_" -ForegroundColor Red
    }
}

Write-Host "`n[STEP 5] Testing Managed Identity token..." -ForegroundColor Yellow

try {
    # This would work from within the container, but we can't test it from outside
    Write-Host "[INFO] To test Managed Identity from within container, run:" -ForegroundColor Cyan
    Write-Host "az container exec --name $aciName --resource-group $resourceGroup --exec-command 'curl -H Metadata:true \"http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01`&resource=https://vault.azure.net\"'" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to test token: $_" -ForegroundColor Red
}

Write-Host "`n[COMPLETE] Managed Identity test complete!" -ForegroundColor Green
