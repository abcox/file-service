#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Prerequisites Check Script for File Service Container Development

.DESCRIPTION
    This script checks if all required tools and dependencies are installed
    for local Docker testing and Azure Container Instance deployment.

.PARAMETER InstallMissing
    Automatically install missing prerequisites (where possible)

.EXAMPLE
    .\check-prerequisites.ps1
    .\check-prerequisites.ps1 -InstallMissing
#>

param(
    [switch]$InstallMissing
)

$ErrorActionPreference = "Stop"

Write-Host "File Service Container Development - Prerequisites Check" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green

# Function to check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

# Function to get version of a command
function Get-CommandVersion {
    param([string]$Command)
    try {
        $version = & $Command --version 2>$null
        if ($version) {
            return $version.Trim()
        }
        return "Unknown"
    }
    catch {
        return "Unknown"
    }
}

# Function to check Docker
function Test-Docker {
    Write-Host "`n[CHECK] Docker..." -ForegroundColor Yellow
    
    if (Test-Command "docker") {
        $version = Get-CommandVersion "docker"
        Write-Host "[OK] Docker is installed: $version" -ForegroundColor Green
        
        # Check if Docker is running
        try {
            docker info | Out-Null
            Write-Host "[OK] Docker is running" -ForegroundColor Green
            return $true
        }
        catch {
            Write-Host "[ERROR] Docker is installed but not running" -ForegroundColor Red
            Write-Host "   Please start Docker Desktop" -ForegroundColor Gray
            return $false
        }
    }
    else {
        Write-Host "[MISSING] Docker is not installed" -ForegroundColor Red
        Write-Host "   Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Gray
        Write-Host "   Or install via: winget install Docker.DockerDesktop" -ForegroundColor Gray
        return $false
    }
}

# Function to check Node.js
function Test-NodeJS {
    Write-Host "`n[CHECK] Node.js..." -ForegroundColor Yellow
    
    if (Test-Command "node") {
        $version = Get-CommandVersion "node"
        Write-Host "[OK] Node.js is installed: $version" -ForegroundColor Green
        
        # Check npm
        if (Test-Command "npm") {
            $npmVersion = Get-CommandVersion "npm"
            Write-Host "[OK] npm is installed: $npmVersion" -ForegroundColor Green
        }
        else {
            Write-Host "[ERROR] npm is missing" -ForegroundColor Red
            return $false
        }
        
        return $true
    }
    else {
        Write-Host "[MISSING] Node.js is not installed" -ForegroundColor Red
        Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Gray
        Write-Host "   Or install via: winget install OpenJS.NodeJS" -ForegroundColor Gray
        return $false
    }
}

# Function to check Azure CLI
function Test-AzureCLI {
    Write-Host "`n[CHECK] Azure CLI..." -ForegroundColor Yellow
    
    if (Test-Command "az") {
        $version = Get-CommandVersion "az"
        Write-Host "[OK] Azure CLI is installed: $version" -ForegroundColor Green
        
        # Check if logged in
        try {
            $account = az account show --output json 2>$null | ConvertFrom-Json
            if ($account) {
                Write-Host "[OK] Logged in as: $($account.user.name)" -ForegroundColor Green
                Write-Host "[OK] Subscription: $($account.name)" -ForegroundColor Green
                return $true
            }
        }
        catch {
            Write-Host "[WARNING] Not logged in to Azure" -ForegroundColor Yellow
            Write-Host "   Run: az login" -ForegroundColor Gray
            return $false
        }
    }
    else {
        Write-Host "[MISSING] Azure CLI is not installed" -ForegroundColor Red
        Write-Host "   Download from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli" -ForegroundColor Gray
        Write-Host "   Or install via: winget install Microsoft.AzureCLI" -ForegroundColor Gray
        return $false
    }
}

# Function to check PowerShell version
function Test-PowerShell {
    Write-Host "`n[CHECK] PowerShell..." -ForegroundColor Yellow
    
    $psVersion = $PSVersionTable.PSVersion
    Write-Host "[OK] PowerShell version: $psVersion" -ForegroundColor Green
    
    if ($psVersion.Major -ge 7) {
        Write-Host "[OK] PowerShell 7+ detected (recommended)" -ForegroundColor Green
    }
    elseif ($psVersion.Major -ge 5) {
        Write-Host "[OK] PowerShell 5+ detected (minimum required)" -ForegroundColor Green
    }
    else {
        Write-Host "[ERROR] PowerShell version too old" -ForegroundColor Red
        Write-Host "   Please upgrade to PowerShell 5+ or PowerShell 7+" -ForegroundColor Gray
        return $false
    }
    
    return $true
}

# Function to check Git
function Test-Git {
    Write-Host "`n[CHECK] Git..." -ForegroundColor Yellow
    
    if (Test-Command "git") {
        $version = Get-CommandVersion "git"
        Write-Host "[OK] Git is installed: $version" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[MISSING] Git is not installed" -ForegroundColor Red
        Write-Host "   Download from: https://git-scm.com/" -ForegroundColor Gray
        Write-Host "   Or install via: winget install Git.Git" -ForegroundColor Gray
        return $false
    }
}

