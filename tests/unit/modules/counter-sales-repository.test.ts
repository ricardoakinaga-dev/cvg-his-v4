import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  queryMock,
  withTenantQueryMock,
  runInTenantTransactionMock,
  acquireTenantAuthorizationLockMock,
  getTenantContextMock
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
  const getTenantContextMock = vi.fn(() => ({ accountId: 'account-1' }));
  return {
    queryMock,
    withTenantQueryMock,
    runInTenantTransactionMock,
    acquireTenantAuthorizationLockMock,
    getTenantContextMock
  };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true })),
  runInTenantTransaction: runInTenantTransactionMock,
  acquireTenantAuthorizationLock: acquireTenantAuthorizationLockMock
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: withTenantQueryMock,
  getTenantContext: getTenantContextMock
}));

import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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
    getTenantContextMock.mockReset().mockReturnValue({ accountId: 'account-1' });
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

  it('allocates the next number from a durable account sequence and returns the persisted sale', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ next_number: '900002' }] }).mockResolvedValueOnce({
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
    expect(queryMock.mock.calls[0]?.[0]).toMatch(
      /counter_sale_number_sequences[\s\S]*ON CONFLICT \(account_id\)[\s\S]*RETURNING next_number/
    );
    expect(queryMock.mock.calls[0]?.[1]).toEqual([sale.accountId]);
    expect(queryMock.mock.calls[1]?.[0]).toMatch(/RETURNING \*/);
    expect(queryMock.mock.calls[1]?.[1]).toContain('CS-900002');
  });

  it('fails closed when the durable account sequence is exhausted', async () => {
    queryMock.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(
      new DatabaseCounterSalesRepository().createWithNextNumber({
        ...sale,
        number: undefined as never
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a malformed sequence value before inserting a sale', async () => {
    queryMock.mockResolvedValueOnce({ rows: [{ next_number: 'not-a-number' }], rowCount: 1 });

    await expect(
      new DatabaseCounterSalesRepository().createWithNextNumber({
        ...sale,
        number: undefined as never
      })
    ).rejects.toBeInstanceOf(ConflictError);

    expect(queryMock).toHaveBeenCalledTimes(1);
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

  it('covers the persisted sale read/write mappings and both lock query shapes', async () => {
    const persistedSale = {
      id: sale.id,
      account_id: sale.accountId,
      number: sale.number,
      owner_id: 'owner-1',
      patient_id: 'patient-1',
      encounter_id: 'encounter-1',
      queue_entry_id: 'queue-1',
      billing_record_id: 'billing-1',
      status: 'closed',
      subtotal: '100.00',
      discount_amount: '5.00',
      total: '95.00',
      paid_amount: '95.00',
      balance_due: '0.00',
      notes: 'paid',
      opened_by_user_id: 'user-1',
      closed_by_user_id: 'user-2',
      closed_at: '2026-08-24T10:01:00.000Z',
      created_at: sale.createdAt,
      updated_at: sale.updatedAt
    };
    queryMock
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 })
      .mockResolvedValueOnce({ rows: [persistedSale], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [persistedSale], rowCount: 1 });

    const repository = new DatabaseCounterSalesRepository();
    await repository.create({ ...sale, closedAt: persistedSale.closed_at });
    await expect(repository.findById(sale.id)).resolves.toBeNull();
    await expect(repository.findById(sale.id)).resolves.toMatchObject({
      ownerId: 'owner-1',
      closedAt: persistedSale.closed_at
    });
    await expect(repository.lockSaleForUpdate(sale.id)).resolves.toMatchObject({
      patientId: 'patient-1',
      billingRecordId: 'billing-1'
    });
    expect(queryMock.mock.calls[0]?.[1]).toEqual(expect.arrayContaining([sale.id]));
    expect(queryMock.mock.calls[3]?.[0]).toContain('WHERE id = $1 FOR UPDATE');
  });

  it('builds all account-sale filters and fails closed for an invalid bounded read', async () => {
    const persistedSale = {
      id: sale.id,
      account_id: sale.accountId,
      number: sale.number,
      owner_id: null,
      patient_id: null,
      encounter_id: null,
      queue_entry_id: null,
      billing_record_id: null,
      status: sale.status,
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
    };
    queryMock.mockResolvedValueOnce({ rows: [persistedSale], rowCount: 1 });
    const repository = new DatabaseCounterSalesRepository();
    const filtered = await repository.findByAccountId('account-1' as never, {
      status: 'open',
      ownerId: 'owner-1',
      search: 'CS-000001',
      dateFrom: '2026-08-01',
      dateTo: '2026-08-31',
      limit: 25
    });

    expect(filtered).toHaveLength(1);
    const [sql, params] = queryMock.mock.calls[0]!;
    expect(sql).toContain('status = $2');
    expect(sql).toContain('owner_id = $3');
    expect(sql).toContain('number ILIKE $4');
    expect(sql).toContain('created_at >= ($5::date');
    expect(sql).toContain('created_at < (($6::date');
    expect(sql).toContain('LIMIT $7');
    expect(params).toEqual([
      'account-1',
      'open',
      'owner-1',
      '%CS-000001%',
      '2026-08-01',
      '2026-08-31',
      25
    ]);

    queryMock.mockReset();
    await expect(
      repository.findByAccountId('account-1' as never, { limit: 0 })
    ).rejects.toBeInstanceOf(ValidationError);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('filters malformed cancellation history rows without leaking partial facts', async () => {
    queryMock.mockResolvedValueOnce({
      rows: [
        { id: 'bad', account_id: 'account-1', entity_id: 'sale-1', correlation_id: '' },
        {
          id: 'bad-date',
          account_id: 'account-1',
          entity_id: 'sale-1',
          actor_user_id: 'user-1',
          reason: 'reason',
          correlation_id: 'corr',
          occurred_at: 'not-a-date'
        },
        {
          id: 'good',
          account_id: 'account-1',
          entity_id: 'sale-1',
          actor_user_id: 'user-1',
          reason: 'reason',
          correlation_id: 'corr',
          occurred_at: sale.updatedAt
        }
      ]
    });

    const history = await new DatabaseCounterSalesRepository().listCancellationHistory(
      'account-1' as never,
      sale.id
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.eventId).toBe('good');
  });

  it('records a payment with authoritative cents, recalculated totals and a hashed key', async () => {
    const payment = {
      id: 'payment-1',
      counterSaleId: sale.id,
      accountId: sale.accountId,
      method: 'credit_card' as const,
      amount: 50,
      installments: 2,
      reference: ' ref-1 ',
      notes: ' note-1 ',
      idempotencyKey: ' idempotency-1 ',
      createdAt: sale.createdAt
    };
    const openSale = {
      ...sale,
      status: 'open',
      account_id: sale.accountId,
      number: sale.number,
      closed_at: null,
      created_at: sale.createdAt,
      updated_at: sale.updatedAt,
      subtotal: '0.00',
      discount_amount: '0.00',
      total: '0.00',
      paid_amount: '0.00',
      balance_due: '0.00',
      opened_by_user_id: 'user-1',
      closed_by_user_id: null,
      owner_id: null,
      patient_id: null,
      encounter_id: null,
      queue_entry_id: null,
      billing_record_id: null,
      notes: null
    };
    const persistedPayment = {
      id: payment.id,
      counter_sale_id: payment.counterSaleId,
      account_id: payment.accountId,
      method: payment.method,
      amount: '50.00',
      installments: 2,
      reference: 'ref-1',
      notes: 'note-1',
      created_at: payment.createdAt
    };
    const updatedSale = {
      ...openSale,
      subtotal: '200.00',
      discount_amount: '10.00',
      total: '190.00',
      paid_amount: '70.00',
      balance_due: '120.00'
    };
    queryMock
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ unit_price: '100.00', quantity: 2, discount_amount: '10.00' }]
      })
      .mockResolvedValueOnce({ rows: [{ amount: '20.00' }] })
      .mockResolvedValueOnce({ rows: [persistedPayment] })
      .mockResolvedValueOnce({ rows: [{ amount: '20.00' }, { amount: '50.00' }] })
      .mockResolvedValueOnce({ rows: [updatedSale] });

    const result = await new DatabaseCounterSalesRepository().recordPayment(payment);
    expect(result.sale).toMatchObject({ total: 190, paidAmount: 70, balanceDue: 120 });
    expect(result.payment).toMatchObject({ amount: 50, installments: 2, reference: 'ref-1' });
    const insertCall = queryMock.mock.calls[4]!;
    expect(insertCall[0]).toContain('ON CONFLICT (account_id, idempotency_key_hash)');
    expect(insertCall[1]).toEqual(expect.arrayContaining(['50.00', 2, 'ref-1', 'note-1']));
    expect(insertCall[1]).not.toContain(payment.idempotencyKey);
  });

  it.each([
    { amount: Number.NaN },
    { amount: 0 },
    { amount: -1 },
    { installments: 0 },
    { idempotencyKey: 123 as never },
    { idempotencyKey: 'x'.repeat(256) }
  ])('rejects unsafe payment input before persistence: %j', async (override) => {
    await expect(
      new DatabaseCounterSalesRepository().createPayment({
        id: 'payment-invalid',
        counterSaleId: sale.id,
        accountId: sale.accountId,
        method: 'cash',
        amount: 1,
        installments: 1,
        reference: null,
        notes: null,
        createdAt: sale.createdAt,
        ...override
      })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(queryMock).not.toHaveBeenCalled();
  });

  it('accepts a payment without an idempotency key and maps payment reads', async () => {
    const payment = {
      id: 'payment-no-key',
      counterSaleId: sale.id,
      accountId: sale.accountId,
      method: 'cash' as const,
      amount: 10,
      installments: undefined,
      reference: undefined,
      notes: undefined,
      createdAt: sale.createdAt
    };
    queryMock.mockResolvedValueOnce({ rows: [] });
    await expect(new DatabaseCounterSalesRepository().createPayment(payment)).resolves.toBeUndefined();
    expect(queryMock.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['10.00', 1, null, null, null])
    );

    queryMock.mockReset().mockResolvedValueOnce({
      rows: [
        {
          id: 'payment-2',
          counter_sale_id: sale.id,
          account_id: sale.accountId,
          method: 'cash',
          amount: '10.00',
          installments: '1',
          reference: null,
          notes: null,
          created_at: sale.createdAt
        }
      ]
    });
    await expect(new DatabaseCounterSalesRepository().findPaymentsBySaleId(sale.id)).resolves.toMatchObject([
      { id: 'payment-2', amount: 10, installments: 1, reference: null, notes: null }
    ]);
  });

  it('handles idempotent replay, non-open sales and payment consistency failures', async () => {
    const payment = {
      id: 'payment-replay',
      counterSaleId: sale.id,
      accountId: sale.accountId,
      method: 'cash' as const,
      amount: 10,
      installments: 1,
      reference: null,
      notes: null,
      idempotencyKey: 'replay-key',
      createdAt: sale.createdAt
    };
    const row = {
      id: payment.id,
      counter_sale_id: sale.id,
      account_id: sale.accountId,
      method: 'cash',
      amount: '10.00',
      installments: 1,
      reference: null,
      notes: null,
      created_at: sale.createdAt
    };
    const openSale = {
      ...sale,
      status: 'open',
      account_id: sale.accountId,
      closed_at: null,
      created_at: sale.createdAt,
      updated_at: sale.updatedAt,
      subtotal: '10.00',
      discount_amount: '0.00',
      total: '10.00',
      paid_amount: '10.00',
      balance_due: '0.00',
      opened_by_user_id: 'user-1',
      closed_by_user_id: null
    };
    queryMock
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [{ unit_price: '10.00', quantity: 1, discount_amount: '0.00' }] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [openSale] });
    await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).resolves.toMatchObject({
      payment: { id: payment.id }
    });

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [{ ...openSale, status: 'closed' }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(queryMock).toHaveBeenCalledTimes(2);

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [{ unit_price: '1.00', quantity: 1, discount_amount: '0.00' }] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(
      new DatabaseCounterSalesRepository().recordPayment({
        ...payment,
        idempotencyKey: undefined,
        amount: 2
      })
    ).rejects.toBeInstanceOf(ConflictError);

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [{ unit_price: '1.00', quantity: 1, discount_amount: '0.00' }] })
      .mockResolvedValueOnce({ rows: [{ amount: '2.00' }] });
    await expect(
      new DatabaseCounterSalesRepository().recordPayment({ ...payment, idempotencyKey: undefined })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('recovers an idempotency race and rejects an unresolved race or divergent payload', async () => {
    const payment = {
      id: 'payment-race',
      counterSaleId: sale.id,
      accountId: sale.accountId,
      method: 'cash' as const,
      amount: 10,
      installments: 1,
      reference: null,
      notes: null,
      idempotencyKey: 'race-key',
      createdAt: sale.createdAt
    };
    const openSale = {
      ...sale,
      status: 'open',
      account_id: sale.accountId,
      closed_at: null,
      created_at: sale.createdAt,
      updated_at: sale.updatedAt,
      subtotal: '10.00',
      discount_amount: '0.00',
      total: '10.00',
      paid_amount: '0.00',
      balance_due: '10.00',
      opened_by_user_id: 'user-1',
      closed_by_user_id: null
    };
    const raced = {
      id: 'payment-other',
      counter_sale_id: sale.id,
      account_id: sale.accountId,
      method: 'cash',
      amount: '10.00',
      installments: 1,
      reference: null,
      notes: null,
      created_at: sale.createdAt
    };
    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ unit_price: '10.00', quantity: 1, discount_amount: '0.00' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [raced] })
      .mockResolvedValueOnce({ rows: [raced] })
      .mockResolvedValueOnce({ rows: [{ ...openSale, paid_amount: '10.00', balance_due: '0.00' }] });
    await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).resolves.toMatchObject({
      payment: { id: 'payment-other' }
    });

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ unit_price: '10.00', quantity: 1, discount_amount: '0.00' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).rejects.toBeInstanceOf(
      ConflictError
    );

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [raced] });
    await expect(
      new DatabaseCounterSalesRepository().recordPayment({ ...payment, amount: 11 })
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('validates authoritative item money, quantities and post-insert persistence', async () => {
    const payment = {
      id: 'payment-invalid-row',
      counterSaleId: sale.id,
      accountId: sale.accountId,
      method: 'cash' as const,
      amount: 1,
      installments: 1,
      reference: null,
      notes: null,
      createdAt: sale.createdAt
    };
    const openSale = {
      ...sale,
      status: 'open',
      account_id: sale.accountId,
      closed_at: null,
      created_at: sale.createdAt,
      updated_at: sale.updatedAt,
      subtotal: '1.00',
      discount_amount: '0.00',
      total: '1.00',
      paid_amount: '0.00',
      balance_due: '1.00',
      opened_by_user_id: 'user-1',
      closed_by_user_id: null
    };
    const invalidRows = [
      { unit_price: 'not-money', quantity: 1, discount_amount: '0.00' },
      { unit_price: '1.00', quantity: 0, discount_amount: '0.00' },
      { unit_price: '1.00', quantity: 1, discount_amount: '-1.00' },
      { unit_price: '1.00', quantity: 1, discount_amount: '2.00' }
    ];
    for (const invalid of invalidRows) {
      queryMock
        .mockReset()
        .mockResolvedValueOnce({ rows: [openSale] })
        .mockResolvedValueOnce({ rows: [invalid] })
        .mockResolvedValueOnce({ rows: [] });
      await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).rejects.toBeInstanceOf(
        ConflictError
      );
    }

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({
        rows: [{ unit_price: '90071992547409.92', quantity: 2, discount_amount: '0.00' }]
      })
      .mockResolvedValueOnce({ rows: [] });
    await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).rejects.toBeInstanceOf(
      ConflictError
    );

    queryMock
      .mockReset()
      .mockResolvedValueOnce({ rows: [openSale] })
      .mockResolvedValueOnce({ rows: [{ unit_price: '1.00', quantity: 1, discount_amount: '0.00' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });
    await expect(new DatabaseCounterSalesRepository().recordPayment(payment)).rejects.toThrow(
      'could not be persisted'
    );
  });

  it('covers cheque, receipt, aggregate and top-item report queries with date bounds', async () => {
    const receiptRow = {
      id: 'receipt-1',
      account_id: sale.accountId,
      counter_sale_id: sale.id,
      amount: '10.00',
      currency: 'BRL',
      received_by_user_id: 'user-1',
      received_at: sale.createdAt,
      cash_register_id: null,
      cash_movement_id: 'movement-1',
      journal_entry_id: 'journal-1',
      created_at: sale.createdAt
    };
    const paymentRow = {
      id: 'check-1',
      counter_sale_id: sale.id,
      account_id: sale.accountId,
      method: 'check',
      amount: '25.50',
      installments: '1',
      reference: null,
      notes: null,
      created_at: sale.createdAt,
      sale_number: 'CS-000001',
      sale_status: 'closed'
    };
    queryMock
      .mockResolvedValueOnce({ rows: [paymentRow] })
      .mockResolvedValueOnce({ rows: [receiptRow] })
      .mockResolvedValueOnce({ rows: [receiptRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ gross: '100.00', net: '75.00' }] })
      .mockResolvedValueOnce({ rows: [{ method: 'cash', total: '50.00' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Product', quantity: '2', revenue: '30.00' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Service', quantity: '1', revenue: '70.00' }] })
      .mockResolvedValueOnce({ rows: [{ name: 'Low', code: 'LOW', onHand: '1', reorderLevel: '2' }] });
    const repository = new DatabaseCounterSalesRepository();
    await expect(
      repository.listChequePayments('account-1' as never, {
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31'
      })
    ).resolves.toMatchObject([{ saleNumber: 'CS-000001', amount: 25.5 }]);
    await expect(
      repository.createReceipt({
        id: 'receipt-1',
        accountId: sale.accountId,
        counterSaleId: sale.id,
        amount: 10,
        currency: 'BRL',
        receivedByUserId: 'user-1' as never,
        receivedAt: sale.createdAt,
        cashRegisterId: null,
        cashMovementId: 'movement-1',
        journalEntryId: 'journal-1',
        createdAt: sale.createdAt
      })
    ).resolves.toMatchObject({ id: 'receipt-1', amount: 10 });
    await expect(repository.findReceipt(sale.id)).resolves.toMatchObject({ id: 'receipt-1' });
    await expect(repository.findReceipt(sale.id)).resolves.toBeNull();
    await expect(repository.getOpenSalesCount('account-1' as never)).resolves.toBe(2);
    await expect(repository.getClosedTodayCount('account-1' as never)).resolves.toBe(1);
    await expect(repository.getRevenueToday('account-1' as never)).resolves.toEqual({
      gross: 100,
      net: 75
    });
    await expect(
      repository.getSalesByPaymentMethod('account-1' as never, sale.createdAt, sale.updatedAt)
    ).resolves.toEqual([{ method: 'cash', total: 50 }]);
    await expect(
      repository.getTopProducts('account-1' as never, sale.createdAt, sale.updatedAt, 5)
    ).resolves.toEqual([{ name: 'Product', quantity: 2, revenue: 30 }]);
    await expect(
      repository.getTopServices('account-1' as never, sale.createdAt, sale.updatedAt, 5)
    ).resolves.toEqual([{ name: 'Service', quantity: 1, revenue: 70 }]);
    await expect(repository.getLowStockAlerts('account-1' as never)).resolves.toEqual([
      { name: 'Low', code: 'LOW', onHand: 1, reorderLevel: 2 }
    ]);
    expect(queryMock).toHaveBeenCalledTimes(11);
    expect(queryMock.mock.calls[0]?.[0]).toContain('csp.created_at >=');
    expect(queryMock.mock.calls[0]?.[0]).toContain('csp.created_at <');
  });

  it('uses the existing receipt after an idempotent insert and fails when it is absent', async () => {
    const receipt = {
      id: 'receipt-existing',
      accountId: sale.accountId,
      counterSaleId: sale.id,
      amount: 10,
      currency: 'BRL' as const,
      receivedByUserId: 'user-1' as never,
      receivedAt: sale.createdAt,
      cashRegisterId: null,
      cashMovementId: null,
      journalEntryId: null,
      createdAt: sale.createdAt
    };
    const row = {
      id: receipt.id,
      account_id: sale.accountId,
      counter_sale_id: sale.id,
      amount: '10.00',
      currency: 'BRL',
      received_by_user_id: 'user-1',
      received_at: sale.createdAt,
      cash_register_id: null,
      cash_movement_id: null,
      journal_entry_id: null,
      created_at: sale.createdAt
    };
    queryMock
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [row] });
    await expect(new DatabaseCounterSalesRepository().createReceipt(receipt)).resolves.toMatchObject({
      id: receipt.id
    });

    queryMock.mockReset().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });
    await expect(new DatabaseCounterSalesRepository().createReceipt(receipt)).rejects.toThrow(
      'could not be persisted'
    );
  });
});
