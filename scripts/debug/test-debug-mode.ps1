#!/usr/bin/env pwsh

# Test Debug Mode Locally
# This script tests the debug mode locally to ensure it works before deploying to Azure

Write-Host "Testing Debug Mode Locally" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green

# Set debug environment variable
$env:DEBUG_STARTUP = "true"
$env:NODE_ENV = "production"

Write-Host ""
Write-Host "[STEP 1] Environment Variables Set" -ForegroundColor Yellow
Write-Host "DEBUG_STARTUP=true" -ForegroundColor Green
Write-Host "NODE_ENV=production" -ForegroundColor Green

Write-Host ""
Write-Host "[STEP 2] Building Application..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "Build successful" -ForegroundColor Green
} catch {
    Write-Host "Build failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[STEP 3] Running Application with Debug Mode..." -ForegroundColor Yellow
Write-Host "This will start the app and show debug diagnostics. Press Ctrl+C to stop after diagnostics complete." -ForegroundColor Cyan

try {
    # Start the application
    node dist/src/main.js
} catch {
    Write-Host ""
    Write-Host "Application failed to start: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Debug mode test completed!" -ForegroundColor Green
Write-Host "If you saw diagnostic output with emoji indicators, debug mode is working correctly." -ForegroundColor Cyan