# Function to check VS Code Docker extension
function Test-VSCodeDockerExtension {
    Write-Host "`n[CHECK] VS Code Docker Extension..." -ForegroundColor Yellow
    
    # Check if VS Code is installed
    $vscodePaths = @(
        "${env:LOCALAPPDATA}\Programs\Microsoft VS Code\Code.exe",
        "${env:ProgramFiles}\Microsoft VS Code\Code.exe",
        "${env:ProgramFiles(x86)}\Microsoft VS Code\Code.exe"
    )
    
    $vscodeInstalled = $false
    foreach ($path in $vscodePaths) {
        if (Test-Path $path) {
            $vscodeInstalled = $true
            break
        }
    }
    
    if (-not $vscodeInstalled) {
        Write-Host "[INFO] VS Code not detected in standard locations" -ForegroundColor Cyan
        Write-Host "   Docker extension requires VS Code or Cursor" -ForegroundColor Gray
        Write-Host "   Install from: https://code.visualstudio.com/" -ForegroundColor Gray
        Write-Host "   Or use Cursor: https://cursor.sh/" -ForegroundColor Gray
        return $false
    }
    
    # Check for Docker extension
    $extensionPath = "${env:USERPROFILE}\.vscode\extensions"
    $dockerExtension = Get-ChildItem -Path $extensionPath -Name "*ms-azuretools.vscode-docker*" -ErrorAction SilentlyContinue
    
    if ($dockerExtension) {
        Write-Host "[OK] Docker extension is installed" -ForegroundColor Green
        Write-Host "   Extension: $dockerExtension" -ForegroundColor Gray
        return $true
    }
    else {
        Write-Host "[RECOMMENDED] Docker extension not found" -ForegroundColor Yellow
        Write-Host "   Install from VS Code marketplace: ms-azuretools.vscode-docker" -ForegroundColor Gray
        Write-Host "   Or run: code --install-extension ms-azuretools.vscode-docker" -ForegroundColor Gray
        Write-Host "   Features: Container management, debugging, logs, exec" -ForegroundColor Gray
        return $false
    }
}

# Function to check available disk space
function Test-DiskSpace {
    Write-Host "`n[CHECK] Disk Space..." -ForegroundColor Yellow
    
    $drive = Get-PSDrive C
    $freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
    $totalSpaceGB = [math]::Round($drive.Used / 1GB, 2) + $freeSpaceGB
    
    Write-Host "[INFO] Available disk space: ${freeSpaceGB}GB / ${totalSpaceGB}GB" -ForegroundColor Cyan
    
    if ($freeSpaceGB -ge 10) {
        Write-Host "[OK] Sufficient disk space available" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[WARNING] Low disk space (< 10GB free)" -ForegroundColor Yellow
        Write-Host "   Docker images and containers require significant space" -ForegroundColor Gray
        return $false
    }
}

# Function to check Windows version
function Test-WindowsVersion {
    Write-Host "`n[CHECK] Windows Version..." -ForegroundColor Yellow
    
    $os = Get-CimInstance -ClassName Win32_OperatingSystem
    $version = $os.Version
    $build = $os.BuildNumber
    
    Write-Host "[INFO] Windows version: $($os.Caption) (Build $build)" -ForegroundColor Cyan
    
    # Check if it's Windows 10/11
    if ($version -ge "10.0") {
        Write-Host "[OK] Windows 10/11 detected" -ForegroundColor Green
        return $true
    }
    else {
        Write-Host "[WARNING] Older Windows version detected" -ForegroundColor Yellow
        Write-Host "   Docker Desktop requires Windows 10/11" -ForegroundColor Gray
        return $false
    }
}

# Function to check WSL2 (for Docker Desktop)
function Test-WSL2 {
    Write-Host "`n[CHECK] WSL2..." -ForegroundColor Yellow
    
    if (Test-Command "wsl") {
        $wslVersion = wsl --version 2>$null
        if ($wslVersion) {
            Write-Host "[OK] WSL is installed" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[WARNING] WSL may need to be enabled" -ForegroundColor Yellow
            Write-Host "   Run: wsl --install" -ForegroundColor Gray
            return $false
        }
    }
    else {
        Write-Host "[WARNING] WSL not detected" -ForegroundColor Yellow
        Write-Host "   Docker Desktop may require WSL2" -ForegroundColor Gray
        Write-Host "   Run: wsl --install" -ForegroundColor Gray
        return $false
    }
}

