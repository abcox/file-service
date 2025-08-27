#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure Deployment Status Check Script

.DESCRIPTION
    Checks the status of vorba-file-service App Service and related resources

.PARAMETER CheckSwagger
    Also check if Swagger UI is accessible

.EXAMPLE
    .\deploy-status.ps1

.EXAMPLE
    .\deploy-status.ps1 -CheckSwagger
#>

param(
    [switch]$CheckSwagger
)

# Set error action preference
$ErrorActionPreference = "Continue"

Write-Host "Azure Deployment Status Check" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Check if Azure CLI is logged in
Write-Host "`n[INFO] Checking Azure CLI login status..." -ForegroundColor Yellow
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if ($account) {
        Write-Host "[OK] Logged in to Azure as: $($account.user.name)" -ForegroundColor Green
        Write-Host "   Subscription: $($account.name) ($($account.id))" -ForegroundColor Cyan
    } else {
        Write-Host "[ERROR] Not logged in to Azure CLI. Run 'az login' first." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Not logged in to Azure CLI. Run 'az login' first." -ForegroundColor Red
    exit 1
}

# Check App Service status
Write-Host "`n[INFO] Checking App Service status..." -ForegroundColor Yellow
try {
    $appService = az webapp show --name vorba-file-service --resource-group vorba-file-service-rg 2>$null | ConvertFrom-Json
    if ($appService) {
        Write-Host "[OK] App Service exists: $($appService.name)" -ForegroundColor Green
        Write-Host "   State: $($appService.state)" -ForegroundColor Gray
        Write-Host "   URL: https://$($appService.defaultHostName)" -ForegroundColor Gray
        Write-Host "   Type: $($appService.kind)" -ForegroundColor Gray
        Write-Host "   SKU: $($appService.sku.name)" -ForegroundColor Gray
        Write-Host "   Last Modified: $($appService.lastModifiedTimeUtc)" -ForegroundColor Gray
        
        $appUrl = "https://$($appService.defaultHostName)"
    } else {
        Write-Host "[ERROR] App Service 'vorba-file-service' not found." -ForegroundColor Red
        Write-Host "   Make sure the resource group 'vorba-file-service-rg' exists." -ForegroundColor Yellow
        exit 1
    }
} catch {
    Write-Host "[ERROR] App Service 'vorba-file-service' not found or not accessible." -ForegroundColor Red
    Write-Host "   Make sure the resource group 'vorba-file-service-rg' exists." -ForegroundColor Yellow
    exit 1
}

