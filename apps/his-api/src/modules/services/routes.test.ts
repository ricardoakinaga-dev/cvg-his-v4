import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { registerErrorHandler } from '../../lib/errors.js';
import { servicesRoutes } from './routes.js';

const mockedService = vi.hoisted(() => ({
  create: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  update: vi.fn()
}));

const createServicesServiceMock = vi.hoisted(() => vi.fn(() => mockedService));

vi.mock('./service.js', () => ({
  createServicesService: createServicesServiceMock
}));

function makeService() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440010',
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Consulta clínica',
    code: 'CONSULTA',
    description: 'Consulta básica',
    basePrice: 120,
    active: true,
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z'
  };
}

async function buildTestApp(actor: RequestContext['actor']): Promise<FastifyInstance> {
  const app = Fastify();

  app.decorate('db', {} as typeof import('@cvg-his/db').db);
  app.decorate('env', {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgres://test',
    REDIS_URL: 'redis://test',
    QUEUE_PREFIX: 'cvg-his',
    LOG_LEVEL: 'silent',
    QDRANT_URL: undefined,
    QDRANT_COLLECTION: 'professor',
    QDRANT_API_KEY: undefined
  });

  app.addHook('onRequest', async (request) => {
    request.requestContext = {
      requestId: request.id,
      actor
    };
  });

  registerErrorHandler(app);
  await app.register(servicesRoutes);
  await app.ready();

  createServicesServiceMock.mockReturnValue(mockedService);
  return app;
}

describe('services routes', () => {
  const adminActor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    role: 'admin',
    roles: ['admin'],
    permissions: ['service.read', 'service.write']
  };

  const readOnlyActor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    role: 'vet',
    roles: ['vet'],
    permissions: ['service.read']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.create.mockResolvedValue(makeService());
    mockedService.getById.mockResolvedValue(makeService());
    mockedService.list.mockResolvedValue({
      data: [makeService()],
      page: 1,
      pageSize: 20,
      total: 1
    });
    mockedService.update.mockResolvedValue(makeService());
  });

  it('retorna 401 sem actor válido', async () => {
    const app = await buildTestApp(undefined);

    const response = await app.inject({
      method: 'GET',
      url: '/'
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('retorna 403 ao tentar criar sem service.write', async () => {
    const app = await buildTestApp(readOnlyActor);

    const response = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        name: 'Consulta clínica',
        code: 'CONSULTA',
        description: 'Consulta básica',
        basePrice: 120
      }
    });

    expect(response.statusCode).toBe(403);
    expect(mockedService.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('cria serviço e retorna 201', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        name: 'Consulta clínica',
        code: 'CONSULTA',
        description: 'Consulta básica',
        basePrice: 120
      }
    });

    expect(response.statusCode).toBe(201);
    expect(mockedService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Consulta clínica', code: 'CONSULTA' })
    );
    await app.close();
  });

  it('lista serviços e retorna 200', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'GET',
      url: '/?q=cons&page=1&pageSize=20&active=true'
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'cons', page: 1, pageSize: 20, active: true })
    );
    await app.close();
  });

  it('retorna 404 ao buscar serviço inexistente', async () => {
    mockedService.getById.mockResolvedValueOnce(null);
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'GET',
      url: '/550e8400-e29b-41d4-a716-446655440099'
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('retorna 200 ao buscar serviço existente', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'GET',
      url: '/550e8400-e29b-41d4-a716-446655440010'
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.getById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440010');
    await app.close();
  });

  it('retorna 403 ao atualizar sem service.write', async () => {
    const app = await buildTestApp(readOnlyActor);

    const response = await app.inject({
      method: 'PATCH',
      url: '/550e8400-e29b-41d4-a716-446655440010',
      payload: {
        name: 'Consulta retorno'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(mockedService.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('atualiza serviço e retorna 200', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'PATCH',
      url: '/550e8400-e29b-41d4-a716-446655440010',
      payload: {
        name: 'Consulta retorno'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.update).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440010', {
      name: 'Consulta retorno'
    });
    await app.close();
  });
});