# Function to check virtualization
function Test-Virtualization {
    Write-Host "`n[CHECK] Virtualization..." -ForegroundColor Yellow
    
    try {
        $cpu = Get-CimInstance -ClassName Win32_Processor
        $virtualizationEnabled = $cpu.VirtualizationFirmwareEnabled
        
        if ($virtualizationEnabled) {
            Write-Host "[OK] Virtualization is enabled" -ForegroundColor Green
            return $true
        }
        else {
            Write-Host "[WARNING] Virtualization may be disabled" -ForegroundColor Yellow
            Write-Host "   Check BIOS settings for VT-x/AMD-V" -ForegroundColor Gray
            return $false
        }
    }
    catch {
        Write-Host "[WARNING] Could not check virtualization status" -ForegroundColor Yellow
        return $false
    }
}

# Function to check project dependencies
function Test-ProjectDependencies {
    Write-Host "`n[CHECK] Project Dependencies..." -ForegroundColor Yellow
    
    if (Test-Path "package.json") {
        Write-Host "[OK] package.json found" -ForegroundColor Green
        
        if (Test-Path "node_modules") {
            Write-Host "[OK] node_modules directory exists" -ForegroundColor Green
        }
        else {
            Write-Host "[WARNING] node_modules not found" -ForegroundColor Yellow
            Write-Host "   Run: npm install" -ForegroundColor Gray
        }
        
        if (Test-Path "Dockerfile") {
            Write-Host "[OK] Dockerfile found" -ForegroundColor Green
        }
        else {
            Write-Host "[ERROR] Dockerfile not found" -ForegroundColor Red
            return $false
        }
        
        return $true
    }
    else {
        Write-Host "[ERROR] package.json not found" -ForegroundColor Red
        Write-Host "   Make sure you're in the correct directory" -ForegroundColor Gray
        return $false
    }
}

# Function to install missing prerequisites
function Install-MissingPrerequisites {
    Write-Host "`n[INSTALL] Installing missing prerequisites..." -ForegroundColor Yellow
    
    if (-not (Test-Administrator)) {
        Write-Host "[ERROR] Administrator privileges required for installation" -ForegroundColor Red
        Write-Host "   Please run PowerShell as Administrator" -ForegroundColor Gray
        return
    }
    
    # Install winget if not available
    if (-not (Test-Command "winget")) {
        Write-Host "[INFO] Installing winget..." -ForegroundColor Cyan
        # winget installation instructions
    }
    
    # Install Docker Desktop
    if (-not (Test-Command "docker")) {
        Write-Host "[INFO] Installing Docker Desktop..." -ForegroundColor Cyan
        winget install Docker.DockerDesktop
    }
    
    # Install Node.js
    if (-not (Test-Command "node")) {
        Write-Host "[INFO] Installing Node.js..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS
    }
    
    # Install Azure CLI
    if (-not (Test-Command "az")) {
        Write-Host "[INFO] Installing Azure CLI..." -ForegroundColor Cyan
        winget install Microsoft.AzureCLI
    }
    
    # Install Git
    if (-not (Test-Command "git")) {
        Write-Host "[INFO] Installing Git..." -ForegroundColor Cyan
        winget install Git.Git
    }
}

# Main execution
try {
    Write-Host "Checking prerequisites for File Service Container Development..." -ForegroundColor Cyan
    
    $allChecks = @()
    
    # System checks
    $allChecks += Test-WindowsVersion
    $allChecks += Test-PowerShell
    $allChecks += Test-DiskSpace
    $allChecks += Test-Virtualization
    $allChecks += Test-WSL2
    
    # Tool checks
    $allChecks += Test-Docker
    $allChecks += Test-NodeJS
    $allChecks += Test-AzureCLI
    $allChecks += Test-Git
    $allChecks += Test-VSCodeDockerExtension
    
    # Project checks
    $allChecks += Test-ProjectDependencies
    
    # Summary
    Write-Host "`n" + "="*60 -ForegroundColor Green
    Write-Host "PREREQUISITES CHECK SUMMARY" -ForegroundColor Green
    Write-Host "="*60 -ForegroundColor Green
    
    $passed = ($allChecks | Where-Object { $_ -eq $true }).Count
    $total = $allChecks.Count
    
    Write-Host "Passed: $passed/$total checks" -ForegroundColor Cyan
    
    if ($passed -eq $total) {
        Write-Host "`n🎉 All prerequisites are met! You're ready to proceed." -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Yellow
        Write-Host "1. Run: npm run debug:local-docker" -ForegroundColor Gray
        Write-Host "2. Test your container locally" -ForegroundColor Gray
        Write-Host "3. Deploy to Azure when ready" -ForegroundColor Gray
    }
    else {
        Write-Host "`n⚠️ Some prerequisites are missing." -ForegroundColor Yellow
        Write-Host "`nTo install missing items:" -ForegroundColor Yellow
        Write-Host "1. Run PowerShell as Administrator" -ForegroundColor Gray
        Write-Host "2. Run: .\check-prerequisites.ps1 -InstallMissing" -ForegroundColor Gray
        Write-Host "3. Or install manually using the links provided above" -ForegroundColor Gray
    }
    
    if ($InstallMissing) {
        Install-MissingPrerequisites
    }
}
catch {
    Write-Host "`n[ERROR] Prerequisites check failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
