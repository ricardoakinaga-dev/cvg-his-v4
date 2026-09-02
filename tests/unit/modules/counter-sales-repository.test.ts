import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  queryMock,
  withTenantQueryMock,
  runInTenantTransactionMock,
  acquireTenantAuthorizationLockMock
} = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryMock = vi.fn(
    async (_pool: unknown, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
      fn({ query: queryMock })
  );
  const runInTenantTransactionMock = vi.fn(
    async (
      _pool: unknown,
      _accountId: string,
      fn: (client: { query: typeof queryMock }) => Promise<unknown>
    ) => fn({ query: queryMock })
  );
  const acquireTenantAuthorizationLockMock = vi.fn(async (_accountId: string) => undefined);
  return {
    queryMock,
    withTenantQueryMock,
    runInTenantTransactionMock,
    acquireTenantAuthorizationLockMock
  };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true })),
  runInTenantTransaction: runInTenantTransactionMock,
  acquireTenantAuthorizationLock: acquireTenantAuthorizationLockMock
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: withTenantQueryMock
}));

import { NotFoundError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseCounterSalesRepository,
  type CounterSaleItemRecord,
  type CounterSaleDraft,
  type CounterSaleRecord
} from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.js';

const item: CounterSaleItemRecord = {
  id: 'item-1',
  counterSaleId: 'sale-1',
  accountId: 'account-1' as never,
  itemType: 'service',
  catalogItemId: null,
  nameSnapshot: 'Consulta',
  codeSnapshot: null,
  unitPrice: 100,
  quantity: 1,
  discountAmount: 0,
  lineTotal: 100,
  notes: null,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: '2026-08-24T10:00:00.000Z'
};

const sale: CounterSaleRecord = {
  id: 'sale-1',
  accountId: 'account-1' as never,
  number: 'CS-000001',
  ownerId: null,
  patientId: null,
  encounterId: null,
  queueEntryId: null,
  billingRecordId: null,
  status: 'cancelled',
  subtotal: 100,
  discountAmount: 0,
  total: 100,
  paidAmount: 0,
  balanceDue: 100,
  notes: null,
  openedByUserId: 'user-1' as never,
  closedByUserId: null,
  closedAt: null,
  createdAt: '2026-08-24T10:00:00.000Z',
  updatedAt: '2026-08-24T10:01:00.000Z'
};

