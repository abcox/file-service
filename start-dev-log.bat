@echo off
mkdir logs 2>nul
nest start --watch > logs\app-startup.log 2>&1 