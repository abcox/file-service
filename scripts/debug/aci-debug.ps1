#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Azure Container Instance Debugging Script

.DESCRIPTION
    This script helps debug issues with Azure Container Instances by providing
    various debugging commands and information.

.PARAMETER ResourceGroup
    Resource Group name (default: "vorba-file-service-rg")

.PARAMETER ContainerName
    ACI instance name (default: "vorba-file-service-4")

.PARAMETER Action
    Action to perform: status, logs, exec, restart, stop, start, events

.EXAMPLE
    .\aci-debug.ps1 -Action status
    .\aci-debug.ps1 -Action logs
    .\aci-debug.ps1 -Action exec
    .\aci-debug.ps1 -Action restart
#>

param(
    [string]$ResourceGroup = "vorba-file-service-rg",
    [string]$ContainerName = "vorba-file-service-4",
    [ValidateSet("status", "logs", "exec", "restart", "stop", "start", "events", "health", "all")]
    [string]$Action = "status"
)

$ErrorActionPreference = "Stop"

Write-Host "Azure Container Instance Debugging Script" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green

# Function to check Azure CLI login
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

# Function to get ACI status
function Get-AciStatus {
    Write-Host "Getting ACI status..." -ForegroundColor Yellow
    
    try {
        $aci = az container show --name $ContainerName --resource-group $ResourceGroup --output json | ConvertFrom-Json
        
        Write-Host "ACI Details:" -ForegroundColor Cyan
        Write-Host "  Name: $($aci.name)" -ForegroundColor White
        Write-Host "  Resource Group: $($aci.id.Split('/')[4])" -ForegroundColor White
        Write-Host "  Location: $($aci.location)" -ForegroundColor White
        Write-Host "  Provisioning State: $($aci.provisioningState)" -ForegroundColor White
        Write-Host "  OS Type: $($aci.osType)" -ForegroundColor White
        Write-Host "  Restart Policy: $($aci.restartPolicy)" -ForegroundColor White
        
        if ($aci.ipAddress) {
            Write-Host "  IP Address: $($aci.ipAddress.ip)" -ForegroundColor White
            Write-Host "  FQDN: $($aci.ipAddress.fqdn)" -ForegroundColor White
            Write-Host "  Ports: $($aci.ipAddress.ports -join ', ')" -ForegroundColor White
        }
        
        if ($aci.containers) {
            foreach ($container in $aci.containers) {
                Write-Host "`nContainer Details:" -ForegroundColor Cyan
                Write-Host "  Name: $($container.name)" -ForegroundColor White
                Write-Host "  Image: $($container.image)" -ForegroundColor White
                Write-Host "  State: $($container.instanceView.currentState.state)" -ForegroundColor White
                Write-Host "  Started At: $($container.instanceView.currentState.startTime)" -ForegroundColor White
                Write-Host "  Restart Count: $($container.instanceView.restartCount)" -ForegroundColor White
                
                if ($container.instanceView.currentState.detailStatus) {
                    Write-Host "  Detail Status: $($container.instanceView.currentState.detailStatus)" -ForegroundColor White
                }
                
                if ($container.instanceView.previousState) {
                    Write-Host "  Previous State: $($container.instanceView.previousState.state)" -ForegroundColor White
                    Write-Host "  Previous Exit Code: $($container.instanceView.previousState.exitCode)" -ForegroundColor White
                }
            }
        }
        
        return $aci
    }
    catch {
        Write-Host "[ERROR] Failed to get ACI status: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Function to get ACI logs
function Get-AciLogs {
    Write-Host "Getting ACI logs..." -ForegroundColor Yellow
    
    try {
        $logs = az container logs --name $ContainerName --resource-group $ResourceGroup
        Write-Host "ACI Logs:" -ForegroundColor Cyan
        Write-Host "=========" -ForegroundColor Cyan
        Write-Host $logs -ForegroundColor White
        Write-Host "=========" -ForegroundColor Cyan
    }
    catch {
        Write-Host "[ERROR] Failed to get ACI logs: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to execute command in container
function Invoke-ContainerExec {
    Write-Host "Executing command in container..." -ForegroundColor Yellow
    Write-Host "Available commands:" -ForegroundColor Cyan
    Write-Host "  - ps aux (check running processes)" -ForegroundColor Gray
    Write-Host "  - ls -la /app (check app directory)" -ForegroundColor Gray
    Write-Host "  - cat /app/logs/* (check log files)" -ForegroundColor Gray
    Write-Host "  - which node (check Node.js installation)" -ForegroundColor Gray
    Write-Host "  - node --version (check Node.js version)" -ForegroundColor Gray
    Write-Host "  - ls -la /ms-playwright (check Playwright installation)" -ForegroundColor Gray
    
    $command = Read-Host "Enter command to execute (or press Enter for 'ps aux')"
    if (-not $command) {
        $command = "ps aux"
    }
    
    try {
        Write-Host "Executing: $command" -ForegroundColor Cyan
        az container exec --name $ContainerName --resource-group $ResourceGroup --exec-command $command
    }
    catch {
        Write-Host "[ERROR] Failed to execute command: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to restart ACI
function Restart-Aci {
    Write-Host "Restarting ACI..." -ForegroundColor Yellow
    
    try {
        az container restart --name $ContainerName --resource-group $ResourceGroup
        Write-Host "[OK] ACI restart initiated" -ForegroundColor Green
        Write-Host "Waiting for restart to complete..." -ForegroundColor Cyan
        Start-Sleep -Seconds 30
        Get-AciStatus
    }
    catch {
        Write-Host "[ERROR] Failed to restart ACI: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to stop ACI
function Stop-Aci {
    Write-Host "Stopping ACI..." -ForegroundColor Yellow
    
    try {
        az container stop --name $ContainerName --resource-group $ResourceGroup
        Write-Host "[OK] ACI stopped" -ForegroundColor Green
    }
    catch {
        Write-Host "[ERROR] Failed to stop ACI: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to start ACI
function Start-Aci {
    Write-Host "Starting ACI..." -ForegroundColor Yellow
    
    try {
        az container start --name $ContainerName --resource-group $ResourceGroup
        Write-Host "[OK] ACI start initiated" -ForegroundColor Green
        Write-Host "Waiting for start to complete..." -ForegroundColor Cyan
        Start-Sleep -Seconds 30
        Get-AciStatus
    }
    catch {
        Write-Host "[ERROR] Failed to start ACI: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to get ACI events
function Get-AciEvents {
    Write-Host "Getting ACI events..." -ForegroundColor Yellow
    
    try {
        $events = az monitor activity-log list --resource-group $ResourceGroup --resource-id "/subscriptions/$(az account show --query id -o tsv)/resourceGroups/$ResourceGroup/providers/Microsoft.ContainerInstance/containerGroups/$ContainerName" --output table
        Write-Host "ACI Events:" -ForegroundColor Cyan
        Write-Host $events -ForegroundColor White
    }
    catch {
        Write-Host "[ERROR] Failed to get ACI events: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to test health endpoint
function Test-HealthEndpoint {
    Write-Host "Testing health endpoint..." -ForegroundColor Yellow
    
    try {
        $aci = az container show --name $ContainerName --resource-group $ResourceGroup --query "ipAddress.fqdn" --output tsv
        if ($aci) {
            $url = "http://$aci`:3000/health"
            Write-Host "Testing: $url" -ForegroundColor Cyan
            
            $response = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 30
            Write-Host "[OK] Health check passed" -ForegroundColor Green
            Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
        }
        else {
            Write-Host "[ERROR] Could not get ACI FQDN" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "[ERROR] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to show common troubleshooting steps
function Show-TroubleshootingSteps {
    Write-Host "`nCommon Troubleshooting Steps:" -ForegroundColor Yellow
    Write-Host "=============================" -ForegroundColor Yellow
    Write-Host "1. Check container logs for errors" -ForegroundColor Gray
    Write-Host "2. Verify environment variables are set correctly" -ForegroundColor Gray
    Write-Host "3. Check if the application is binding to the correct port (3000)" -ForegroundColor Gray
    Write-Host "4. Verify Playwright browser installation" -ForegroundColor Gray
    Write-Host "5. Check resource limits (CPU/Memory)" -ForegroundColor Gray
    Write-Host "6. Verify network connectivity and firewall rules" -ForegroundColor Gray
    Write-Host "7. Check Azure Key Vault access permissions" -ForegroundColor Gray
}

# Main execution
try {
    if (-not (Test-AzureLogin)) {
        exit 1
    }
    
    switch ($Action) {
        "status" {
            Get-AciStatus
        }
        "logs" {
            Get-AciLogs
        }
        "exec" {
            Invoke-ContainerExec
        }
        "restart" {
            Restart-Aci
        }
        "stop" {
            Stop-Aci
        }
        "start" {
            Start-Aci
        }
        "events" {
            Get-AciEvents
        }
        "health" {
            Test-HealthEndpoint
        }
        "all" {
            Get-AciStatus
            Write-Host "`n" -ForegroundColor White
            Get-AciLogs
            Write-Host "`n" -ForegroundColor White
            Test-HealthEndpoint
            Write-Host "`n" -ForegroundColor White
            Show-TroubleshootingSteps
        }
    }
}
catch {
    Write-Host "`n[ERROR] Script failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
