#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Local Docker Testing Script for File Service Container

.DESCRIPTION
    This script helps test the Docker container locally to identify issues
    before deploying to Azure Container Instances.

.PARAMETER BuildOnly
    Only build the image, don't run it

.PARAMETER RunOnly
    Only run an existing image, don't build

.PARAMETER Debug
    Run with additional debugging information

.EXAMPLE
    .\local-docker-test.ps1
    .\local-docker-test.ps1 -BuildOnly
    .\local-docker-test.ps1 -RunOnly -Debug
#>

param(
    [switch]$BuildOnly,
    [switch]$RunOnly,
    [switch]$Debug
)

$ErrorActionPreference = "Stop"

Write-Host "Local Docker Testing Script for File Service" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# Configuration
$ImageName = "file-service-local"
$ContainerName = "file-service-test"
$Port = 3000

# Function to check if Docker is running
function Test-DockerRunning {
    try {
        docker info | Out-Null
        Write-Host "[OK] Docker is running" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "[ERROR] Docker is not running. Please start Docker Desktop." -ForegroundColor Red
        return $false
    }
}

# Function to clean up existing containers
function Remove-ExistingContainer {
    Write-Host "Cleaning up existing containers..." -ForegroundColor Yellow
    
    # Check if container exists before trying to stop/remove it
    $containerExists = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}" 2>$null
    if ($containerExists) {
        Write-Host "Stopping existing container: $ContainerName" -ForegroundColor Cyan
        docker stop $ContainerName 2>$null
        Write-Host "Removing existing container: $ContainerName" -ForegroundColor Cyan
        docker rm $ContainerName 2>$null
    } else {
        Write-Host "No existing container found: $ContainerName" -ForegroundColor Gray
    }
    
    # Remove existing image if requested
    if ($BuildOnly) {
        $imageExists = docker images --filter "reference=$ImageName" --format "{{.Repository}}" 2>$null
        if ($imageExists) {
            Write-Host "Removing existing image: $ImageName" -ForegroundColor Cyan
            docker rmi $ImageName 2>$null
        }
    }
}

