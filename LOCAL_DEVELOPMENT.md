# Local Development Setup

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