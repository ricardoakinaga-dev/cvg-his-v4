import type { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildServer } from '../../server.js';
import { signJwt } from '../auth/service.js';

vi.mock('@cvg-his/db', () => ({
  db: {
    $client: {
      query: vi.fn()
    }
  },
  closeDbConnection: vi.fn(async () => undefined)
}));

describe('Patient Context Routes', () => {
  let app: FastifyInstance;

  const env = {
    DATABASE_URL: 'postgres://localhost:5432/cvg_his_test',
    REDIS_URL: 'redis://localhost:6379',
    JWT_SECRET: 'test-secret-minimum-32-chars-ok!',
    JWT_ISSUER: 'cvg-his-test',
    JWT_AUDIENCE: 'cvg-his-api-test'
  };

  function makeAuthHeaders() {
    const token = signJwt(
      {
        accountId: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000001',
        role: 'vet',
        roles: ['vet'],
        permissions: ['medical_record.read', 'patient.read', 'inpatient.read']
      },
      {
        jwtSecret: env.JWT_SECRET,
        jwtIssuer: env.JWT_ISSUER,
        jwtAudience: env.JWT_AUDIENCE
      }
    );

    return {
      authorization: `Bearer ${token}`
    };
  }

  function makeAdministrativeOnlyHeaders() {
    const token = signJwt(
      {
        accountId: '00000000-0000-0000-0000-000000000001',
        userId: '00000000-0000-0000-0000-000000000001',
        role: 'recepcao',
        roles: ['recepcao'],
        permissions: ['patient.read']
      },
      {
        jwtSecret: env.JWT_SECRET,
        jwtIssuer: env.JWT_ISSUER,
        jwtAudience: env.JWT_AUDIENCE
      }
    );

    return {
      authorization: `Bearer ${token}`
    };
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.DATABASE_URL = env.DATABASE_URL;
    process.env.REDIS_URL = env.REDIS_URL;
    process.env.JWT_SECRET = env.JWT_SECRET;
    process.env.JWT_ISSUER = env.JWT_ISSUER;
    process.env.JWT_AUDIENCE = env.JWT_AUDIENCE;
    app = await buildServer();
  });

  describe('GET /patient-context/by-patient/:patientId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-patient/00000000-0000-0000-0000-000000000001'
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent patient', async () => {
      const { db } = await import('@cvg-his/db');

      (db.$client.query as ReturnType<typeof vi.fn>).mockResolvedValue({
        rows: []
      });

      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-patient/00000000-0000-0000-0000-000000000001',
        headers: makeAuthHeaders()
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 when actor lacks medical_record.read', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-patient/00000000-0000-0000-0000-000000000001',
        headers: makeAdministrativeOnlyHeaders()
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('GET /patient-context/by-stay/:stayId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-stay/00000000-0000-0000-0000-000000000001'
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
