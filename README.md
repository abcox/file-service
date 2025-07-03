# File Service

Authored by Adam Cox (Vorba Corp)
Authored on June 30, 2025

A NestJS-based micro-service for managing files in Azure cloud via Blob storage (Azurite emul.) local file storage support in local dev.

## Features

- **File Upload/Download/Delete/List** operations
- **Swagger/OpenAPI** documentation
- **Environment-based configuration** (local vs Azure storage)
- **TypeScript** with full type safety
- **Azure Blob Storage** integration
- **Local development** with Azurite emulator

## Quick Start

### Prerequisites

- Node.js (v18+)
- npm or yarn
- Azure Storage Emulator (Azurite) for local development

### Installation

```bash
npm install
```

### Development

```bash
# Start the development server
npm run start:dev

# Start Azure Storage Emulator (Azurite)
npm run start-storage-emulator

# Access Swagger UI
# http://localhost:3000/api
```

## Configuration

### Environment Setup

The service uses a structured configuration approach:

```
env/
├── .env                    ← Current environment (dev/prod/staging)
├── config.development.json ← Development settings
└── config.production.json  ← Production settings
```

### Environment Variables

**Basic (.env file):**

```env
NODE_ENV=development
AZURE_STORAGE_CONNECTION_STRING=your-connection-string
```

**Development Config (config.development.json):**

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "storage": {
    "type": "azure",
    "azure": {
      "connectionString": "UseDevelopmentStorage=true",
      "container": "uploads"
    }
  }
}
```

## Development Notes

### Azure Storage Emulator (Azurite)

[Azurite documentation](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio%2Cblob-storage)

**Installation:**

- Comes with Visual Studio 2022
- Located at: `C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\Extensions\Microsoft\Azure Storage Emulator\azurite.exe`

**Usage:**

```bash
# Start Azurite
npm run start-storage-emulator  

# Azurite runs on:
# - Blob: http://127.0.0.1:10000
# - Queue: http://127.0.0.1:10001
# - Table: http://127.0.0.1:10002
```

**Connection String:**

- Development: `UseDevelopmentStorage=true`
- Production: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net`

### Storage Types

**Local Storage:**

- Files stored in `uploads/` directory
- Good for development and testing
- Files persist between server restarts

**Azure Blob Storage:**

- Files stored in Azure Blob Storage
- Scalable and persistent
- Requires Azure Storage account

### Process Management

**Useful Commands:**

```bash
# Find processes on port 3000
npm run find-process

# Kill all Node.js processes
npm run kill-node

# Kill specific process by PID
npm run kill-task-byid --pid=1234

# Kill process on port 3000
npm run kill-port-3000
```

## API Endpoints

- `GET /` - Hello message
- `POST /upload` - Upload a file
- `GET /files` - List all files
- `GET /files/:filename` - Download a file
- `DELETE /files/:filename` - Delete a file

## Deployment

### Environment Switching

**For different environments:**

```bash
# Development
cp env/.env.development env/.env

# Staging
cp env/.env.staging env/.env

# Production
cp env/.env.production env/.env
```

### Azure Deployment

1. Set `NODE_ENV=production` in `.env`
2. Add `AZURE_STORAGE_CONNECTION_STRING` to environment variables
3. Deploy to Azure App Service
4. Files will automatically use Azure Blob Storage

## Project Structure

```
file-service/
├── src/
│   ├── config/           ← Configuration management
│   ├── storage/          ← Storage service (local/Azure)
│   ├── app.controller.ts ← API endpoints
│   ├── app.service.ts    ← Business logic
│   └── main.ts          ← Application bootstrap
├── env/                  ← Environment configuration
├── uploads/             ← Local file storage
└── azurite/             ← Azurite data (auto-created)
```

## Configuration

For detailed information about configuration management, see [CONFIGURATION.md](./CONFIGURATION.md).

The application uses a layered configuration approach:
- **Base Configuration**: JSON files for non-sensitive settings
- **Environment Variables**: `.env` files for sensitive local development data
- **Azure Key Vault**: Secure storage for production secrets

## Troubleshooting

### Common Issues

**Port 3000 already in use:**

```bash
npm run kill-port-3000
```

**Azurite not starting:**

- Check if Visual Studio 2022 is installed
- Verify the path in package.json scripts
- Try running Azurite manually first

**Azure connection issues:**

- Verify connection string format
- Check if Azure Storage account exists
- Ensure container is created

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

# NESTJS README BEGINS

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
