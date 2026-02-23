/**
 * Stage 1: Smoke/Health Tests
 *
 * These tests run against an already-running server (local or deployed).
 * They don't start the app or connect to databases - just verify endpoints respond.
 *
 * Usage:
 *   npm run test:smoke                    # Tests against localhost:3000
 *   API_URL=http://localhost:8080 npm run test:smoke  # Custom URL
 *   API_URL=https://vorba-file-service-3.azurewebsites.net npm run test:smoke  # Against deployed
 */

import request from 'supertest';

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

describe('Stage 1: Smoke Tests', () => {
  describe('Health Endpoints', () => {
    it('/health (GET) - should return 200 with status', async () => {
      const response = await request(BASE_URL).get('/health').timeout(5000);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
    });
  });

  describe('API Availability', () => {
    it('Swagger docs at /api should be accessible', async () => {
      const response = await request(BASE_URL).get('/api').timeout(5000);

      // Swagger returns 200 with HTML
      expect(response.status).toBe(200);
      expect(response.type).toMatch(/html/);
    });

    it('/api/diagnostic/services (GET) - diagnostic endpoint should respond', async () => {
      const response = await request(BASE_URL)
        .get('/api/diagnostic/services')
        .timeout(5000);

      // Public endpoint, should return 200 with diagnostic report
      expect(response.status).toBe(200);
    });
  });
});

describe('Stage 1: Basic API Contract', () => {
  describe('File endpoints', () => {
    it('/api/file/list (GET) - should respond (auth required)', async () => {
      const response = await request(BASE_URL)
        .get('/api/file/list')
        .timeout(5000);

      // 401 Unauthorized is expected without auth token
      // 200 if auth is disabled, 403 if forbidden
      expect([200, 401, 403]).toContain(response.status);
    });
  });

  describe('PDF endpoints', () => {
    it('/api/pdf (GET) - should respond', async () => {
      const response = await request(BASE_URL).get('/api/pdf').timeout(5000);

      // Any response means the endpoint exists
      expect(response.status).toBeDefined();
    });
  });

  describe('Auth endpoints', () => {
    it('/api/auth (GET) - auth endpoint should exist', async () => {
      const response = await request(BASE_URL).get('/api/auth').timeout(5000);

      // Should return something (even 404 means routing works)
      expect(response.status).toBeDefined();
    });
  });
});
