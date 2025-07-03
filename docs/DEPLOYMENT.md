# Azure Deployment Guide

## Prerequisites

1. **Azure Account** with active subscription
2. **GitHub Account** with your repository
3. **Azure CLI** installed locally (optional, for manual setup)

## Quick Setup (Recommended)

### 1. Create Azure App Service

1. Go to [Azure Portal](https://portal.azure.com)
2. Create a new **App Service**
3. Choose **Node.js 18 LTS** runtime
4. Select your subscription and resource group
5. Choose a unique app name (e.g., `your-file-service-prod`)
6. Select **Windows** as the operating system
7. Choose your region

### 2. Configure Azure Storage

1. Create a **Storage Account** in the same region
2. Create a **Blob Container** named `file-service-uploads`
3. Copy the **Connection String** from Access Keys

### 3. Set Up GitHub Actions

1. **Fork/Push** your code to GitHub
2. Go to your GitHub repository
3. Go to **Settings** → **Secrets and variables** → **Actions**
4. Add the following secrets:
   - `AZURE_WEBAPP_PUBLISH_PROFILE`: Download from Azure App Service → Get publish profile
   - `AZURE_STORAGE_CONNECTION_STRING`: Your storage account connection string

### 4. Configure App Service Settings

In Azure App Service → Configuration → Application settings, add:

```
NODE_ENV=production
AZURE_STORAGE_CONNECTION_STRING=your_connection_string_here
```

### 5. Deploy

1. Push to `main` branch
2. GitHub Actions will automatically deploy
3. Check deployment status in Actions tab

## Manual Deployment

### Using Azure CLI

```bash
# Login to Azure
az login

# Create resource group
az group create --name file-service-rg --location eastus

# Create app service plan
az appservice plan create --name file-service-plan --resource-group file-service-rg --sku B1

# Create web app
az webapp create --name your-file-service --resource-group file-service-rg --plan file-service-plan --runtime "NODE|18-lts"

# Configure app settings
az webapp config appsettings set --name your-file-service --resource-group file-service-rg --settings NODE_ENV=production

# Deploy from local directory
az webapp deployment source config-local-git --name your-file-service --resource-group file-service-rg
```

## Environment-Specific Deployments

### Development Environment

- Branch: `develop`
- App Service: `your-file-service-dev`
- Container: `file-service-uploads-dev`

### Staging Environment

- Branch: `staging`
- App Service: `your-file-service-staging`
- Container: `file-service-uploads-staging`

### Production Environment

- Branch: `main`
- App Service: `your-file-service-prod`
- Container: `file-service-uploads-prod`

## Monitoring and Logging

### Application Insights

1. Create Application Insights resource
2. Add instrumentation key to app settings
3. Update logger service to use Application Insights

### Azure Monitor

- View logs in App Service → Log stream
- Set up alerts for errors and performance
- Monitor storage usage and costs

## Troubleshooting

### Common Issues

1. **Build fails**: Check Node.js version in workflow
2. **Runtime errors**: Check app settings and environment variables
3. **Storage connection**: Verify connection string and container exists
4. **Port issues**: Ensure app listens on `process.env.PORT`

### Debug Commands

```bash
# Check app service logs
az webapp log tail --name your-file-service --resource-group file-service-rg

# Restart app service
az webapp restart --name your-file-service --resource-group file-service-rg
```

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **CORS**: Configure allowed origins for your frontend
3. **Authentication**: Consider adding Azure AD authentication
4. **HTTPS**: Enable HTTPS-only traffic
5. **Network Security**: Use Azure Front Door for additional security

## Cost Optimization

1. **App Service Plan**: Start with Basic (B1) for development
2. **Storage**: Use Standard storage for most use cases
3. **Scaling**: Enable auto-scaling for production workloads
4. **Monitoring**: Use Application Insights for better insights
