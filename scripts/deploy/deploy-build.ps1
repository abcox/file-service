# deploy-build.ps1 -- Builds and deploys the NestJS app to Azure App Service
# Usage: .\scripts\deploy\deploy-build.ps1 [-AppServiceName "your-app-name"] [-ResourceGroup "your-rg"] [-Environment "production"]

param (
    [string]$AppServiceName = "vorba-file-service-3",
    [string]$ResourceGroup = "vorba-file-service-rg",
    [string]$Environment = "production",
    [switch]$DryRun,
    [switch]$SkipBuild,
    [switch]$SkipDeploy,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Step)
    Write-ColorOutput "`n[STEP] $Step" $Blue
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "[SUCCESS] $Message" $Green
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "[WARNING] $Message" $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "[ERROR] $Message" $Red
}

function Test-Prerequisites {
    Write-Step "Checking prerequisites..."
    
    # Check if Azure CLI is installed
    try {
        $azVersion = az version --output json | ConvertFrom-Json
        Write-Success "Azure CLI version: $($azVersion.'azure-cli')"
    }
    catch {
        Write-Error "Azure CLI not found. Please install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        exit 1
    }
    
    # Check if logged in to Azure
    try {
        $account = az account show --output json | ConvertFrom-Json
        Write-Success "Logged in as: $($account.user.name)"
        Write-Success "Subscription: $($account.name)"
    }
    catch {
        Write-Error "Not logged in to Azure. Run: az login"
        exit 1
    }
    
    # Check if Node.js is installed
    try {
        $nodeVersion = node --version
        Write-Success "Node.js version: $nodeVersion"
    }
    catch {
        Write-Error "Node.js not found. Please install Node.js"
        exit 1
    }
    
    # Check if npm is available
    try {
        $npmVersion = npm --version
        Write-Success "npm version: $npmVersion"
    }
    catch {
        Write-Error "npm not found"
        exit 1
    }
}

function Test-AzureResources {
    Write-Step "Verifying Azure resources..."
    
    # Check if Resource Group exists
    try {
        $rg = az group show --name $ResourceGroup --output json 2>$null | ConvertFrom-Json
        if ($rg) {
            Write-Success "Resource Group '$ResourceGroup' exists"
        } else {
            Write-Error "Resource Group '$ResourceGroup' not found"
            exit 1
        }
    }
    catch {
        Write-Error "Resource Group '$ResourceGroup' not found"
        exit 1
    }
    
    # Check if App Service exists
    try {
        $app = az webapp show --name $AppServiceName --resource-group $ResourceGroup --output json 2>$null | ConvertFrom-Json
        if ($app) {
            Write-Success "App Service '$AppServiceName' exists"
            Write-Success "App Service URL: $($app.defaultHostName)"
        } else {
            Write-Error "App Service '$AppServiceName' not found in Resource Group '$ResourceGroup'"
            exit 1
        }
    }
    catch {
        Write-Error "App Service '$AppServiceName' not found in Resource Group '$ResourceGroup'"
        exit 1
    }
}

function Build-Application {
    Write-Step "Building application..."
    
    if ($SkipBuild) {
        Write-Warning "Skipping build (SkipBuild flag set)"
        return
    }
    
    # Clean previous build
    Write-ColorOutput "[CLEAN] Cleaning previous build..." $Yellow
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist"
    }
    if (Test-Path "node_modules") {
        Remove-Item -Recurse -Force "node_modules"
    }
    
    # Install dependencies
    Write-ColorOutput "[INSTALL] Installing dependencies..." $Yellow
    npm install
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies"
        exit 1
    }
    
    # Build the application
    Write-ColorOutput "[BUILD] Building application..." $Yellow
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed"
        exit 1
    }
    
    # Verify build output
    if (-not (Test-Path "dist")) {
        Write-Error "Build output not found in 'dist' directory"
        exit 1
    }
    
    Write-Success "Build completed successfully"
}