# Check if app is running
Write-Host "`n[INFO] Checking if application is running..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$appUrl/health" -Method GET -TimeoutSec 10 -UseBasicParsing
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "[OK] Application is running and healthy!" -ForegroundColor Green
        Write-Host "   Health endpoint: $appUrl/health" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] Application responded with status: $($healthResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[ERROR] Application is not responding or not deployed yet." -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Check Swagger UI if requested
if ($CheckSwagger) {
    Write-Host "`n[INFO] Checking Swagger UI..." -ForegroundColor Yellow
    try {
        $swaggerResponse = Invoke-WebRequest -Uri "$appUrl/api" -Method GET -TimeoutSec 10 -UseBasicParsing
        if ($swaggerResponse.StatusCode -eq 200) {
            Write-Host "[OK] Swagger UI is accessible!" -ForegroundColor Green
            Write-Host "   Swagger URL: $appUrl/api" -ForegroundColor Gray
        } else {
            Write-Host "[WARNING] Swagger UI responded with status: $($swaggerResponse.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[ERROR] Swagger UI is not accessible." -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
}

# Check custom domain configuration
Write-Host "`n[INFO] Checking custom domain configuration..." -ForegroundColor Yellow
try {
    $customDomains = az webapp config hostname list --webapp-name vorba-file-service --resource-group vorba-file-service-rg 2>$null | ConvertFrom-Json
    
    if ($customDomains -and $customDomains.Count -gt 0) {
        Write-Host "[OK] Custom domains configured:" -ForegroundColor Green
        foreach ($domain in $customDomains) {
            Write-Host "   - $($domain.name) ($($domain.type))" -ForegroundColor Gray
        }
    } else {
        Write-Host "[INFO] No custom domains configured yet." -ForegroundColor Blue
        Write-Host "   To add files.vorba.com, you'll need to:" -ForegroundColor Gray
        Write-Host "   1. Configure DNS records" -ForegroundColor Gray
        Write-Host "   2. Add custom domain in Azure" -ForegroundColor Gray
        Write-Host "   3. Configure SSL certificate" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARNING] Could not check custom domain configuration." -ForegroundColor Yellow
}

# Check recent deployments and GitHub Actions status
Write-Host "`n[INFO] Checking recent deployments..." -ForegroundColor Yellow
try {
    $deployments = az webapp deployment list --name vorba-file-service --resource-group vorba-file-service-rg 2>$null | ConvertFrom-Json
    
    if ($deployments -and $deployments.Count -gt 0) {
        Write-Host "[OK] Recent deployments found:" -ForegroundColor Green
        
        # Find the last successful deployment
        $lastSuccessful = $deployments | Where-Object { $_.status -eq "Success" } | Sort-Object receivedTime -Descending | Select-Object -First 1
        if ($lastSuccessful) {
            $deployTime = [DateTime]::Parse($lastSuccessful.receivedTime)
            $timeSince = (Get-Date) - $deployTime
            Write-Host "   Last successful deployment:" -ForegroundColor Green
            Write-Host "     ID: $($lastSuccessful.id)" -ForegroundColor Gray
            Write-Host "     Time: $($lastSuccessful.receivedTime)" -ForegroundColor Gray
            Write-Host "     Age: $($timeSince.Days) days, $($timeSince.Hours) hours ago" -ForegroundColor Gray
            
            # Check if it looks like a GitHub Actions deployment
            if ($lastSuccessful.id -like "*github*" -or $lastSuccessful.message -like "*github*" -or $lastSuccessful.author -like "*github*") {
                Write-Host "     Source: GitHub Actions" -ForegroundColor Cyan
            }
        }
        
        # Show recent deployments (up to 3)
        Write-Host "   Recent deployments:" -ForegroundColor Yellow
        $recentDeployments = $deployments | Sort-Object receivedTime -Descending | Select-Object -First 3
        foreach ($deployment in $recentDeployments) {
            $statusColor = if ($deployment.status -eq "Success") { "Green" } else { "Red" }
            $deployTime = [DateTime]::Parse($deployment.receivedTime)
            $timeSince = (Get-Date) - $deployTime
            
            Write-Host "     - $($deployment.id) ($($deployment.status))" -ForegroundColor $statusColor
            Write-Host "       Time: $($deployment.receivedTime) ($($timeSince.Days) days ago)" -ForegroundColor Gray
            if ($deployment.message) {
                Write-Host "       Message: $($deployment.message)" -ForegroundColor Gray
            }
            if ($deployment.author) {
                Write-Host "       Author: $($deployment.author)" -ForegroundColor Gray
            }
        }
        
        # Check for failed deployments
        $failedDeployments = $deployments | Where-Object { $_.status -ne "Success" } | Sort-Object receivedTime -Descending | Select-Object -First 3
        if ($failedDeployments -and $failedDeployments.Count -gt 0) {
            Write-Host "   Recent failed deployments:" -ForegroundColor Red
            foreach ($deployment in $failedDeployments) {
                $deployTime = [DateTime]::Parse($deployment.receivedTime)
                $timeSince = (Get-Date) - $deployTime
                Write-Host "     - $($deployment.id) ($($deployment.status))" -ForegroundColor Red
                Write-Host "       Time: $($deployment.receivedTime) ($($timeSince.Days) days ago)" -ForegroundColor Gray
                if ($deployment.message) {
                    Write-Host "       Error: $($deployment.message)" -ForegroundColor Gray
                }
            }
        }
    } else {
        Write-Host "[INFO] No recent deployments found." -ForegroundColor Blue
        Write-Host "   This might indicate:" -ForegroundColor Gray
        Write-Host "   - App Service was created but never deployed to" -ForegroundColor Gray
        Write-Host "   - Deployment history is not available" -ForegroundColor Gray
        Write-Host "   - Check GitHub Actions for deployment status" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARNING] Could not check deployment history." -ForegroundColor Yellow
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Gray
}

# Summary
Write-Host "`nSummary" -ForegroundColor Cyan
Write-Host "========" -ForegroundColor Cyan
Write-Host "App Service URL: $appUrl" -ForegroundColor White
Write-Host "Health Check: $appUrl/health" -ForegroundColor White
if ($CheckSwagger) {
    Write-Host "Swagger UI: $appUrl/api" -ForegroundColor White
}

Write-Host "`nNext Steps:" -ForegroundColor Cyan
Write-Host "1. If app is not running, check GitHub Actions for deployment status" -ForegroundColor White
Write-Host "2. To add files.vorba.com custom domain, run: ./scripts/setup-custom-domain.ps1" -ForegroundColor White
Write-Host "3. To test API endpoints, visit: $appUrl/api" -ForegroundColor White

Write-Host "`n[OK] Check complete!" -ForegroundColor Green 