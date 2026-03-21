import Fastify, { type FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { registerErrorHandler } from '../../lib/errors.js';
import { encounterFinancialRoutes } from './routes.js';

const mockedService = vi.hoisted(() => ({
  getSummary: vi.fn(),
  close: vi.fn(),
  listReceivables: vi.fn(),
  settleReceivable: vi.fn()
}));

const createEncounterFinancialServiceMock = vi.hoisted(() => vi.fn(() => mockedService));

const mockAppendSensitiveReadAudit = vi.hoisted(() => vi.fn(async () => {}));

vi.mock('./service.js', () => ({
  createEncounterFinancialService: createEncounterFinancialServiceMock
}));

vi.mock('../iam/auditSensitiveAccess.js', () => ({
  appendSensitiveReadAudit: mockAppendSensitiveReadAudit
}));

function makePayment() {
  return {
    id: '550e8400-e29b-41d4-a716-446655440500',
    receivableId: '550e8400-e29b-41d4-a716-446655440210',
    financialAccountId: '550e8400-e29b-41d4-a716-446655440211',
    encounterId: '550e8400-e29b-41d4-a716-446655440100',
    amountPaid: 30,
    paidAt: '2026-03-17T12:00:00.000Z',
    paidByUserId: '550e8400-e29b-41d4-a716-446655440001',
    notes: 'Entrada recebida'
  };
}

function makeReceivable(overrides: Record<string, unknown> = {}) {
  return {
    id: '550e8400-e29b-41d4-a716-446655440210',
    encounterId: '550e8400-e29b-41d4-a716-446655440100',
    financialAccountId: '550e8400-e29b-41d4-a716-446655440211',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/2',
    dueAt: '2026-03-20T12:00:00.000Z',
    status: 'open',
    amountOriginal: 100,
    amountPaid: 30,
    amountOutstanding: 70,
    issuedAt: '2026-03-17T12:00:00.000Z',
    settledAt: null,
    notes: 'Entrada recebida',
    payments: [makePayment()],
    ...overrides
  };
}

function makeSummary() {
  const receivable = makeReceivable();
  return {
    encounterId: '550e8400-e29b-41d4-a716-446655440100',
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    encounterStatus: 'open',
    financialStatus: 'partial',
    financialClosed: true,
    subtotal: 150,
    discountTotal: 20,
    total: 130,
    paidAmount: 30,
    balanceDue: 100,
    closedAt: '2026-03-17T12:00:00.000Z',
    closedByUserId: '550e8400-e29b-41d4-a716-446655440001',
    notes: 'Entrada recebida',
    receivable,
    receivables: [receivable, makeReceivable({ id: '550e8400-e29b-41d4-a716-446655440212', installmentNumber: 2, installmentLabel: 'Parcela 2/2', amountOriginal: 30, amountOutstanding: 30, payments: [] })],
    payments: [makePayment()]
  };
}

function makeReceivablesResponse() {
  return {
    data: [{
      ...makeReceivable(),
      encounterStatus: 'open',
      patientId: '550e8400-e29b-41d4-a716-446655440300',
      patientName: 'Luna',
      patientSpecies: 'canine',
      ownerId: '550e8400-e29b-41d4-a716-446655440301',
      ownerName: 'Maria',
      ownerPhoneMain: '11999990000',
      financialStatus: 'partial',
      totalAmount: 100,
      lastClosedAt: '2026-03-17T12:00:00.000Z'
    }],
    page: 1,
    pageSize: 20,
    total: 1,
    openCount: 1,
    settledCount: 0,
    totalOutstanding: 70,
    totalSettled: 30
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
  // Apply mock BEFORE registering routes
  createEncounterFinancialServiceMock.mockReturnValue(mockedService);
  await app.register(encounterFinancialRoutes);
  await app.ready();
  return app;
}

describe('encounterFinancial routes', () => {
  const actor: RequestContext['actor'] = {
    accountId: '550e8400-e29b-41d4-a716-446655440000',
    userId: '550e8400-e29b-41d4-a716-446655440001',
    role: 'admin',
    roles: ['admin'],
    permissions: ['financial_account.read', 'financial_account.close']
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockedService.getSummary.mockResolvedValue(makeSummary());
    mockedService.close.mockResolvedValue({ kind: 'closed', summary: makeSummary() });
    mockedService.listReceivables.mockResolvedValue(makeReceivablesResponse());
    mockedService.settleReceivable.mockResolvedValue({
      kind: 'settled',
      receivable: makeReceivable({ amountPaid: 50, amountOutstanding: 50, payments: [makePayment(), { ...makePayment(), id: '550e8400-e29b-41d4-a716-446655440501', amountPaid: 20 }] })
    });
  });

  it('returns 200 for financial summary', async () => {
    const app = await buildTestApp(actor);
    const response = await app.inject({ method: 'GET', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/financial-summary' });
    expect(response.statusCode).toBe(200);
    expect(response.json().receivables).toHaveLength(2);
    await app.close();
  });

  it('returns 200 for formal financial close', async () => {
    const app = await buildTestApp(actor);
    const response = await app.inject({ method: 'POST', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/financial-close', payload: { paidAmount: 30, notes: 'Entrada recebida', installments: [{ label: 'Parcela 1/2', amount: 50 }] } });
    expect(response.statusCode).toBe(200);
    expect(response.json().financialStatus).toBe('partial');
    await app.close();
  });

  it('returns 200 for receivables list', async () => {
    const app = await buildTestApp(actor);
    const response = await app.inject({ method: 'GET', url: '/financial/receivables?status=open&page=1&pageSize=20&encounterId=550e8400-e29b-41d4-a716-446655440100' });
    expect(response.statusCode).toBe(200);
    expect(response.json().totalOutstanding).toBe(70);
    await app.close();
  });

  it('returns 200 for receivable settlement', async () => {
    const app = await buildTestApp(actor);
    const response = await app.inject({ method: 'POST', url: '/financial/receivables/550e8400-e29b-41d4-a716-446655440210/settle', payload: { amountPaid: 20, notes: 'PIX depois da alta' } });
    expect(response.statusCode).toBe(200);
    expect(response.json().payments.length).toBe(2);
    await app.close();
  });

  it('returns 404 when encounter is missing on close', async () => {
    mockedService.close.mockResolvedValueOnce({ kind: 'encounter_not_found' });
    const app = await buildTestApp(actor);
    const response = await app.inject({ method: 'POST', url: '/encounters/550e8400-e29b-41d4-a716-446655440100/financial-close', payload: { paidAmount: 0 } });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