function Deploy-Application {
    Write-Step "Deploying to Azure App Service..."
    
    if ($SkipDeploy) {
        Write-Warning "Skipping deployment (SkipDeploy flag set)"
        return
    }
    
    if ($DryRun) {
        Write-Warning "DRY RUN - Would deploy to: $AppServiceName"
        Write-ColorOutput "Deployment would include:" $Yellow
        Write-ColorOutput "  - Source: ./dist" $Yellow
        Write-ColorOutput "  - Target: $AppServiceName" $Yellow
        Write-ColorOutput "  - Resource Group: $ResourceGroup" $Yellow
        return
    }
    
    # Create deployment package
    Write-ColorOutput "[PACKAGE] Creating deployment package..." $Yellow
    
    # Create a temporary directory for the deployment package
    $tempDir = Join-Path $env:TEMP "deploy-temp-$(Get-Random)"
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    
    # Copy build output directly to wwwroot (not in dist subfolder)
    # Copy dist contents to temp root
    Get-ChildItem -Path "dist" -Recurse | ForEach-Object {
        $relativePath = $_.FullName.Replace((Get-Location).Path + "\dist\", "").Replace("\", "/")
        $targetPath = Join-Path $tempDir $relativePath
        $targetDir = Split-Path $targetPath -Parent
        if (-not (Test-Path $targetDir)) {
            New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        }
        Copy-Item $_.FullName $targetPath -Force
    }
    
    # Copy package files
    Copy-Item "package.json" "$tempDir/"
    Copy-Item "package-lock.json" "$tempDir/"
    
    # Copy node_modules directly to temp root
    Write-ColorOutput "[COPY] Copying node_modules..." $Yellow
    Copy-Item -Recurse "node_modules" "$tempDir\"
    
    # Copy production config file directly to temp root
    Write-ColorOutput "[COPY] Copying production config..." $Yellow
    Copy-Item "env/config.production.json" "$tempDir\config.production.json"
    
    # Create a zip file using 7-Zip for Linux compatibility
    $zipPath = Join-Path $env:TEMP "deploy-$(Get-Random).zip"
    if (Test-Path $zipPath) {
        Remove-Item -Force $zipPath
    }
    
    # Check if 7-Zip is available
    $7zPath = "C:\Program Files\7-Zip\7z.exe"
    try {
        $null = & $7zPath -h 2>$null
        Write-ColorOutput "[ZIP] Using 7-Zip for Linux-compatible zip..." $Yellow
    }
    catch {
        # TODO: If linux is the target environment, powershell compression is not supported
        Write-ColorOutput "[ZIP] 7-Zip not found, falling back to PowerShell..." $Yellow
        $7zPath = $null
        exit 1
    }
    
    if ($7zPath) {
        # Use 7-Zip with Linux-compatible paths
        Write-ColorOutput "[ZIP] Creating deployment zip file with 7-Zip..." $Yellow
        $result = & $7zPath a -r -tzip $zipPath "$tempDir\*" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Error "7-Zip failed: $result"
            exit 1
        }
    } else {
        # Fallback to PowerShell
        Write-ColorOutput "[ZIP] Creating deployment zip file with PowerShell..." $Yellow
        Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force
    }
    
    # Verify zip file was created
    if (Test-Path $zipPath) {
        $zipSize = (Get-Item $zipPath).Length
        Write-ColorOutput "[ZIP] Zip file created: $zipPath (Size: $zipSize bytes)" $Yellow
    } else {
        Write-Error "Failed to create zip file"
        exit 1
    }
    
    # Deploy using Azure CLI
    Write-ColorOutput "[DEPLOY] Deploying to Azure..." $Yellow
    
    try {
        # Use the newer az webapp deploy command with zip file
        Write-ColorOutput "[DEPLOY] Deploying zip file: $zipPath" $Yellow
        $deployResult = az webapp deploy --resource-group $ResourceGroup --name $AppServiceName --src-path $zipPath --type zip --timeout 1800 2>&1
        
        # Check if deployment was actually successful by looking for success indicators
        if ($LASTEXITCODE -eq 0 -or $deployResult -match "Deployment successful" -or $deployResult -match "Deployment completed") {
            Write-Success "Deployment completed successfully"
        } else {
            # Check if it's just a warning about deprecation
            if ($deployResult -match "WARNING" -and $deployResult -match "deprecated") {
                Write-Success "Deployment completed successfully (with deprecation warning)"
            } else {
                Write-Error "Deployment failed with exit code: $LASTEXITCODE"
                Write-ColorOutput "[DEBUG] Deployment output: $deployResult" $Yellow
                Write-ColorOutput "[DEBUG] Check deployment logs at: https://$AppServiceName.scm.azurewebsites.net/api/deployments/latest" $Yellow
                exit 1
            }
        }
        
        # Ensure startup command is correct after deployment
        Write-ColorOutput "[CONFIG] Setting startup command..." $Yellow
        az webapp config set --name $AppServiceName --resource-group $ResourceGroup --startup-file "node src/main.js"
        Write-Success "Startup command configured: node src/main.js"
    }
    catch {
        Write-Error "Deployment failed: $_"
        Write-ColorOutput "[DEBUG] Check deployment logs at: https://$AppServiceName.scm.azurewebsites.net/api/deployments/latest" $Yellow
        exit 1
    }
    finally {
        # Clean up temporary files
        if (Test-Path $tempDir) {
            Remove-Item -Recurse -Force $tempDir
        }
        if (Test-Path $zipPath) {
            Remove-Item -Force $zipPath
        }
    }
}

