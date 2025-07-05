@echo off
REM Vorba File Service Azure Deployment Batch File
REM This file runs the PowerShell deployment script with your specific parameters

echo.
echo ========================================
echo   Vorba File Service Deployment
echo ========================================
echo.

REM ========================================
REM CONFIGURATION - UPDATE THESE VALUES
REM ========================================

REM Required parameters (you must update these)
set STORAGE_ACCOUNT_NAME=ccastore01

REM Optional parameters (leave empty if not using Key Vault)
set KEYVAULT_NAME=

REM Optional parameters (update if needed)
set RESOURCE_GROUP_NAME=vorba-file-service-rg
set LOCATION=Canada East
set APP_SERVICE_NAME=vorba-file-service-2
set APP_SERVICE_PLAN_NAME=vorba-file-service-plan
set CONTAINER_NAME=file-service-uploads

REM Dry run mode (set to true for dry run, false for actual deployment)
set DRY_RUN=false

REM ========================================
REM VALIDATION
REM ========================================

echo Checking configuration...
echo.

REM Key Vault is optional - no validation needed

if "%STORAGE_ACCOUNT_NAME%"=="your-storage-account-name-here" (
    echo ERROR: Please update STORAGE_ACCOUNT_NAME in deploy-infra-config.bat
    echo.
    pause
    exit /b 1
)

echo Configuration looks good!
echo.
echo Key Vault: %KEYVAULT_NAME%
echo Storage Account: %STORAGE_ACCOUNT_NAME%
echo Resource Group: %RESOURCE_GROUP_NAME%
echo Location: %LOCATION%
echo App Service: %APP_SERVICE_NAME%
echo Dry Run: %DRY_RUN%
echo.

REM ========================================
REM CONFIRMATION
REM ========================================

set /p CONFIRM="Do you want to proceed with deployment? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo Deployment cancelled.
    pause
    exit /b 0
)

echo.
echo Starting deployment...
echo.

REM ========================================
REM RUN POWERSHELL SCRIPT
REM ========================================

if "%DRY_RUN%"=="true" (
    powershell -ExecutionPolicy Bypass -File "%~dp0deploy-infra.ps1" ^
        -KeyVaultName "%KEYVAULT_NAME%" ^
        -StorageAccountName "%STORAGE_ACCOUNT_NAME%" ^
        -ResourceGroupName "%RESOURCE_GROUP_NAME%" ^
        -Location "%LOCATION%" ^
        -AppServiceName "%APP_SERVICE_NAME%" ^
        -AppServicePlanName "%APP_SERVICE_PLAN_NAME%" ^
        -ContainerName "%CONTAINER_NAME%" ^
        -DryRun
) else (
    powershell -ExecutionPolicy Bypass -File "%~dp0deploy-infra.ps1" ^
        -KeyVaultName "%KEYVAULT_NAME%" ^
        -StorageAccountName "%STORAGE_ACCOUNT_NAME%" ^
        -ResourceGroupName "%RESOURCE_GROUP_NAME%" ^
        -Location "%LOCATION%" ^
        -AppServiceName "%APP_SERVICE_NAME%" ^
        -AppServicePlanName "%APP_SERVICE_PLAN_NAME%" ^
        -ContainerName "%CONTAINER_NAME%"
)

REM ========================================
REM CHECK RESULT
REM ========================================

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   Deployment completed successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Check the generated publish profile file
    echo 2. Add it to GitHub Secrets as AZURE_WEBAPP_PUBLISH_PROFILE
    echo 3. Push to main branch to trigger deployment
    echo.
) else (
    echo.
    echo ========================================
    echo   Deployment failed!
    echo ========================================
    echo.
    echo Check the error messages above and try again.
    echo.
)

pause 