@echo off
REM ========================================
REM DEPLOYMENT CONFIGURATION TEMPLATE
REM ========================================
REM
REM Copy this file to deploy-infra.bat and update the values below
REM with your actual Azure resource names.
REM

REM ========================================
REM REQUIRED - UPDATE THESE VALUES
REM ========================================

REM Your existing Key Vault name (without .vault.azure.net)
set KEYVAULT_NAME=vorba-keyvault

REM Your existing Storage Account name (without .blob.core.windows.net)
set STORAGE_ACCOUNT_NAME=vorbastorage

REM ========================================
REM OPTIONAL - Update if needed
REM ========================================

REM Resource Group name (will be created if it doesn't exist)
set RESOURCE_GROUP_NAME=vorba-file-service-rg

REM Azure region
set LOCATION=Canada East

REM App Service name (must be globally unique)
set APP_SERVICE_NAME=vorba-file-service

REM App Service Plan name
set APP_SERVICE_PLAN_NAME=vorba-file-service-plan

REM Blob container name (will be created if it doesn't exist)
set CONTAINER_NAME=file-service-uploads

REM ========================================
REM EXAMPLES
REM ========================================
REM
REM If your resources are:
REM - Key Vault: https://mycompany-kv.vault.azure.net/
REM - Storage: https://mycompanystorage.blob.core.windows.net/
REM
REM Then set:
REM set KEYVAULT_NAME=mycompany-kv
REM set STORAGE_ACCOUNT_NAME=mycompanystorage
REM
REM ======================================== 