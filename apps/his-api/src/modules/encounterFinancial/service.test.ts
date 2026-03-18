import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createEncounterFinancialService } from './service.js';

vi.mock('@cvg-his/audit', () => ({ append: vi.fn() }));

const fakeDb = {} as { $client?: { query: (...args: unknown[]) => Promise<{ rows: unknown[] }> } };

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-financial-1',
    actor: {
      accountId: 'account-1',
      userId: 'user-1',
      role: 'admin',
      roles: ['admin'],
      permissions: []
    },
    ...overrides
  };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    receivableId: 'rec-1',
    financialAccountId: 'fa-1',
    encounterId: 'enc-1',
    amountPaid: 30,
    paidAt: new Date('2026-03-17T12:00:00.000Z'),
    paidByUserId: 'user-1',
    notes: 'Entrada',
    ...overrides
  };
}

function makeReceivable(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    encounterId: 'enc-1',
    financialAccountId: 'fa-1',
    installmentNumber: 1,
    installmentLabel: 'Parcela 1/2',
    dueAt: new Date('2026-03-20T12:00:00.000Z'),
    status: 'open',
    amountOriginal: 100,
    amountPaid: 30,
    amountOutstanding: 70,
    issuedAt: new Date('2026-03-17T12:00:00.000Z'),
    settledAt: null,
    notes: 'Entrada',
    payments: [makePayment()],
    ...overrides
  };
}

function makeSummary(overrides: Record<string, unknown> = {}) {
  const receivable = makeReceivable();
  return {
    encounterId: 'enc-1',
    accountId: 'account-1',
    encounterStatus: 'open',
    financialStatus: 'pending',
    financialClosed: false,
    subtotal: 120,
    discountTotal: 20,
    total: 100,
    paidAmount: 0,
    balanceDue: 100,
    closedAt: null,
    closedByUserId: null,
    notes: null,
    receivable,
    receivables: [receivable],
    payments: [makePayment()],
    ...overrides
  };
}

describe('encounterFinancial service', () => {
  const repo = {
    getSummary: vi.fn(),
    closeFinancial: vi.fn(),
    listReceivables: vi.fn(),
    settleReceivable: vi.fn()
  };
  const appendAudit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns financial summary scoped by account', async () => {
    repo.getSummary.mockResolvedValue(makeSummary());
    const service = createEncounterFinancialService({ db: fakeDb, requestContext: createRequestContext() }, { repo: repo as never, appendAudit });
    const result = await service.getSummary('enc-1');
    expect(repo.getSummary).toHaveBeenCalledWith('account-1', 'enc-1');
    expect(result?.receivables).toHaveLength(1);
  });

  it('closes financial account with installments and appends audit', async () => {
    repo.getSummary.mockResolvedValueOnce(makeSummary({ receivables: [], receivable: null, payments: [] }));
    repo.closeFinancial.mockResolvedValueOnce(makeSummary({ financialClosed: true, financialStatus: 'partial', paidAmount: 30, balanceDue: 70 }));
    const service = createEncounterFinancialService({ db: fakeDb, requestContext: createRequestContext() }, { repo: repo as never, appendAudit });
    const result = await service.close('enc-1', {
      paidAmount: 30,
      notes: 'Entrada recebida',
      installments: [{ label: 'Parcela 1/2', amount: 35, dueAt: new Date('2026-03-20T12:00:00.000Z'), notes: 'PIX' }]
    });
    expect(result.kind).toBe('closed');
    expect(repo.closeFinancial).toHaveBeenCalledWith(expect.objectContaining({ paidAmount: 30, encounterId: 'enc-1', closedByUserId: 'user-1', installments: expect.any(Array) }));
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'encounter_financial.close' }));
  });

  it('lists receivables scoped by account', async () => {
    repo.listReceivables.mockResolvedValue({
      data: [{
        ...makeReceivable(),
        encounterStatus: 'open',
        patientId: 'pat-1',
        patientName: 'Luna',
        patientSpecies: 'canine',
        ownerId: 'own-1',
        ownerName: 'Maria',
        ownerPhoneMain: '11999990000',
        financialStatus: 'partial',
        totalAmount: 100,
        lastClosedAt: new Date('2026-03-17T12:00:00.000Z')
      }],
      page: 1,
      pageSize: 20,
      total: 1,
      openCount: 1,
      settledCount: 0,
      totalOutstanding: 70,
      totalSettled: 30
    });
    const service = createEncounterFinancialService({ db: fakeDb, requestContext: createRequestContext() }, { repo: repo as never, appendAudit });
    const result = await service.listReceivables({ page: 1, pageSize: 20, status: 'open', encounterId: 'enc-1' });
    expect(repo.listReceivables).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'account-1', status: 'open', encounterId: 'enc-1' }));
    expect(result.totalOutstanding).toBe(70);
  });

  it('settles receivable and appends audit', async () => {
    repo.listReceivables.mockResolvedValue({
      data: [{
        ...makeReceivable(),
        encounterStatus: 'open',
        patientId: 'pat-1',
        patientName: 'Luna',
        patientSpecies: 'canine',
        ownerId: 'own-1',
        ownerName: 'Maria',
        ownerPhoneMain: '11999990000',
        financialStatus: 'partial',
        totalAmount: 100,
        lastClosedAt: new Date('2026-03-17T12:00:00.000Z')
      }],
      page: 1,
      pageSize: 500,
      total: 1,
      openCount: 1,
      settledCount: 0,
      totalOutstanding: 70,
      totalSettled: 30
    });
    repo.settleReceivable.mockResolvedValue(makeReceivable({ amountPaid: 70, amountOutstanding: 30, payments: [makePayment(), makePayment({ id: 'pay-2', amountPaid: 40 })] }));
    const service = createEncounterFinancialService({ db: fakeDb, requestContext: createRequestContext() }, { repo: repo as never, appendAudit });
    const result = await service.settleReceivable('rec-1', { amountPaid: 40, notes: 'PIX depois da alta' });
    expect(result.kind).toBe('settled');
    expect(repo.settleReceivable).toHaveBeenCalledWith(expect.objectContaining({ receivableId: 'rec-1', amountPaid: 40, paidByUserId: 'user-1' }));
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'encounter_receivable.settle' }));
  });

  it('returns encounter_not_found when financial close target is missing', async () => {
    repo.getSummary.mockResolvedValueOnce(null);
    const service = createEncounterFinancialService({ db: fakeDb, requestContext: createRequestContext() }, { repo: repo as never, appendAudit });
    const result = await service.close('enc-missing', { paidAmount: 0, notes: null, installments: [] });
    expect(result.kind).toBe('encounter_not_found');
  });
});
