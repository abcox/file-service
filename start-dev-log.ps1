# Create logs directory if it doesn't exist
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs" -Force
}

# Use a single log file
$logFile = "logs\app-startup.log"

Write-Host "Starting application with logging to: $logFile"

# Start the application and capture output
nest start --watch 2>&1 | Tee-Object -FilePath $logFile 