# Docker Extension for VS Code/Cursor - Development Guide

## 🐳 Why the Docker Extension is Essential

The Docker extension for VS Code/Cursor (`ms-azuretools.vscode-docker`) is incredibly valuable for container development and debugging. It provides a visual interface for managing Docker containers, images, and volumes directly from your IDE.

## 🚀 Key Benefits

### **1. Visual Container Management**
- **Container Explorer**: See all running/stopped containers at a glance
- **Image Management**: Browse and manage Docker images
- **Volume Management**: View and manage Docker volumes
- **Network Management**: Inspect Docker networks

### **2. Integrated Debugging**
- **Attach to Running Containers**: Debug your application inside containers
- **Interactive Terminal**: Execute commands directly in containers
- **Real-time Logs**: View container logs with syntax highlighting
- **Port Forwarding**: Automatically forward container ports

### **3. Development Workflow**
- **Build Images**: Build Docker images with one click
- **Run Containers**: Start containers with custom configurations
- **Compose Support**: Manage multi-container applications
- **Registry Integration**: Push/pull images from registries

### **4. Azure Integration**
- **Azure Container Registry**: Direct integration with ACR
- **Azure Container Instances**: Deploy to ACI from VS Code
- **Azure Container Apps**: Manage container apps

## 📦 Installation

### **Method 1: VS Code Marketplace**
1. Open VS Code/Cursor
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "Docker"
4. Install "Docker" by Microsoft

### **Method 2: Command Line**
```bash
code --install-extension ms-azuretools.vscode-docker
```

### **Method 3: Check with Prerequisites Script**
```bash
npm run debug:check-prerequisites
```

## 🎯 How to Use for Your File Service Project

### **1. View Your Containers**
- Open the Docker extension panel (whale icon in sidebar)
- See all containers, including your `file-service-test` container
- Right-click for actions: start, stop, restart, logs, exec

### **2. Debug Your Container**
```bash
# Start your container locally first
npm run debug:local-docker

# Then in VS Code/Cursor:
# 1. Go to Docker extension
# 2. Find your container
# 3. Right-click → "Attach Shell" or "View Logs"
```

### **3. Interactive Container Management**
- **Attach Shell**: Get interactive terminal inside container
- **View Logs**: Real-time log streaming with search
- **Inspect**: View container details, environment variables
- **Port Forwarding**: Access container ports directly

### **4. Build and Run**
- **Build Image**: Right-click Dockerfile → "Build Image"
- **Run Container**: Right-click image → "Run"
- **Compose Up**: If using docker-compose.yml

## 🔧 Advanced Features

### **Container Debugging**
```json
// .vscode/launch.json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Attach to Container",
            "type": "node",
            "request": "attach",
            "port": 9229,
            "address": "localhost",
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/app",
            "protocol": "inspector"
        }
    ]
}
```

### **Docker Compose Integration**
- Open `docker-compose.yml` files
- Right-click → "Compose Up" or "Compose Down"
- View service logs and status

### **Registry Management**
- Browse Azure Container Registry
- Push/pull images
- Manage tags and repositories

## 🐛 Debugging Your File Service Container

### **Step 1: Start Container with Debug Port**
```bash
# Modify your local-docker-test.ps1 to expose debug port
docker run -d --name file-service-test \
  -p 3000:3000 \
  -p 9229:9229 \  # Node.js debug port
  -e NODE_ENV=development \
  file-service-local
```

### **Step 2: Attach Debugger**
1. Set breakpoints in your code
2. Go to Run and Debug panel (Ctrl+Shift+D)
3. Select "Attach to Container" configuration
4. Start debugging

### **Step 3: Interactive Debugging**
- **Breakpoints**: Set breakpoints in your TypeScript code
- **Variable Inspection**: View variables and call stack
- **Step Through**: Step through code execution
- **Console**: Execute code in container context

## 📊 Monitoring and Logs

### **Real-time Logs**
- Right-click container → "View Logs"
- Filter logs by severity
- Search within logs
- Follow logs in real-time

### **Container Metrics**
- CPU and memory usage
- Network I/O
- Disk I/O
- Process information

### **Health Checks**
- View health check status
- Monitor restart counts
- Check exit codes

## 🔍 Troubleshooting with Docker Extension

### **Container Won't Start**
1. Check container logs in extension
2. View container details for errors
3. Inspect environment variables
4. Check port conflicts

### **Application Issues**
1. Attach shell to running container
2. Execute commands interactively
3. Check file permissions
4. Verify dependencies

### **Network Issues**
1. Inspect container network settings
2. Check port mappings
3. View network connectivity
4. Test port forwarding

## 🎨 VS Code/Cursor Integration Tips

### **Workspace Settings**
```json
// .vscode/settings.json
{
    "docker.host": "npipe:////./pipe/docker_engine",
    "docker.explorerRefreshInterval": 1000,
    "docker.commands.build": "docker build --no-cache",
    "docker.commands.run": "docker run -d"
}
```

### **Keybindings**
- `Ctrl+Shift+P` → "Docker: Add Docker Files to Workspace"
- `Ctrl+Shift+P` → "Docker: Build Image"
- `Ctrl+Shift+P` → "Docker: Run Interactive"

### **Snippets**
- Dockerfile snippets
- docker-compose snippets
- Container configuration snippets

## 🚀 Azure Container Instance Integration

### **Deploy to ACI**
1. Build image locally
2. Push to Azure Container Registry
3. Use Azure extension to deploy to ACI
4. Monitor deployment in VS Code

### **Remote Debugging**
```bash
# Enable debug mode in ACI
az container create \
  --resource-group your-rg \
  --name your-container \
  --image your-image \
  --ports 3000 9229 \
  --environment-variables NODE_ENV=development
```

## 📋 Best Practices

### **Development Workflow**
1. **Local Development**: Use Docker extension for local testing
2. **Debugging**: Attach debugger to running containers
3. **Logging**: Monitor logs in real-time
4. **Deployment**: Use Azure integration for production

### **Container Management**
1. **Clean Up**: Regularly remove unused containers/images
2. **Resource Monitoring**: Watch CPU/memory usage
3. **Security**: Use non-root users in containers
4. **Optimization**: Optimize image sizes

### **Team Collaboration**
1. **Shared Configurations**: Use workspace settings
2. **Documentation**: Document container setup
3. **Version Control**: Include Docker configurations in git
4. **CI/CD Integration**: Use extension with GitHub Actions

## 🎉 Getting Started Checklist

- [ ] Install Docker extension
- [ ] Verify Docker Desktop is running
- [ ] Open your file-service project
- [ ] Explore the Docker panel
- [ ] Try building your image
- [ ] Run your container locally
- [ ] Attach shell to container
- [ ] View container logs
- [ ] Set up debugging configuration

## 🔗 Useful Commands

### **Extension Commands**
```bash
# Install extension
code --install-extension ms-azuretools.vscode-docker

# Check if installed
code --list-extensions | grep docker

# Update extension
code --update-extension ms-azuretools.vscode-docker
```

### **Docker Commands (via Extension)**
- Right-click container → "Start"
- Right-click container → "Stop"
- Right-click container → "Restart"
- Right-click container → "Remove"
- Right-click container → "View Logs"
- Right-click container → "Attach Shell"

The Docker extension transforms container development from command-line operations to visual, interactive management. It's especially valuable for debugging your file-service container issues and understanding what's happening inside your containers.
