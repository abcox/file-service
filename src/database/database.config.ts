import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AppConfig } from '../service/config/config.interface';

export interface DatabaseConfig {
  type?: 'azure-sql' | 'local-sql-express';
  host?: string;
  port?: number;
  name?: string;
  username?: string;
  password?: string;
  connectionString?: string;
  portalUrl?: string;
  description?: string;
}

export const getDatabaseConfig = (config: AppConfig): TypeOrmModuleOptions => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Get the appropriate database configuration
  let dbConfig: DatabaseConfig = {};
  let isLocalDatabase = false;

  console.log('Database config type:', config.azure?.database?.type);
  console.log(
    'Database config:',
    JSON.stringify(config.azure?.database, null, 2),
  );

  if (
    config.azure?.database?.type === 'azure-sql' &&
    config.azure.database['azure-sql']
  ) {
    dbConfig = config.azure.database['azure-sql'];
    isLocalDatabase = false;
  } else if (
    config.azure?.database?.type === 'local-sql-express' &&
    config.azure.database['local-sql-express']
  ) {
    dbConfig = config.azure.database['local-sql-express'];
    isLocalDatabase = true;
  } else {
    throw new Error(
      `Database config undefined: ${config.azure?.database?.type}`,
    );
  }

  console.log('Selected dbConfig:', JSON.stringify(dbConfig, null, 2));
  console.log('Is local database:', isLocalDatabase);

  // Parse connection string to extract individual parameters
  if (dbConfig.connectionString) {
    console.log('Parsing connection string for individual parameters');

    // Extract server from connection string
    const serverMatch = dbConfig.connectionString.match(/Server=tcp:([^,]+)/);
    const databaseMatch = dbConfig.connectionString.match(
      /Initial Catalog=([^;]+)/,
    );
    const userMatch = dbConfig.connectionString.match(/User ID=([^;]+)/);
    const passwordMatch = dbConfig.connectionString.match(/Password=([^;]+)/);

    if (serverMatch && databaseMatch && userMatch && passwordMatch) {
      const host = serverMatch[1];
      const database = databaseMatch[1];
      const username = userMatch[1];
      const password = passwordMatch[1];

      console.log('Parsed connection parameters:');
      console.log('Host:', host);
      console.log('Database:', database);
      console.log('Username:', username);

      return {
        type: 'mssql',
        host: host,
        port: 1433,
        username: username,
        password: password,
        database: database,
        entities: [__dirname + '/entities/*.entity{.ts,.js}'],
        synchronize: isDevelopment,
        logging: isDevelopment,
        extra: {
          connectionTimeout: 30000,
          requestTimeout: 30000,
          options: {
            encrypt: !isLocalDatabase,
            trustServerCertificate: isLocalDatabase,
          },
        },
      };
    } else {
      throw new Error('Failed to parse connection string parameters');
    }
  }

  // Otherwise use individual parameters
  console.log('Using individual parameters for database connection');
  console.log('Host:', dbConfig.host || 'localhost');
  console.log('Port:', dbConfig.port || 1433);
  console.log('Database:', dbConfig.name || 'file-service-db');
  console.log('Username:', dbConfig.username);

  return {
    type: 'mssql',
    host: dbConfig.host || 'localhost',
    port: dbConfig.port || 1433,
    username: dbConfig.username,
    password: dbConfig.password,
    database: dbConfig.name || 'file-service-db',
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    synchronize: isDevelopment, // Auto-create tables in dev
    logging: isDevelopment,
    options: {
      encrypt: !isLocalDatabase, // Only encrypt for Azure, not local
      trustServerCertificate: isLocalDatabase, // Trust local certificates
    },
  };
};
