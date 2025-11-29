#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Add Azure Container Registry to Docker manually

.DESCRIPTION
    This script helps manually add the vorbaacr to Docker when the extension
    doesn't automatically detect it.

.EXAMPLE
    .\add-acr-to-docker.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "Adding Azure Container Registry to Docker" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# ACR details
$acrName = "vorbaacr"
$acrLoginServer = "vorbaacr.azurecr.io"
# Get password from Azure CLI instead of hardcoding
$password = az acr credential show --name $acrName --query "passwords[0].value" --output tsv

Write-Host "ACR Name: $acrName" -ForegroundColor Cyan
Write-Host "Login Server: $acrLoginServer" -ForegroundColor Cyan
Write-Host "Username: $username" -ForegroundColor Cyan

# Method 1: Docker login command
Write-Host "`n[STEP 1] Logging into ACR via Docker..." -ForegroundColor Yellow
try {
    # Use echo to pipe password to docker login
    echo $password | docker login $acrLoginServer --username $username --password-stdin
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[SUCCESS] Docker login successful" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Docker login failed" -ForegroundColor Red
    }
} catch {
    Write-Host "[ERROR] Failed to login: $_" -ForegroundColor Red
}

# Method 2: Test connection by listing repositories
Write-Host "`n[STEP 2] Testing connection..." -ForegroundColor Yellow
try {
    $repos = az acr repository list --name $acrName --output table 2>$null
    if ($repos) {
        Write-Host "[SUCCESS] Found repositories:" -ForegroundColor Green
        Write-Host $repos -ForegroundColor Gray
    } else {
        Write-Host "[INFO] No repositories found (this is normal for a new ACR)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARNING] Could not list repositories: $_" -ForegroundColor Yellow
}

# Method 3: Manual instructions for VS Code extension
Write-Host "`n[STEP 3] Manual VS Code Extension Setup" -ForegroundColor Yellow
Write-Host "If the ACR still doesn't appear in the Docker extension:" -ForegroundColor Cyan
Write-Host "1. Open VS Code/Cursor Command Palette (Ctrl+Shift+P)" -ForegroundColor Gray
Write-Host "2. Type: Docker: Connect Registry" -ForegroundColor Gray
Write-Host "3. Select: Azure Container Registry" -ForegroundColor Gray
Write-Host "4. Choose your subscription" -ForegroundColor Gray
Write-Host "5. Select: vorbaacr" -ForegroundColor Gray
Write-Host "6. Or manually add with these credentials:" -ForegroundColor Gray
Write-Host "   - Registry: $acrLoginServer" -ForegroundColor Gray
Write-Host "   - Username: $username" -ForegroundColor Gray
Write-Host "   - Password: $password" -ForegroundColor Gray

# Method 4: Alternative - use Azure CLI token
Write-Host "`n[STEP 4] Alternative: Using Azure CLI token..." -ForegroundColor Yellow
try {
    $token = az acr login --name $acrName --expose-token --query accessToken --output tsv
    if ($token) {
        Write-Host "[SUCCESS] Got ACR token" -ForegroundColor Green
        Write-Host "You can use this token for authentication" -ForegroundColor Gray
    }
} catch {
    Write-Host "[WARNING] Could not get token: $_" -ForegroundColor Yellow
}

Write-Host "`n[COMPLETE] ACR setup complete!" -ForegroundColor Green
Write-Host "Try refreshing the Docker extension now." -ForegroundColor Cyan
