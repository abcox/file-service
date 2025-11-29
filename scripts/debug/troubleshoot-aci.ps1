#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Comprehensive ACI Troubleshooting Script

.DESCRIPTION
    This script provides a comprehensive troubleshooting workflow for Azure Container Instance issues.
    It includes diagnostics, log analysis, and common solutions.

.EXAMPLE
    .\troubleshoot-aci.ps1
#>

$ErrorActionPreference = "Stop"

# ACI details
$aciName = "vorba-file-service-4"
$resourceGroup = "vorba-file-service-rg"

Write-Host "🔧 ACI Troubleshooting Workflow" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

Write-Host "`n[STEP 1] Checking ACI Status..." -ForegroundColor Yellow
try {
    $aci = az container show --name $aciName --resource-group $resourceGroup --output json | ConvertFrom-Json
    
    Write-Host "✅ ACI Found:" -ForegroundColor Green
    Write-Host "  Name: $($aci.name)" -ForegroundColor Gray
    Write-Host "  State: $($aci.containers[0].instanceView.state)" -ForegroundColor Gray
    Write-Host "  Restart Count: $($aci.containers[0].instanceView.restartCount)" -ForegroundColor Gray
    Write-Host "  Detail Status: $($aci.containers[0].instanceView.detailStatus)" -ForegroundColor Gray
    
    if ($aci.containers[0].instanceView.state -eq "Running") {
        Write-Host "✅ Container is running!" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Container is not running properly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to get ACI status: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n[STEP 2] Getting Recent Logs..." -ForegroundColor Yellow
try {
    $logs = az container logs --name $aciName --resource-group $resourceGroup --tail 50
    Write-Host "📋 Recent Logs:" -ForegroundColor Cyan
    Write-Host $logs -ForegroundColor Gray
    
    # Check for debug diagnostics
    if ($logs -match "🔍") {
        Write-Host "✅ Debug diagnostics found in logs" -ForegroundColor Green
    } else {
        Write-Host "⚠️ No debug diagnostics found - DEBUG_STARTUP may not be enabled" -ForegroundColor Yellow
    }
    
    # Check for common errors
    if ($logs -match "Configuration file not found") {
        Write-Host "❌ CONFIG ERROR: Configuration file not found" -ForegroundColor Red
        Write-Host "   Solution: Check Dockerfile config copy and NODE_ENV setting" -ForegroundColor Gray
    }
    
    if ($logs -match "ChainedTokenCredential authentication failed") {
        Write-Host "❌ KEY VAULT ERROR: Authentication failed" -ForegroundColor Red
        Write-Host "   Solution: Check Managed Identity role assignments" -ForegroundColor Gray
    }
    
    if ($logs -match "JWT secret is missing") {
        Write-Host "❌ JWT ERROR: JWT secret is missing" -ForegroundColor Red
        Write-Host "   Solution: Check Key Vault access or environment variables" -ForegroundColor Gray
    }
    
} catch {
    Write-Host "❌ Failed to get logs: $_" -ForegroundColor Red
}

Write-Host "`n[STEP 3] Checking Managed Identity..." -ForegroundColor Yellow
try {
    $principalId = $aci.identity.principalId
    Write-Host "Principal ID: $principalId" -ForegroundColor Gray
    
    $roleAssignments = az role assignment list --assignee $principalId --output table
    if ($roleAssignments) {
        Write-Host "✅ Role assignments found:" -ForegroundColor Green
        Write-Host $roleAssignments -ForegroundColor Gray
    } else {
        Write-Host "❌ No role assignments found" -ForegroundColor Red
        Write-Host "   Solution: Assign 'Key Vault Secrets User' role" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Failed to check Managed Identity: $_" -ForegroundColor Red
}

Write-Host "`n[STEP 4] Testing Key Vault Access..." -ForegroundColor Yellow
try {
    $secrets = az keyvault secret list --vault-name "vorba-file-service-kv" --output table
    if ($secrets) {
        Write-Host "✅ Key Vault secrets accessible:" -ForegroundColor Green
        Write-Host $secrets -ForegroundColor Gray
    } else {
        Write-Host "❌ Cannot access Key Vault secrets" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to access Key Vault: $_" -ForegroundColor Red
}

Write-Host "`n[STEP 5] Common Solutions..." -ForegroundColor Yellow
Write-Host "🔧 If container is crashing:" -ForegroundColor Cyan
Write-Host "   1. Check logs for specific error messages" -ForegroundColor Gray
Write-Host "   2. Verify DEBUG_STARTUP=true is set in GitHub Actions" -ForegroundColor Gray
Write-Host "   3. Test locally with: npm run debug:local-docker" -ForegroundColor Gray
Write-Host "   4. Check Managed Identity role assignments" -ForegroundColor Gray
Write-Host "   5. Verify Key Vault secrets exist" -ForegroundColor Gray

Write-Host "`n🔧 If Key Vault access fails:" -ForegroundColor Cyan
Write-Host "   1. Run: az role assignment create --assignee $principalId --role 'Key Vault Secrets User' --scope '/subscriptions/236217f7-0ad4-4dd6-8553-dc4b574fd2c5/resourceGroups/vorba-file-service-rg/providers/Microsoft.KeyVault/vaults/vorba-file-service-kv'" -ForegroundColor Gray
Write-Host "   2. Wait 5-10 minutes for role propagation" -ForegroundColor Gray
Write-Host "   3. Restart the container" -ForegroundColor Gray

Write-Host "`n🔧 If config file issues:" -ForegroundColor Cyan
Write-Host "   1. Check Dockerfile config copy commands" -ForegroundColor Gray
Write-Host "   2. Verify NODE_ENV is set correctly" -ForegroundColor Gray
Write-Host "   3. Test locally with production mode" -ForegroundColor Gray

Write-Host "`n✅ Troubleshooting complete!" -ForegroundColor Green
Write-Host "Review the output above and follow the suggested solutions." -ForegroundColor Cyan
