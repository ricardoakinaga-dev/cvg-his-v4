import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { registerErrorHandler } from '../../lib/errors.js';
import { encounterBillingRoutes } from './routes.js';

const mockedService = vi.hoisted(() => ({
  create: vi.fn(),
  list: vi.fn(),
  getSummary: vi.fn(),
  update: vi.fn(),
  remove: vi.fn()
}));

const createEncounterBillingServiceMock = vi.hoisted(() => vi.fn(() => mockedService));

vi.mock('./service.js', () => ({
  createEncounterBillingService: createEncounterBillingServiceMock
}));

function makeItem() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440030',
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    encounterId: '550e8400-e29b-41d4-a716-446655440100',
    itemType: 'service',
    catalogItemId: '550e8400-e29b-41d4-a716-446655440010',
    nameSnapshot: 'Consulta clínica',
    codeSnapshot: 'CONSULTA',
    unitPrice: 120,
    quantity: 1,
    discountAmount: 0,
    lineTotal: 120,
    notes: null,
    createdByUserId: '550e8400-e29b-41d4-a716-446655440001',
    updatedByUserId: '550e8400-e29b-41d4-a716-446655440001',
    createdAt: '2026-03-17T00:00:00.000Z',
    updatedAt: '2026-03-17T00:00:00.000Z'
  };
}

function makeSummary() {
  return {
    encounterId: '550e8400-e29b-41d4-a716-446655440100',
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    encounterStatus: 'open',
    totals: {
      itemCount: 2,
      serviceItemCount: 1,
      productItemCount: 1,
      subtotal: 170,
      discountTotal: 20,
      total: 150
    },
    items: [makeItem(), { ...makeItem(), id: '550e8400-e29b-41d4-a716-446655440031', itemType: 'product', unitPrice: 50, discountAmount: 20, lineTotal: 30 }]
  };
}

async function buildTestApp(actor: RequestContext['actor']): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorate('db', {} as typeof import('@cvg-his/db').db);
  app.decorate('env', {
    NODE_ENV: 'test', PORT: 3000, DATABASE_URL: 'postgres://test', REDIS_URL: 'redis://test', QUEUE_PREFIX: 'cvg-his', LOG_LEVEL: 'silent', JWT_SECRET: 'test-secret-minimum-32-chars-ok!', JWT_ISSUER: 'cvg-his-test', JWT_AUDIENCE: 'cvg-his-api-test', DEFAULT_TIMEZONE: 'UTC', MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: 'UTC', MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: '{}', MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: '{}', QDRANT_URL: undefined, QDRANT_COLLECTION: 'professor', QDRANT_API_KEY: undefined
  });
  app.addHook('onRequest', async (request) => {
    request.requestContext = { requestId: request.id, actor };
  });
  registerErrorHandler(app);
  await app.register(encounterBillingRoutes);
  await app.ready();
  createEncounterBillingServiceMock.mockReturnValue(mockedService);
  return app;
}

describe('encounterBilling routes', () => {
  const adminActor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    role: 'admin',
    roles: ['admin'],
    permissions: ['billing_item.read', 'billing_item.write']
  };
  const readOnlyActor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440002',
    role: 'vet',
    roles: ['vet'],
    permissions: ['billing_item.read']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.create.mockResolvedValue({ kind: 'created', item: makeItem() });
    mockedService.list.mockResolvedValue({ data: [makeItem()], page: 1, pageSize: 20, total: 1 });
    mockedService.getSummary.mockResolvedValue(makeSummary());
    mockedService.update.mockResolvedValue({ kind: 'updated', item: makeItem() });
    mockedService.remove.mockResolvedValue({ kind: 'removed', item: makeItem() });
  });

  it('returns 401 without actor', async () => {
    const app = await buildTestApp(undefined);
    const response = await app.inject({ method: 'GET', url: '/encounter-billing-items' });
    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('returns 403 on create without write permission', async () => {
    const app = await buildTestApp(readOnlyActor);
    const response = await app.inject({ method: 'POST', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/billing-items', payload: { itemType: 'service', catalogItemId: null, nameSnapshot: 'Consulta clínica', codeSnapshot: 'CONSULTA', unitPrice: 120, quantity: 1, discountAmount: 0, notes: null } });
    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it('creates billing item and returns 201', async () => {
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'POST', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/billing-items', payload: { itemType: 'service', catalogItemId: null, nameSnapshot: 'Consulta clínica', codeSnapshot: 'CONSULTA', unitPrice: 120, quantity: 1, discountAmount: 0, notes: null } });
    expect(response.statusCode).toBe(201);
    await app.close();
  });

  it('returns 409 when trying to create billing item for closed encounter', async () => {
    mockedService.create.mockResolvedValueOnce({ kind: 'encounter_closed' });
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'POST', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/billing-items', payload: { itemType: 'service', catalogItemId: null, nameSnapshot: 'Consulta clínica', codeSnapshot: 'CONSULTA', unitPrice: 120, quantity: 1, discountAmount: 0, notes: null } });
    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it('lists billing items and returns 200', async () => {
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'GET', url: '/encounter-billing-items?encounterId=550e8400-e29b-41d4-a716-446655440100&page=1&pageSize=20&itemType=service' });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('returns consolidated billing summary and returns 200', async () => {
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'GET', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/billing-summary' });
    expect(response.statusCode).toBe(200);
    expect(response.json().totals.total).toBe(150);
    await app.close();
  });

  it('returns 404 when summary encounter is missing', async () => {
    mockedService.getSummary.mockResolvedValueOnce(null);
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'GET', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/billing-summary' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('returns 404 when updating missing billing item', async () => {
    mockedService.update.mockResolvedValueOnce({ kind: 'billing_item_not_found' });
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'PATCH', url: '/encounter-billing-items/550e8400-e29b-41d4-a716-446655440030', payload: { quantity: 2 } });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('returns 409 when updating billing item after encounter close', async () => {
    mockedService.update.mockResolvedValueOnce({ kind: 'encounter_closed' });
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'PATCH', url: '/encounter-billing-items/550e8400-e29b-41d4-a716-446655440030', payload: { quantity: 2 } });
    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it('updates billing item and returns 200', async () => {
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'PATCH', url: '/encounter-billing-items/550e8400-e29b-41d4-a716-446655440030', payload: { quantity: 2 } });
    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it('returns 404 when removing missing billing item', async () => {
    mockedService.remove.mockResolvedValueOnce({ kind: 'billing_item_not_found' });
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'DELETE', url: '/encounter-billing-items/550e8400-e29b-41d4-a716-446655440030' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });

  it('returns 409 when removing billing item after encounter close', async () => {
    mockedService.remove.mockResolvedValueOnce({ kind: 'encounter_closed' });
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'DELETE', url: '/encounter-billing-items/550e8400-e29b-41d4-a716-446655440030' });
    expect(response.statusCode).toBe(409);
    await app.close();
  });

  it('removes billing item and returns 204', async () => {
    const app = await buildTestApp(adminActor);
    const response = await app.inject({ method: 'DELETE', url: '/encounter-billing-items/550e8400-e29b-41d4-a716-446655440030' });
    expect(response.statusCode).toBe(204);
    await app.close();
  });
});
