@echo off
REM ========================================
REM DEPLOY BUILD SCRIPT
REM ========================================
REM
REM This script builds and deploys the NestJS app to Azure App Service
REM Usage: deploy-build.bat [AppServiceName] [ResourceGroup] [Environment]
REM

REM ========================================
REM CONFIGURATION
REM ========================================

REM Default values (can be overridden by command line arguments)
set DEFAULT_APP_SERVICE_NAME=vorba-file-service
set DEFAULT_RESOURCE_GROUP=vorba-file-service-rg
set DEFAULT_ENVIRONMENT=production

REM ========================================
REM PARAMETER HANDLING
REM ========================================

REM Get parameters from command line
set APP_SERVICE_NAME=%1
set RESOURCE_GROUP=%2
set ENVIRONMENT=%3

REM Use defaults if not provided
if "%APP_SERVICE_NAME%"=="" set APP_SERVICE_NAME=%DEFAULT_APP_SERVICE_NAME%
if "%RESOURCE_GROUP%"=="" set RESOURCE_GROUP=%DEFAULT_RESOURCE_GROUP%
if "%ENVIRONMENT%"=="" set ENVIRONMENT=%DEFAULT_ENVIRONMENT%

REM ========================================
REM VALIDATION
REM ========================================

echo.
echo ========================================
echo DEPLOY BUILD SCRIPT
echo ========================================
echo.
echo Configuration:
echo   App Service: %APP_SERVICE_NAME%
echo   Resource Group: %RESOURCE_GROUP%
echo   Environment: %ENVIRONMENT%
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found. Please run this script from the project root.
    echo.
    pause
    exit /b 1
)

REM Check if the PowerShell script exists
if not exist "scripts\deploy\deploy-build.ps1" (
    echo ERROR: deploy-build.ps1 not found at scripts\deploy\deploy-build.ps1
    echo.
    pause
    exit /b 1
)

REM ========================================
REM EXECUTION
REM ========================================

echo Starting build and deploy process...
echo.

REM Run the PowerShell script with parameters
powershell -ExecutionPolicy Bypass -File "scripts\deploy\deploy-build.ps1" -AppServiceName "%APP_SERVICE_NAME%" -ResourceGroup "%RESOURCE_GROUP%" -Environment "%ENVIRONMENT%"

REM Check the exit code
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo DEPLOYMENT COMPLETED SUCCESSFULLY
    echo ========================================
    echo.
    echo App Service: %APP_SERVICE_NAME%
    echo Resource Group: %RESOURCE_GROUP%
    echo Environment: %ENVIRONMENT%
    echo.
    echo You can access your application at:
    echo https://%APP_SERVICE_NAME%.azurewebsites.net
    echo.
    echo Swagger documentation:
    echo https://%APP_SERVICE_NAME%.azurewebsites.net/api
    echo.
) else (
    echo.
    echo ========================================
    echo DEPLOYMENT FAILED
    echo ========================================
    echo.
    echo Exit code: %ERRORLEVEL%
    echo.
    echo Please check the error messages above and try again.
    echo.
)

pause 