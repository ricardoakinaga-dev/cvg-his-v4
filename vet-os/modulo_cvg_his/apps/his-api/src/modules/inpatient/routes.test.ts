import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
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

type MockedService = typeof mockedService;

const actorContext: RequestContext = {
  requestId: 'req-1',
  actor: {
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef7',
    role: 'admin',
    roles: ['admin'],
    permissions: ['inpatient.write', 'inpatient.read', 'inpatient.discharge']
  }
};

function makeStay() {
  return {
    id: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
    ownerId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4',
    encounterId: null,
    wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
    bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
    status: 'active',
    admittedAt: '2026-02-17T00:00:00.000Z',
    dischargedAt: null,
    admittedByUserId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef7',
    dischargedByUserId: null,
    chiefComplaint: 'Dor',
    reason: 'Observacao',
    planSummary: 'Plano inicial',
    createdAt: '2026-02-17T00:00:00.000Z',
    updatedAt: '2026-02-17T00:00:00.000Z'
  };
}

async function buildTestApp(service: MockedService): Promise<FastifyInstance> {
  const app = Fastify();

  app.decorate('db', {} as typeof import('@cvg-his/db').db);
  app.decorate('env', {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgres://test',
    REDIS_URL: 'redis://test',
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

  app.addHook('onRequest', async (request) => {
    request.requestContext = {
      ...actorContext,
      requestId: request.id
    };
  });

  registerErrorHandler(app);
  await app.register(inpatientRoutes);
  await app.ready();

  createInpatientServiceMock.mockReturnValue(service);
  return app;
}

describe('inpatient routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.admit.mockResolvedValue({
      kind: 'admitted',
      stay: makeStay()
    });
    mockedService.transfer.mockResolvedValue({
      kind: 'transferred',
      stay: makeStay()
    });
    mockedService.discharge.mockResolvedValue({
      kind: 'discharged',
      stay: makeStay()
    });
    mockedService.getById.mockResolvedValue(makeStay());
    mockedService.list.mockResolvedValue({
      data: [makeStay()],
      page: 1,
      pageSize: 20,
      total: 1
    });
  });

  it('admitir em bed livre retorna 200', async () => {
    const app = await buildTestApp(mockedService);

    const response = await app.inject({
      method: 'POST',
      url: '/admit',
      payload: {
        patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
        wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
        bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
        reason: 'Internacao'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.admit).toHaveBeenCalledTimes(1);
    await app.close();
  });

  it('admitir de novo no mesmo bed retorna 409', async () => {
    mockedService.admit.mockResolvedValue({
      kind: 'bed_occupied'
    });
    const app = await buildTestApp(mockedService);

    const response = await app.inject({
      method: 'POST',
      url: '/admit',
      payload: {
        patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
        wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
        bedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef6',
        reason: 'Internacao'
      }
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it('transferir para bed ocupado retorna 409', async () => {
    mockedService.transfer.mockResolvedValue({
      kind: 'bed_occupied'
    });
    const app = await buildTestApp(mockedService);

    const response = await app.inject({
      method: 'POST',
      url: '/stays/fdd8c156-b52d-4117-a5e1-73dd61474ef1/transfer',
      payload: {
        toWardId: 'fdd8c156-b52d-4117-a5e1-73dd61474efa',
        toBedId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef9',
        reason: 'Transferencia'
      }
    });

    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it('alta sem reason retorna 422', async () => {
    const app = await buildTestApp(mockedService);

    const response = await app.inject({
      method: 'POST',
      url: '/stays/fdd8c156-b52d-4117-a5e1-73dd61474ef1/discharge',
      payload: {
        reason: '   '
      }
    });

    expect(response.statusCode).toBe(422);
    expect(mockedService.discharge).not.toHaveBeenCalled();
    await app.close();
  });
});