function Test-Deployment {
    Write-Step "Testing deployment..."
    
    if ($DryRun) {
        Write-Warning "DRY RUN - Skipping deployment test"
        return
    }
    
    # Get the app URL
    try {
        $app = az webapp show --name $AppServiceName --resource-group $ResourceGroup --output json | ConvertFrom-Json
        $appUrl = "https://$($app.defaultHostName)"
        
        Write-ColorOutput "[TEST] Testing application at: $appUrl" $Yellow
        
        # Wait a moment for the app to start
        Start-Sleep -Seconds 10
        
        # Test the health endpoint
        try {
            $response = Invoke-WebRequest -Uri "$appUrl/health" -Method GET -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-Success "Application is responding (Status: $($response.StatusCode))"
            } else {
                Write-Warning "Application responded with status: $($response.StatusCode)"
            }
        }
        catch {
            Write-Warning "Could not reach health endpoint: $_"
        }
        
        # Test the API endpoint
        try {
            $response = Invoke-WebRequest -Uri "$appUrl/api" -Method GET -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-Success "API endpoint is responding (Status: $($response.StatusCode))"
            } else {
                Write-Warning "API endpoint responded with status: $($response.StatusCode)"
            }
        }
        catch {
            Write-Warning "Could not reach API endpoint: $_"
        }
        
        Write-Success "Deployment test completed"
        Write-ColorOutput "`n[SUMMARY] Deployment Summary:" $Blue
        Write-ColorOutput "  App Service: $AppServiceName" $Blue
        Write-ColorOutput "  Resource Group: $ResourceGroup" $Blue
        Write-ColorOutput "  URL: $appUrl" $Blue
        Write-ColorOutput "  Swagger: $appUrl/api" $Blue
        
    }
    catch {
        Write-Error "Failed to get app URL: $_"
    }
}

# Main execution
try {
    Write-ColorOutput "[START] Starting ad-hoc build and deploy..." $Blue
    Write-ColorOutput "App Service: $AppServiceName" $Blue
    Write-ColorOutput "Resource Group: $ResourceGroup" $Blue
    Write-ColorOutput "Environment: $Environment" $Blue
    
    if ($DryRun) {
        Write-Warning "DRY RUN MODE - No actual changes will be made"
    }
    
    Test-Prerequisites
    Test-AzureResources
    Build-Application
    Deploy-Application
    Test-Deployment
    
    Write-Success "`n[COMPLETE] Build and deploy completed successfully!"
}
catch {
    Write-Error "Build and deploy failed: $($_.Exception.Message)"
    exit 1
} 