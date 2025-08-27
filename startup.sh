#!/bin/bash

# Install Playwright browsers if they don't exist
if [ ! -d "/root/.cache/ms-playwright" ]; then
    echo "Installing Playwright browsers..."
    npx playwright install chromium --with-deps
fi

# Start the application
echo "Starting application..."
node dist/src/main.js
