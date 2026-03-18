import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createEncounterBillingService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-1',
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

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'billing-1',
    accountId: 'account-1',
    encounterId: 'enc-1',
    itemType: 'service',
    catalogItemId: 'catalog-1',
    nameSnapshot: 'Consulta clínica',
    codeSnapshot: 'CONSULTA',
    unitPrice: 120,
    quantity: 2,
    discountAmount: 0,
    lineTotal: 240,
    notes: null,
    createdByUserId: 'user-1',
    updatedByUserId: 'user-1',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides
  };
}

describe('encounterBilling service', () => {
  const repo = {
    encounterExists: vi.fn(),
    findEncounterStatus: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updateById: vi.fn(),
    removeById: vi.fn(),
    list: vi.fn(),
    getSummary: vi.fn()
  };
  const appendAudit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates billing item when encounter is open', async () => {
    repo.findEncounterStatus.mockResolvedValue('open');
    repo.create.mockResolvedValue(makeItem());

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.create('enc-1', {
      itemType: 'service',
      catalogItemId: 'catalog-1',
      nameSnapshot: 'Consulta clínica',
      codeSnapshot: 'CONSULTA',
      unitPrice: 120,
      quantity: 2,
      discountAmount: 0,
      notes: null
    });

    expect(result.kind).toBe('created');
    expect(repo.create).toHaveBeenCalled();
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'encounter_billing_item.create' }));
  });

  it('returns encounter_not_found when encounter is missing', async () => {
    repo.findEncounterStatus.mockResolvedValue(null);

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.create('enc-missing', {
      itemType: 'service',
      catalogItemId: null,
      nameSnapshot: 'Consulta clínica',
      codeSnapshot: null,
      unitPrice: 120,
      quantity: 1,
      discountAmount: 0,
      notes: null
    });

    expect(result.kind).toBe('encounter_not_found');
  });

  it('blocks billing item creation after encounter close', async () => {
    repo.findEncounterStatus.mockResolvedValue('closed');

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.create('enc-1', {
      itemType: 'service',
      catalogItemId: null,
      nameSnapshot: 'Consulta clínica',
      codeSnapshot: null,
      unitPrice: 120,
      quantity: 1,
      discountAmount: 0,
      notes: null
    });

    expect(result.kind).toBe('encounter_closed');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('updates billing item while encounter is open', async () => {
    repo.findById.mockResolvedValue(makeItem());
    repo.findEncounterStatus.mockResolvedValue('open');
    repo.updateById.mockResolvedValue(makeItem({ quantity: 3, discountAmount: 20, lineTotal: 340 }));

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.update('billing-1', { quantity: 3, discountAmount: 20 });

    expect(repo.updateById).toHaveBeenCalledWith('account-1', 'billing-1', expect.objectContaining({ quantity: 3, discountAmount: 20, updatedByUserId: 'user-1' }));
    expect(result.kind).toBe('updated');
    if (result.kind === 'updated') {
      expect(result.item.quantity).toBe(3);
      expect(result.item.discountAmount).toBe(20);
    }
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'encounter_billing_item.update' }));
  });

  it('blocks billing item update after encounter close', async () => {
    repo.findById.mockResolvedValue(makeItem());
    repo.findEncounterStatus.mockResolvedValue('closed');

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.update('billing-1', { quantity: 3 });

    expect(result.kind).toBe('encounter_closed');
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('lists billing items scoped by account', async () => {
    repo.list.mockResolvedValue({ data: [makeItem()], page: 1, pageSize: 20, total: 1 });

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.list({ page: 1, pageSize: 20, encounterId: 'enc-1', itemType: 'service' });

    expect(repo.list).toHaveBeenCalledWith({ accountId: 'account-1', page: 1, pageSize: 20, encounterId: 'enc-1', itemType: 'service' });
    expect(result.total).toBe(1);
  });

  it('returns consolidated summary scoped by account', async () => {
    repo.getSummary.mockResolvedValue({
      encounterId: 'enc-1',
      accountId: 'account-1',
      encounterStatus: 'open',
      totals: {
        itemCount: 2,
        serviceItemCount: 1,
        productItemCount: 1,
        subtotal: 170,
        discountTotal: 20,
        total: 150
      },
      items: [makeItem(), makeItem({ id: 'billing-2', itemType: 'product', unitPrice: 50, quantity: 1, discountAmount: 20, lineTotal: 30 })]
    });

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.getSummary('enc-1');

    expect(repo.getSummary).toHaveBeenCalledWith('account-1', 'enc-1');
    expect(result?.totals.total).toBe(150);
  });

  it('removes billing item while encounter is open', async () => {
    repo.findById.mockResolvedValue(makeItem());
    repo.findEncounterStatus.mockResolvedValue('open');
    repo.removeById.mockResolvedValue(makeItem());

    const service = createEncounterBillingService(
      { db: fakeDb, requestContext: createRequestContext() },
      { repo: repo as never, appendAudit }
    );

    const result = await service.remove('billing-1');

    expect(repo.removeById).toHaveBeenCalledWith('account-1', 'billing-1');
    expect(result.kind).toBe('removed');
    expect(appendAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'encounter_billing_item.remove' }));
  });
});
