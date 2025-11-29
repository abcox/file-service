@echo off
echo Testing Debug Mode Locally
echo =============================

REM Set debug environment variable
set DEBUG_STARTUP=true
set NODE_ENV=production

echo.
echo [STEP 1] Environment Variables Set
echo DEBUG_STARTUP=true
echo NODE_ENV=production

echo.
echo [STEP 2] Building Application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Build failed!
    exit /b 1
)
echo Build successful

echo.
echo [STEP 3] Running Application with Debug Mode...
echo This will start the app and show debug diagnostics. Press Ctrl+C to stop after diagnostics complete.

node dist/src/main.js

echo.
echo Debug mode test completed!
echo If you saw diagnostic output with emoji indicators, debug mode is working correctly.
