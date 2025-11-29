@echo off
echo Starting Local Docker Test...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found. Please run this from the file-service directory.
    exit /b 1
)

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0local-docker-test.ps1"

REM Check the exit code
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Script failed with exit code %ERRORLEVEL%
    echo.
    echo Alternative: Try running the PowerShell script directly:
    echo powershell -ExecutionPolicy Bypass -File scripts\debug\local-docker-test.ps1
    exit /b %ERRORLEVEL%
)

echo.
echo Script completed successfully.
pause
