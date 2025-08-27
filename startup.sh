#!/bin/bash

# Create the playwright directory in the writable wwwroot
mkdir -p /home/site/wwwroot/.playwright

# Install Playwright browsers to the writable directory
echo "Installing Playwright browsers to /home/site/wwwroot/.playwright..."
npx playwright install chromium --with-deps

# Move browsers to writable directory
if [ -d "/root/.cache/ms-playwright" ]; then
    echo "Moving browsers to writable directory..."
    cp -r /root/.cache/ms-playwright /home/site/wwwroot/.playwright/
fi

# Find and set the browser path environment variable
BROWSER_PATH=$(find /home/site/wwwroot/.playwright/ms-playwright -name "chrome" -type f | head -1)
export PLAYWRIGHT_BROWSER_PATH="$BROWSER_PATH"
echo "Set PLAYWRIGHT_BROWSER_PATH to: $PLAYWRIGHT_BROWSER_PATH"

# Start the application
echo "Starting application..."
node dist/src/main.js
