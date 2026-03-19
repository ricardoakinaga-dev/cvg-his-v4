import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { registerErrorHandler } from '../../lib/errors.js';
import { productsRoutes } from './routes.js';

const mockedService = vi.hoisted(() => ({
  create: vi.fn(),
  getById: vi.fn(),
  list: vi.fn(),
  update: vi.fn()
}));

const createProductsServiceMock = vi.hoisted(() => vi.fn(() => mockedService));

vi.mock('./service.js', () => ({
  createProductsService: createProductsServiceMock
}));

function makeProduct() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440020',
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Dipirona 500mg',
    code: 'DIP500',
    description: 'Analgésico',
    basePrice: 35,
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
      requestId: request.id,
      actor
    };
  });

  registerErrorHandler(app);
  await app.register(productsRoutes);
  await app.ready();

  createProductsServiceMock.mockReturnValue(mockedService);
  return app;
}

describe('products routes', () => {
  const adminActor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    role: 'admin',
    roles: ['admin'],
    permissions: ['product.read', 'product.write']
  };

  const readOnlyActor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    role: 'vet',
    roles: ['vet'],
    permissions: ['product.read']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.create.mockResolvedValue(makeProduct());
    mockedService.getById.mockResolvedValue(makeProduct());
    mockedService.list.mockResolvedValue({
      data: [makeProduct()],
      page: 1,
      pageSize: 20,
      total: 1
    });
    mockedService.update.mockResolvedValue(makeProduct());
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

  it('retorna 403 ao tentar criar sem product.write', async () => {
    const app = await buildTestApp(readOnlyActor);

    const response = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        name: 'Dipirona 500mg',
        code: 'DIP500',
        description: 'Analgésico',
        basePrice: 35
      }
    });

    expect(response.statusCode).toBe(403);
    expect(mockedService.create).not.toHaveBeenCalled();
    await app.close();
  });

  it('cria produto e retorna 201', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'POST',
      url: '/',
      payload: {
        name: 'Dipirona 500mg',
        code: 'DIP500',
        description: 'Analgésico',
        basePrice: 35
      }
    });

    expect(response.statusCode).toBe(201);
    expect(mockedService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Dipirona 500mg', code: 'DIP500' })
    );
    await app.close();
  });

  it('lista produtos e retorna 200', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'GET',
      url: '/?q=dip&page=1&pageSize=20&active=true'
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: 'dip', page: 1, pageSize: 20, active: true })
    );
    await app.close();
  });

  it('retorna 404 ao buscar produto inexistente', async () => {
    mockedService.getById.mockResolvedValueOnce(null);
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'GET',
      url: '/550e8400-e29b-41d4-a716-446655440099'
    });

    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('retorna 200 ao buscar produto existente', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'GET',
      url: '/550e8400-e29b-41d4-a716-446655440020'
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.getById).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440020');
    await app.close();
  });

  it('retorna 403 ao atualizar sem product.write', async () => {
    const app = await buildTestApp(readOnlyActor);

    const response = await app.inject({
      method: 'PATCH',
      url: '/550e8400-e29b-41d4-a716-446655440020',
      payload: {
        name: 'Dipirona 1g'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(mockedService.update).not.toHaveBeenCalled();
    await app.close();
  });

  it('atualiza produto e retorna 200', async () => {
    const app = await buildTestApp(adminActor);

    const response = await app.inject({
      method: 'PATCH',
      url: '/550e8400-e29b-41d4-a716-446655440020',
      payload: {
        name: 'Dipirona 1g'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(mockedService.update).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440020', {
      name: 'Dipirona 1g'
    });
    await app.close();
  });
});