describe('DatabaseCounterSalesRepository item tenant boundaries', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryMock.mockClear();
  });

  it('scopes sale updates by account and rejects a missing row', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(new DatabaseCounterSalesRepository().update(sale)).rejects.toBeInstanceOf(
      NotFoundError
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE id = \$1\s+AND account_id = \$2/),
      expect.arrayContaining(['sale-1', 'account-1'])
    );
  });

  it('allocates the next number under an account transaction lock and returns the persisted sale', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ max_number: '900001' }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: sale.id,
            account_id: sale.accountId,
            number: 'CS-900002',
            owner_id: null,
            patient_id: null,
            encounter_id: null,
            queue_entry_id: null,
            billing_record_id: null,
            status: 'cancelled',
            subtotal: '100.00',
            discount_amount: '0.00',
            total: '100.00',
            paid_amount: '0.00',
            balance_due: '100.00',
            notes: null,
            opened_by_user_id: 'user-1',
            closed_by_user_id: null,
            closed_at: null,
            created_at: sale.createdAt,
            updated_at: sale.updatedAt
          }
        ],
        rowCount: 1
      });
    const draft: CounterSaleDraft = {
      id: sale.id,
      accountId: sale.accountId,
      ownerId: sale.ownerId,
      patientId: sale.patientId,
      encounterId: sale.encounterId,
      queueEntryId: sale.queueEntryId,
      billingRecordId: sale.billingRecordId,
      status: sale.status,
      subtotal: sale.subtotal,
      discountAmount: sale.discountAmount,
      total: sale.total,
      paidAmount: sale.paidAmount,
      balanceDue: sale.balanceDue,
      notes: sale.notes,
      openedByUserId: sale.openedByUserId,
      closedByUserId: sale.closedByUserId,
      closedAt: sale.closedAt,
      createdAt: sale.createdAt,
      updatedAt: sale.updatedAt
    };

    const allocated = await new DatabaseCounterSalesRepository().createWithNextNumber(draft);

    expect(allocated.number).toBe('CS-900002');
    expect(runInTenantTransactionMock).toHaveBeenCalledWith(
      expect.anything(),
      sale.accountId,
      expect.any(Function)
    );
    expect(acquireTenantAuthorizationLockMock).toHaveBeenCalledWith(sale.accountId);
    expect(queryMock.mock.calls[0]?.[0]).toMatch(/MAX\([\s\S]*account_id = \$1/);
    expect(queryMock.mock.calls[0]?.[1]).toEqual([sale.accountId]);
    expect(queryMock.mock.calls[1]?.[0]).toMatch(/RETURNING \*/);
    expect(queryMock.mock.calls[1]?.[1]).toContain('CS-900002');
  });

  it('locks a sale with the explicit account predicate', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      new DatabaseCounterSalesRepository().lockSaleForUpdate?.('sale-1', 'account-1' as never)
    ).resolves.toBeNull();

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE id = \$1 AND account_id = \$2 FOR UPDATE/),
      ['sale-1', 'account-1']
    );
  });

  it('reads cancellation history only for the current tenant and sale', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'event-1',
          account_id: 'account-1',
          entity_id: 'sale-1',
          actor_user_id: 'user-1',
          occurred_at: '2026-08-24T10:01:00.000Z',
          reason: 'Cliente desistiu',
          correlation_id: 'corr-1'
        }
      ],
      rowCount: 1
    });

    const repository = new DatabaseCounterSalesRepository() as unknown as {
      listCancellationHistory: (
        accountId: string,
        counterSaleId: string
      ) => Promise<readonly Record<string, unknown>[]>;
    };
    const history = await repository.listCancellationHistory('account-1', 'sale-1');

    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      eventId: 'event-1',
      accountId: 'account-1',
      counterSaleId: 'sale-1',
      cancelledByUserId: 'user-1',
      reason: 'Cliente desistiu'
    });
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/entity_type = 'counter-sale'.*action = 'cancelled'/s),
      ['account-1', 'sale-1']
    );
  });

  it('scopes item updates by account and parent sale and rejects a missing row', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(new DatabaseCounterSalesRepository().updateItem(item)).rejects.toBeInstanceOf(
      NotFoundError
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE\s+id = \$1\s+AND account_id = \$2\s+AND counter_sale_id = \$3/),
      expect.arrayContaining(['item-1', 'account-1', 'sale-1'])
    );
  });

  it('scopes item selection by account and parent sale', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        {
          id: 'item-1',
          counter_sale_id: 'sale-1',
          account_id: 'account-1',
          item_type: 'service',
          catalog_item_id: null,
          name_snapshot: 'Consulta',
          code_snapshot: null,
          unit_price: '100.00',
          quantity: 1,
          discount_amount: '0.00',
          line_total: '100.00',
          notes: null,
          created_at: '2026-08-24T10:00:00.000Z',
          updated_at: '2026-08-24T10:00:00.000Z'
        }
      ],
      rowCount: 1
    });

    const repository = new DatabaseCounterSalesRepository();
    const findItemsBySaleId = repository.findItemsBySaleId as unknown as (
      accountId: string,
      counterSaleId: string
    ) => Promise<readonly CounterSaleItemRecord[]>;
    const items = await findItemsBySaleId.call(repository, 'account-1', 'sale-1');

    expect(items).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE\s+account_id = \$1\s+AND counter_sale_id = \$2/),
      ['account-1', 'sale-1']
    );
  });

  it('scopes item deletion by account and parent sale and rejects a missing row', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const deleteItem = new DatabaseCounterSalesRepository().deleteItem as unknown as (
      itemId: string,
      accountId: string,
      counterSaleId: string
    ) => Promise<void>;
    await expect(deleteItem('item-1', 'account-1', 'sale-1')).rejects.toBeInstanceOf(NotFoundError);

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringMatching(/WHERE\s+id = \$1\s+AND account_id = \$2\s+AND counter_sale_id = \$3/),
      ['item-1', 'account-1', 'sale-1']
    );
  });
});
