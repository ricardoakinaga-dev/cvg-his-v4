import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, withTenantQueryMock } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryMock = vi.fn(
    async (_pool: unknown, fn: (client: { query: typeof queryMock }) => Promise<unknown>) =>
      fn({ query: queryMock })
  );
  return { queryMock, withTenantQueryMock };
});

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn(() => ({ mocked: true }))
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: withTenantQueryMock
}));

import {
  DatabaseCardTransactionRepository,
  type CardTransactionRecord
} from '../../../apps/api/src/card-transaction-repository.ts';

function createRecord(overrides: Partial<CardTransactionRecord> = {}): CardTransactionRecord {
  return {
    transactionId: 'card_tx_1',
    provider: 'pagarme-card',
    accountId: 'acc_card',
    billingRecordId: 'bill_1',
    amount: 180.5,
    currency: 'BRL',
    description: 'Recebimento cartão',
    installments: 3,
    status: 'pending',
    createdAt: '2026-08-23T10:00:00.000Z',
    updatedAt: '2026-08-23T10:00:00.000Z',
    providerOrderId: 'order_1',
    providerChargeId: 'charge_1',
    providerAuthorizationCode: 'auth_1',
    providerReferenceId: 'ref_1',
    cardHolderName: 'Tutor',
    cardBrand: 'visa',
    cardLast4: '4242',
    billingSettlementStatus: 'awaiting_capture',
    ...overrides
  };
}

function createDbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transaction_id: 'card_tx_1',
    provider: 'pagarme-card',
    account_id: 'acc_card',
    billing_record_id: 'bill_1',
    amount: '180.5',
    currency: 'BRL',
    description: 'Recebimento cartão',
    installments: 3,
    status: 'pending',
    created_at: '2026-08-23T10:00:00.000Z',
    updated_at: '2026-08-23T10:00:00.000Z',
    captured_at: null,
    last_provider_sync_at: null,
    provider_order_id: 'order_1',
    provider_charge_id: 'charge_1',
    provider_authorization_code: 'auth_1',
    provider_reference_id: 'ref_1',
    failure_reason: null,
    card_holder_name: 'Tutor',
    card_brand: 'visa',
    card_last4: '4242',
    billing_settlement_status: 'awaiting_capture',
    billing_settled_at: null,
    billing_settlement_error: null,
    ...overrides
  };
}

describe('DatabaseCardTransactionRepository', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryMock.mockClear();
  });

  it('persists the complete non-sensitive card contract idempotently', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    await new DatabaseCardTransactionRepository().create(createRecord());

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO card_transactions'),
      expect.arrayContaining([
        'card_tx_1',
        'pagarme-card',
        'acc_card',
        'bill_1',
        180.5,
        'BRL',
        3,
        '4242'
      ])
    );
    expect(queryMock.mock.calls[0]?.[0]).toMatch(/ON CONFLICT \(transaction_id\) DO NOTHING/);
  });

  it('maps lookups and status/settlement transitions from PostgreSQL rows', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [createDbRow()] })
      .mockResolvedValueOnce({
        rows: [createDbRow({ status: 'captured', captured_at: '2026-08-23T11:00:00.000Z' })]
      })
      .mockResolvedValueOnce({
        rows: [
          createDbRow({
            billing_settlement_status: 'applied',
            billing_settled_at: '2026-08-23T11:05:00.000Z'
          })
        ]
      });

    const repository = new DatabaseCardTransactionRepository();
    const found = await repository.findByTransactionId('card_tx_1');
    const captured = await repository.updateStatus({
      transactionId: 'card_tx_1',
      status: 'captured',
      capturedAt: '2026-08-23T11:00:00.000Z'
    });
    const settled = await repository.updateBillingSettlement({
      transactionId: 'card_tx_1',
      billingSettlementStatus: 'applied',
      billingSettledAt: '2026-08-23T11:05:00.000Z'
    });

    expect(found).toEqual(expect.objectContaining({ amount: 180.5, cardLast4: '4242' }));
    expect(captured).toEqual(expect.objectContaining({ status: 'captured' }));
    expect(settled).toEqual(expect.objectContaining({ billingSettlementStatus: 'applied' }));
  });

  it('builds parameterized tenant/status/provider filters', async () => {
    queryMock.mockResolvedValueOnce({ rows: [createDbRow()] });
    const rows = await new DatabaseCardTransactionRepository().list({
      accountId: 'acc_card',
      status: 'pending',
      provider: 'pagarme-card'
    });

    expect(rows).toHaveLength(1);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('WHERE account_id = $1 AND status = $2 AND provider = $3'),
      ['acc_card', 'pending', 'pagarme-card']
    );
  });
});
