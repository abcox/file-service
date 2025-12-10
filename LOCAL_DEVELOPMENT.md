# Local Development Setup

## CosmosDB Local Development (MongoDB API)

### Azure Cosmos DB Emulator Setup

**Start the Emulator:**
```bash
# Use the project script (recommended)
npm run start-cosmos-emulator

# This runs: "C:\Program Files\Azure Cosmos DB Emulator\Microsoft.Azure.Cosmos.Emulator.exe" 
# with /EnableMongoDbEndpoint=4.2 and custom data path
```

**Connection Details:**
- MongoDB Connection: `mongodb://localhost:27017`
- Database Name: `vorba-file-service-db` (auto-created from config.json)
- Web Interface: `https://localhost:8081/_explorer/` (NoSQL API - limited for MongoDB data)

### Database Inspection Tools

**Option 1: MongoDB Compass (Recommended)**
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass) (free)
2. Connect using: `mongodb://localhost:27017`
3. Navigate to database: `vorba-file-service-db`
4. View collections: `contact-collection`, `asset-collection`, etc.

**Option 2: VS Code Extensions**
- Install "MongoDB for VS Code" extension
- Add connection: `mongodb://localhost:27017`
- Browse databases and collections in VS Code sidebar

**Option 3: Command Line (mongosh)**
```bash
# Connect to local instance
mongosh mongodb://localhost:27017

# Switch to your database
use vorba-file-service-db

# List collections
show collections

# View documents in a collection
db.contacts.find().pretty()
db.assets.find().pretty()
```

### Important Notes

- **CosmosDB uses MongoDB API**: Your app connects via MongoDB protocol, but data is stored in CosmosDB
- **NoSQL Web Interface Limitation**: The web interface at `https://localhost:8081/_explorer/` uses NoSQL API and won't show MongoDB API data
- **Use MongoDB Tools**: Always use MongoDB-compatible tools (Compass, mongosh, MongoDB VS Code extension) to inspect data
- **Data Location**: Emulator data stored in `%LOCALAPPDATA%\CosmosDBEmulatorForMongo`

### Troubleshooting CosmosDB Emulator

**Multiple Restart Attempts Error:**
1. Stop all processes: `taskkill /f /im "Microsoft.Azure.Cosmos.Emulator.exe"`
2. Delete data directory: `%LOCALAPPDATA%\CosmosDBEmulatorForMongo`
3. Restart using: `npm run start-cosmos-emulator`

**Certificate Issues (Web Interface):**
- Accept the self-signed certificate when accessing `https://localhost:8081/_explorer/`
- This is normal for the local emulator

**Empty Database in Compass:**
- Database and collections are created when your app first inserts data
- Start your NestJS app (`npm run start:dev`) and make API calls to populate data

## SQL Server Local Development Options

### Option 1: SQL Server Express (Recommended)

**Download and Install:**
1. Download [SQL Server Express](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (Free)
2. Choose "Express" edition during installation
3. Install with "Mixed Mode" authentication
4. Set SA password: `YourStrong@Passw0rd` (or update config.json)

**Connection Details:**
- Server: `localhost` or `127.0.0.1`
- Port: `1433`
- Username: `sa`
- Password: `YourStrong@Passw0rd`
- Database: `file-service-db` (auto-created)

### Option 2: SQL Server Developer Edition (Free)

**Download and Install:**
1. Download [SQL Server Developer](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Choose "Developer" edition (Free for non-production)
3. Same setup as Express

### Option 3: Docker SQL Server

**Using Docker:**
```bash
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=YourStrong@Passw0rd" \
  -p 1433:1433 --name sql1 --hostname sql1 \
  -d mcr.microsoft.com/mssql/server:2022-latest
```

**Connection Details:**
- Server: `localhost`
- Port: `1433`
- Username: `sa`
- Password: `YourStrong@Passw0rd`

### Option 4: Azure SQL Edge (Docker)

**Using Docker:**
```bash
docker run --cap-add SYS_PTRACE -e 'ACCEPT_EULA=1' \
  -e 'MSSQL_SA_PASSWORD=YourStrong@Passw0rd' \
  -p 1433:1433 --name azuresqledge --hostname azuresqledge \
  -d mcr.microsoft.com/azure-sql-edge
```

## Configuration

Your `config.json` is already set up for local development:

```json
{
  "database": {
    "host": "localhost",
    "port": 1433,
    "name": "file-service-db",
    "username": "sa",
    "password": "YourStrong@Passw0rd"
  }
}
```

## Environment Variables

For local development, you can set these environment variables:

```bash
# Windows PowerShell
$env:DATABASE_HOST="localhost"
$env:DATABASE_PORT="1433"
$env:DATABASE_NAME="file-service-db"
$env:DATABASE_USERNAME="sa"
$env:DATABASE_PASSWORD="YourStrong@Passw0rd"

# Or use connection string
$env:DATABASE_CONNECTION_STRING="Server=localhost,1433;Database=file-service-db;User Id=sa;Password=YourStrong@Passw0rd;TrustServerCertificate=true;"
```

## Testing Connection

1. Start your application: `npm run start:dev`
2. Check logs for database connection
3. Tables will be auto-created in development mode

## Switching Between Local and Azure

The configuration automatically detects:
- **Local**: `localhost` or `127.0.0.1` → No encryption, trust certificates
- **Azure**: Any other host → Encryption enabled, strict certificates

## Troubleshooting

**Connection Issues:**
1. Verify SQL Server is running
2. Check port 1433 is open
3. Verify SA password is correct
4. Try connecting with SQL Server Management Studio

**Authentication Issues:**
1. Ensure "Mixed Mode" authentication is enabled
2. Verify SA account is enabled
3. Check Windows Firewall settings 