#!/bin/bash

# Set the browser path environment variable to the actual installation location
export PLAYWRIGHT_BROWSER_PATH="/home/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell"
echo "Set PLAYWRIGHT_BROWSER_PATH to: $PLAYWRIGHT_BROWSER_PATH"

# Start the application
echo "Starting application..."
node dist/src/main.js
