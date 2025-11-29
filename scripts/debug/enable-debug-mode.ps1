#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Enable Debug Mode for Enhanced Troubleshooting

.DESCRIPTION
    This script enables comprehensive debug mode for the application startup process.
    It sets the DEBUG_STARTUP environment variable and provides enhanced logging.

.EXAMPLE
    .\enable-debug-mode.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "🔍 Enabling Debug Mode for Enhanced Troubleshooting" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

# Set debug environment variable
$env:DEBUG_STARTUP = "true"

Write-Host "`n[STEP 1] Environment Variables Set" -ForegroundColor Yellow
Write-Host "✅ DEBUG_STARTUP=true" -ForegroundColor Green

Write-Host "`n[STEP 2] Available Debug Commands" -ForegroundColor Yellow
Write-Host "🔧 Local Docker with Debug:" -ForegroundColor Cyan
Write-Host "   npm run debug:local-docker" -ForegroundColor Gray
Write-Host "`n🔧 Azure Container with Debug:" -ForegroundColor Cyan
Write-Host "   npm run debug:aci-logs" -ForegroundColor Gray
Write-Host "   npm run debug:aci-exec" -ForegroundColor Gray

Write-Host "`n[STEP 3] Debug Features Enabled" -ForegroundColor Yellow
Write-Host "✅ Comprehensive startup diagnostics" -ForegroundColor Green
Write-Host "✅ Environment variable validation" -ForegroundColor Green
Write-Host "✅ File system path checking" -ForegroundColor Green
Write-Host "✅ Azure credentials diagnostics" -ForegroundColor Green
Write-Host "✅ Network connectivity testing" -ForegroundColor Green
Write-Host "✅ Enhanced error reporting" -ForegroundColor Green

Write-Host "`n[STEP 4] Next Steps" -ForegroundColor Yellow
Write-Host "1. Run your application (local or Azure)" -ForegroundColor Gray
Write-Host "2. Check logs for detailed diagnostic information" -ForegroundColor Gray
Write-Host "3. Look for 🔍 emoji indicators in logs" -ForegroundColor Gray
Write-Host "4. Review troubleshooting hints if errors occur" -ForegroundColor Gray

Write-Host "`n[INFO] Debug mode will remain active for this session" -ForegroundColor Cyan
Write-Host "To disable, run: `$env:DEBUG_STARTUP = `$null" -ForegroundColor Gray

Write-Host "`n✅ Debug mode enabled successfully!" -ForegroundColor Green