# Function to build the Docker image
function Build-DockerImage {
    Write-Host "Building Docker image..." -ForegroundColor Yellow
    
    $buildArgs = @(
        "build",
        "-t", $ImageName,
        "--no-cache"
    )
    
    if ($Debug) {
        $buildArgs += "--progress=plain"
    }
    
    $buildArgs += "."
    
    Write-Host "Running: docker $($buildArgs -join ' ')" -ForegroundColor Cyan
    
    try {
        docker $buildArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Docker image built successfully" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[ERROR] Docker build failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "[ERROR] Docker build failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to load Azure credentials
function Load-AzureCredentials {
    $envFile = "scripts\debug\.env.local"
    if (Test-Path $envFile) {
        Write-Host "Loading Azure credentials from $envFile..." -ForegroundColor Yellow
        Get-Content $envFile | ForEach-Object {
            if ($_ -match '^([^#][^=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                Set-Variable -Name "env:$name" -Value $value -Scope Global
                Write-Host "Loaded: $name" -ForegroundColor Gray
            }
        }
        return $true
    } else {
        Write-Host "[WARNING] Azure credentials file not found: $envFile" -ForegroundColor Yellow
        Write-Host "Run: npm run debug:setup-azure-credentials" -ForegroundColor Cyan
        return $false
    }
}

# Function to run the Docker container
function Start-DockerContainer {
    Write-Host "Starting Docker container..." -ForegroundColor Yellow
    
    # Load Azure credentials
    if (-not (Load-AzureCredentials)) {
        Write-Host "[ERROR] Azure credentials not available" -ForegroundColor Red
        return $false
    }
    
    $runArgs = @(
        "run",
        "-d",
        "--name", $ContainerName,
        "-p", "$Port`:3000",
        "-e", "NODE_ENV=production",
        "-e", "PORT=3000",
        "-e", "AZURE_CLIENT_ID=$env:AZURE_CLIENT_ID",
        "-e", "AZURE_TENANT_ID=$env:AZURE_TENANT_ID",
        "-e", "AZURE_CLIENT_SECRET=$env:AZURE_CLIENT_SECRET",
        "-e", "PLAYWRIGHT_BROWSER_PATH=/ms-playwright/chromium-*/chrome-linux/chrome"
    )
    
    # Add volume mounts for debugging
    if ($Debug) {
        $runArgs += @(
            "-v", "${PWD}/logs:/app/logs",
            "-e", "DEBUG=*"
        )
    }
    
    $runArgs += @($ImageName)
    
    Write-Host "Running: docker $($runArgs -join ' ')" -ForegroundColor Cyan
    
    try {
        docker $runArgs
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Container started successfully" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[ERROR] Container start failed" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "[ERROR] Container start failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to check container status
function Test-ContainerStatus {
    Write-Host "Checking container status..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 5
    
    $status = docker ps --filter "name=$ContainerName" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    Write-Host "Container Status:" -ForegroundColor Cyan
    Write-Host $status -ForegroundColor White
    
    # Check if container is running
    $running = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
    if ($running) {
        Write-Host "[OK] Container is running" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[ERROR] Container is not running" -ForegroundColor Red
        return $false
    }
}

# Function to show container logs
function Show-ContainerLogs {
    Write-Host "Container logs:" -ForegroundColor Yellow
    Write-Host "==============" -ForegroundColor Yellow
    
    docker logs $ContainerName
    
    Write-Host "==============" -ForegroundColor Yellow
}

# Function to test health endpoint
function Test-HealthEndpoint {
    Write-Host "Testing health endpoint..." -ForegroundColor Yellow
    
    Start-Sleep -Seconds 10  # Give app time to start
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$Port/health" -Method Get -TimeoutSec 30
        Write-Host "[OK] Health check passed" -ForegroundColor Green
        Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
        return $true
    }
    catch {
        Write-Host "[ERROR] Health check failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to test PDF generation
function Test-PdfGeneration {
    Write-Host "Testing PDF generation..." -ForegroundColor Yellow
    
    try {
        $body = @{
            html = "<h1>Test PDF</h1><p>This is a test PDF generated from HTML.</p>"
            title = "Test PDF"
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:$Port/api/pdf/html-to-pdf" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 60
        Write-Host "[OK] PDF generation test passed" -ForegroundColor Green
        Write-Host "PDF size: $($response.fileSize) bytes" -ForegroundColor Cyan
        return $true
    }
    catch {
        Write-Host "[ERROR] PDF generation test failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to enter container for debugging
function Enter-Container {
    Write-Host "Entering container for debugging..." -ForegroundColor Yellow
    Write-Host "Type 'exit' to leave the container" -ForegroundColor Cyan
    
    docker exec -it $ContainerName /bin/bash
}

# Main execution
try {
    Write-Host "Starting local Docker test..." -ForegroundColor Green
    
    if (-not (Test-DockerRunning)) {
        Write-Host "`n[ERROR] Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
        exit 1
    }
    
    Remove-ExistingContainer
    
    if (-not $RunOnly) {
        Write-Host "`n[STEP] Building Docker image..." -ForegroundColor Blue
        if (-not (Build-DockerImage)) {
            Write-Host "`n[ERROR] Docker build failed. Check the build output above." -ForegroundColor Red
            exit 1
        }
    }
    
    if (-not $BuildOnly) {
        Write-Host "`n[STEP] Starting Docker container..." -ForegroundColor Blue
        if (-not (Start-DockerContainer)) {
            Write-Host "`n[ERROR] Container start failed. Check the output above." -ForegroundColor Red
            exit 1
        }
        
        Write-Host "`n[STEP] Checking container status..." -ForegroundColor Blue
        if (-not (Test-ContainerStatus)) {
            Write-Host "`n[ERROR] Container is not running properly." -ForegroundColor Red
            Show-ContainerLogs
            exit 1
        }
        
        Show-ContainerLogs
        
        Write-Host "`n[STEP] Testing health endpoint..." -ForegroundColor Blue
        if (Test-HealthEndpoint) {
            Write-Host "`n[STEP] Testing PDF generation..." -ForegroundColor Blue
            Test-PdfGeneration
        }
        
        Write-Host "`n" + "="*60 -ForegroundColor Green
        Write-Host "✅ LOCAL DOCKER TEST COMPLETED SUCCESSFULLY" -ForegroundColor Green
        Write-Host "="*60 -ForegroundColor Green
        Write-Host "`n[INFO] Container is running at http://localhost:$Port" -ForegroundColor Green
        Write-Host "[INFO] To view logs: docker logs $ContainerName" -ForegroundColor Cyan
        Write-Host "[INFO] To enter container: docker exec -it $ContainerName /bin/bash" -ForegroundColor Cyan
        Write-Host "[INFO] To stop container: docker stop $ContainerName" -ForegroundColor Cyan
        
        if ($Debug) {
            Write-Host "`n[DEBUG] Entering container for interactive debugging..." -ForegroundColor Yellow
            Enter-Container
        }
    }
}
catch {
    Write-Host "`n[ERROR] Script failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`n[INFO] Checking container logs for more details..." -ForegroundColor Yellow
    Show-ContainerLogs
    Write-Host "`n[INFO] Try running the script again or check Docker Desktop is running." -ForegroundColor Cyan
    exit 1
}
