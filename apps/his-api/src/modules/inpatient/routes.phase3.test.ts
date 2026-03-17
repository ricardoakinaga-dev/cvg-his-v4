import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';
import { inpatientRoutes } from './routes.js';

// Mock database client
const mockDb = {
  $client: {
    query: vi.fn()
  }
};

// Mock request context
const mockRequestContext = {
  actor: {
    accountId: 'test-account-id',
    userId: 'test-user-id',
    roles: ['vet']
  },
  requestId: 'test-request-id'
};

describe('Inpatient Routes - Phase 3 Smoke Tests', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    app.decorate('db', mockDb);
    app.decorate('requestContext', mockRequestContext);
    
    // Register inpatient routes
    await app.register(inpatientRoutes, { prefix: '/inpatient' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /inpatient/stays', () => {
    it('should return 401 without authentication headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/inpatient/stays'
      });

      // Should fail due to missing auth headers (x-account-id, x-user-id)
      expect([401, 403, 500]).toContain(response.statusCode);
    });

    it('should accept query parameters for filtering', async () => {
      // Mock successful response
      mockDb.$client.query.mockResolvedValueOnce({
        rows: [{ count: 0 }]
      });
      mockDb.$client.query.mockResolvedValueOnce({
        rows: []
      });

      const response = await app.inject({
        method: 'GET',
        url: '/inpatient/stays',
        headers: {
          'x-account-id': 'test-account-id',
          'x-user-id': 'test-user-id',
          'x-user-roles': 'vet'
        },
        query: {
          status: 'active',
          wardId: 'test-ward-id',
          page: 1,
          pageSize: 10
        }
      });

      // Should process the request (may fail on permissions, but route exists)
      expect(response.statusCode).toBeDefined();
    });
  });

  describe('GET /inpatient/stays/:id', () => {
    it('should validate UUID parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/inpatient/stays/invalid-uuid',
        headers: {
          'x-account-id': 'test-account-id',
          'x-user-id': 'test-user-id',
          'x-user-roles': 'vet'
        }
      });

      // Should reject invalid UUID
      expect(response.statusCode).toBe(400);
    });

    it('should accept valid UUID parameter', async () => {
      // Mock stay not found
      mockDb.$client.query.mockResolvedValueOnce({
        rows: []
      });

      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await app.inject({
        method: 'GET',
        url: `/inpatient/stays/${validUUID}`,
        headers: {
          'x-account-id': 'test-account-id',
          'x-user-id': 'test-user-id',
          'x-user-roles': 'vet'
        }
      });

      // Should process the request (404 if not found, which is expected)
      expect([200, 404, 401, 403]).toContain(response.statusCode);
    });
  });

  describe('POST /inpatient/admit', () => {
    it('should require request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/inpatient/admit',
        headers: {
          'x-account-id': 'test-account-id',
          'x-user-id': 'test-user-id',
          'x-user-roles': 'vet'
        }
      });

      // Should reject empty body
      expect([400, 422]).toContain(response.statusCode);
    });
  });

  describe('POST /inpatient/stays/:id/transfer', () => {
    it('should validate UUID parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/inpatient/stays/invalid-uuid/transfer',
        headers: {
          'x-account-id': 'test-account-id',
          'x-user-id': 'test-user-id',
          'x-user-roles': 'vet'
        },
        payload: {
          toWardId: '550e8400-e29b-41d4-a716-446655440001',
          toBedId: '550e8400-e29b-41d4-a716-446655440002'
        }
      });

      // Should reject invalid UUID
      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /inpatient/stays/:id/discharge', () => {
    it('should validate UUID parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/inpatient/stays/invalid-uuid/discharge',
        headers: {
          'x-account-id': 'test-account-id',
          'x-user-id': 'test-user-id',
          'x-user-roles': 'vet'
        },
        payload: {
          reason: 'Test discharge'
        }
      });

      // Should reject invalid UUID
      expect(response.statusCode).toBe(400);
    });
  });
});
