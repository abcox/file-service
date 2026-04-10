# Deployment Options Guide

This guide explains the different deployment approaches available for your NestJS file service and helps you choose the best option.

## 🔗 **Quick Reference: Live URLs**

| Deployment | Health Check URL | Notes |
|------------|------------------|-------|
| **Web App** | https://vorba-file-service-3.azurewebsites.net/health | No port needed (Azure handles 443→8080) |
| **ACI** | http://vorba-file-service-4.canadaeast.azurecontainer.io:8080/health | **Port required** - ACI exposes directly |
| **Local Dev** | http://localhost:3000/health | Uses config.json port (3000) |

### Port Configuration

| Environment | Port | Why |
|-------------|------|-----|
| Production (Web App/ACI) | 8080 | Container runs as a non-root user, so using an unprivileged port avoids binding-to-port-80 issues |
| Local Development | 3000 | Node.js convention, set in `config.json` |

> **Note**: `process.env.PORT` always takes priority over config if set.

### Why ACI Uses `:8080`

- The `file-service` production container runs as a non-root Linux user for better container security.
- Non-root processes normally cannot bind to privileged ports such as `80` without extra Linux capabilities.
- Using `8080` avoids that problem and keeps the same container behavior across Azure Web App and Azure Container Instances.
- Azure Web App can front the container on standard HTTPS, so no port appears in the public URL there.
- Azure Container Instances exposes the container port directly, so the public URL must include `:8080`.

---

## 🎯 **Deployment Options Overview**

| Option | Complexity | Performance | Cost | Modern | Recommended |
|--------|------------|-------------|------|--------|-------------|
| **Linux App Service** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ **Best for now** |
| **Docker Container** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ **Best for production** |
| **Windows IIS** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ❌ **Not recommended** |

## 🐧 **Option 1: Linux App Service (Recommended for Starting)**

### ✅ **Pros**
- **Simple**: Direct deployment without containers
- **Fast**: Quick setup and deployment
- **Cost-effective**: Lower resource usage
- **Azure-native**: Optimized for Azure App Service

### ❌ **Cons**
- **Less portable**: Tied to Azure App Service
- **Limited isolation**: Shared environment
- **Less consistent**: Environment differences possible

### 📁 **Files**
- `.github/workflows/azure-deploy.yml` (simple)
- `.github/workflows/azure-deploy-comprehensive.yml` (enhanced)

### 🚀 **Setup**
```bash
# Just add the publish profile to GitHub Secrets
# Push to main/develop branch
# That's it!
```

## 🐳 **Option 2: Docker Container (Recommended for Production)**

### ✅ **Pros**
- **Portable**: Can run anywhere (Azure, AWS, GCP, local)
- **Consistent**: Same environment everywhere
- **Isolated**: No shared dependencies
- **Modern**: Industry standard
- **Scalable**: Easy horizontal scaling

### ❌ **Cons**
- **More complex**: Requires Docker knowledge
- **Additional cost**: Container registry fees
- **Learning curve**: New concepts to understand

### 📁 **Files**
- `Dockerfile` (container definition)
- `.github/workflows/azure-deploy-docker.yml` (Docker workflow)

### 🚀 **Setup**
```bash
# 1. Create Azure Container Registry (ACR)
# 2. Add ACR credentials to GitHub Secrets
# 3. Configure App Service for container deployment
# 4. Push to trigger Docker build and deploy
```

## 🪟 **Option 3: Windows IIS (Not Recommended)**

### ✅ **Pros**
- **Familiar**: Traditional Windows hosting
- **Integrated**: Good Windows ecosystem support

### ❌ **Cons**
- **Heavy**: More resource overhead
- **Slower**: Additional translation layer
- **Expensive**: Higher costs for same performance
- **Complex**: Requires web.config configuration
- **Outdated**: Not modern best practice

## 🎯 **Recommendation: Start with Linux, Move to Docker**

### **Phase 1: Linux App Service (Now)**
- ✅ **Quick setup**: Get running immediately
- ✅ **Learn Azure**: Understand the platform
- ✅ **Low complexity**: Focus on your application
- ✅ **Cost-effective**: Minimal additional costs

### **Phase 2: Docker Container (Later)**
- 🐳 **Production ready**: Better for scaling
- 🐳 **Portable**: Can move to other clouds
- 🐳 **Consistent**: Same environment everywhere
- 🐳 **Modern**: Industry best practice

## 🔧 **Current Setup Analysis**

### **What We Have**
- ✅ **Linux App Service Plan**: `vorba-file-service-plan`
- ✅ **Linux App Service**: `vorba-file-service`
- ✅ **Linux runtime**: Node.js 18 LTS
- ✅ **Health endpoint**: `/health` for monitoring

### **What We Fixed**
- ❌ **Removed Windows IIS config** from Linux deployment
- ✅ **Added proper Linux startup commands**
- ✅ **Created Docker option** for future use

## 🚀 **Immediate Next Steps**

### **Option A: Stick with Linux App Service**
1. Use the updated `.github/workflows/azure-deploy-comprehensive.yml`
2. Add publish profile to GitHub Secrets
3. Push to trigger deployment
4. Monitor and optimize

### **Option B: Move to Docker (Advanced)**
1. Create Azure Container Registry
2. Configure App Service for container deployment
3. Add ACR credentials to GitHub Secrets
4. Use `.github/workflows/azure-deploy-docker.yml`

## 💰 **Cost Comparison**

| Option | Monthly Cost | Annual Cost | Notes |
|--------|-------------|-------------|-------|
| **Linux App Service** | ~$15-20 | ~$180-240 | Current setup |
| **Docker + ACR** | ~$20-25 | ~$240-300 | +$5-10/month for ACR |
| **Windows IIS** | ~$25-35 | ~$300-420 | 40-75% more expensive |

## 🔄 **Migration Path**

### **Linux → Docker Migration**
1. **Week 1**: Set up ACR and test Docker builds
2. **Week 2**: Configure App Service for containers
3. **Week 3**: Deploy Docker version alongside Linux
4. **Week 4**: Switch traffic to Docker version
5. **Week 5**: Clean up Linux deployment

## 🎯 **My Recommendation**

**Start with Linux App Service** for these reasons:

1. **Quick wins**: Get your app deployed and working
2. **Learn Azure**: Understand the platform before adding complexity
3. **Cost effective**: Lower initial investment
4. **Easy migration**: Can move to Docker later without losing work

**Move to Docker when you need:**
- Better performance at scale
- Multi-cloud portability
- Consistent environments
- Advanced deployment strategies

## 🛠️ **Ready to Deploy?**

Choose your path:

### **Quick Start (Linux)**
```bash
# 1. Add publish profile to GitHub Secrets
# 2. Push to main branch
# 3. Watch deployment in Actions tab
```

### **Advanced Start (Docker)**
```bash
# 1. Create Azure Container Registry
# 2. Add ACR credentials to GitHub Secrets
# 3. Configure App Service for containers
# 4. Push to trigger Docker deployment
```

Both approaches will work great! The Linux option is perfect for getting started, and you can always migrate to Docker later when you need the additional benefits.

---

## Related Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Step-by-step Azure deployment guide
- [CICD_SETUP.md](./CICD_SETUP.md) - CI/CD pipeline configuration and automated testing
- [TESTING.md](./TESTING.md) - Testing strategy and commands 