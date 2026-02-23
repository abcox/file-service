/**
 * Integration Test Setup
 *
 * This file runs before integration tests to:
 * - Set environment variables
 * - Check required services are running
 * - Configure test timeouts
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Increase Jest timeout for DB operations
jest.setTimeout(30000);

// Optional: Check if required services are available
beforeAll(() => {
  console.log('🧪 Starting Stage 2 Integration Tests');
  console.log('   Environment:', process.env.NODE_ENV);
  console.log('   Config will be loaded from: src/config/');

  // TODO: Add checks for:
  // - CosmosDB Emulator availability
  // - SQL Server connectivity
  // - Azurite availability
});

afterAll(() => {
  console.log('🧪 Stage 2 Integration Tests Complete');
});
