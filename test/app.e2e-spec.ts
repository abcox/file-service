/**
 * Stage 2: Integration Tests
 *
 * These tests spin up the full NestJS application with real database connections.
 * Requires:
 *   - Local SQL Server or Azure SQL access
 *   - CosmosDB Emulator or Azure CosmosDB access
 *   - Azurite for blob storage (optional)
 *
 * Usage:
 *   npm run test:integration
 *
 * Environment setup:
 *   - Start CosmosDB Emulator: Azure Cosmos DB Emulator
 *   - Start Azurite: npm run azurite (if needed)
 *   - Ensure config.json has correct local connection strings
 */

/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/module/app/app.module';
import { configureApp } from '../src/config/app-bootstrap';

describe('Stage 2: Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app); // Use shared configuration
    await app.init();
  }, 120000); // 2 minute timeout for DB connections

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('AppController', () => {
    it('/ (GET) - root endpoint', () => {
      return request(app.getHttpServer()).get('/').expect(200);
    });

    it('/health (GET) - health check', () => {
      return request(app.getHttpServer()).get('/health').expect(200);
    });
  });

  describe('File Operations', () => {
    it('/api/file/list (GET) - list files', async () => {
      const response = await request(app.getHttpServer()).get('/api/file/list');

      // May require auth
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  // Add more integration tests here that test actual DB operations
  // Example: Create file, retrieve file, delete file
});
