import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildServer } from '../../server.js';
import type { FastifyInstance } from 'fastify';

// Mock the database
vi.mock('@cvg-his/db', () => ({
  db: {
    $client: {
      query: vi.fn(),
    },
  },
}));

describe('Patient Context Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildServer();
  });

  describe('GET /patient-context/by-patient/:patientId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-patient/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 404 for non-existent patient', async () => {
      const { db } = await import('@cvg-his/db');
      
      // Mock empty result
      (db.$client.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        rows: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-patient/00000000-0000-0000-0000-000000000001',
        headers: {
          'x-account-id': '00000000-0000-0000-0000-000000000001',
          'x-role': 'vet',
          'x-user-id': '00000000-0000-0000-0000-000000000001',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /patient-context/by-stay/:stayId', () => {
    it('should return 401 without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/patient-context/by-stay/00000000-0000-0000-0000-000000000001',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
