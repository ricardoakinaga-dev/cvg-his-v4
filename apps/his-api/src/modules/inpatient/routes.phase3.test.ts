import Fastify, { type FastifyRequest } from 'fastify';
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerErrorHandler } from '../../lib/errors.js';
import { inpatientRoutes } from './routes.js';

const mockedService = vi.hoisted(() => ({
  admit: vi.fn(),
  transfer: vi.fn(),
  discharge: vi.fn(),
  getById: vi.fn(),
  list: vi.fn()
}));

const createInpatientServiceMock = vi.hoisted(() => vi.fn(() => mockedService));

vi.mock('./service.js', () => ({
  createInpatientService: createInpatientServiceMock
}));

describe('Inpatient Routes - Phase 3 Smoke Tests', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    app.decorate('db', { $client: { query: vi.fn() } } as unknown as typeof import('@cvg-his/db').db);
    app.decorate('env', {
      NODE_ENV: 'test',
      PORT: 3000,
      DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cvg_his',
      REDIS_URL: 'redis://localhost:6379',
      QUEUE_PREFIX: 'cvg-his',
      LOG_LEVEL: 'silent',
      JWT_SECRET: 'test-secret-minimum-32-chars-ok!',
      JWT_ISSUER: 'cvg-his-test',
      JWT_AUDIENCE: 'cvg-his-api-test',
      DEFAULT_TIMEZONE: 'UTC',
      MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: 'UTC',
      MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: '{}',
      MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: '{}',
      QDRANT_URL: undefined,
      QDRANT_COLLECTION: 'professor',
      QDRANT_API_KEY: undefined
    });
    app.addHook('onRequest', async (request: FastifyRequest) => {
      request.requestContext = {
        requestId: request.id,
        actor: {
          accountId: 'test-account-id',
          userId: 'test-user-id',
          role: 'admin',
          roles: ['admin'],
          permissions: ['inpatient.read', 'inpatient.write', 'inpatient.discharge']
        }
      };
    });
    registerErrorHandler(app);
    await app.register(inpatientRoutes, { prefix: '/inpatient' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.getById.mockResolvedValue(null);
    mockedService.list.mockResolvedValue({ data: [], page: 1, pageSize: 20, total: 0 });
    mockedService.admit.mockResolvedValue({ kind: 'admitted', stay: { id: 'stay-1' } });
    mockedService.transfer.mockResolvedValue({ kind: 'transferred', stay: { id: 'stay-1' } });
    mockedService.discharge.mockResolvedValue({ kind: 'discharged', stay: { id: 'stay-1' } });
  });

  describe('GET /inpatient/stays', () => {
    it('should return 200 with auth context', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/inpatient/stays?status=active&page=1&pageSize=10'
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('GET /inpatient/stays/:id', () => {
    it('should validate UUID parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/inpatient/stays/invalid-uuid'
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid UUID parameter', async () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const response = await app.inject({
        method: 'GET',
        url: `/inpatient/stays/${validUUID}`
      });

      expect([200, 404]).toContain(response.statusCode);
    });
  });

  describe('POST /inpatient/admit', () => {
    it('should require request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/inpatient/admit'
      });

      expect([400, 422]).toContain(response.statusCode);
    });
  });

  describe('POST /inpatient/stays/:id/transfer', () => {
    it('should validate UUID parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/inpatient/stays/invalid-uuid/transfer',
        payload: {
          toWardId: '550e8400-e29b-41d4-a716-446655440001',
          toBedId: '550e8400-e29b-41d4-a716-446655440002'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /inpatient/stays/:id/discharge', () => {
    it('should validate UUID parameter', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/inpatient/stays/invalid-uuid/discharge',
        payload: {
          reason: 'Test discharge'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
