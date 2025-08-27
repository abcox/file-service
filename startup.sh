#!/bin/bash

# Create the playwright directory in the writable wwwroot
mkdir -p /home/site/wwwroot/.playwright

# Install Playwright browsers to the writable directory
echo "Installing Playwright browsers to /home/site/wwwroot/.playwright..."
npx playwright install chromium --with-deps --cache-dir /home/site/wwwroot/.playwright

# Set the browser path environment variable
export PLAYWRIGHT_BROWSER_PATH="/home/site/wwwroot/.playwright/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell"
echo "Set PLAYWRIGHT_BROWSER_PATH to: $PLAYWRIGHT_BROWSER_PATH"

# Start the application
echo "Starting application..."
node dist/src/main.js
