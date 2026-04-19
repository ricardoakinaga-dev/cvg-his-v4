import { beforeEach, describe, expect, it, vi } from 'vitest';

const { queryMock, withTenantQueryMock } = vi.hoisted(() => {
  const queryMock = vi.fn();
  const withTenantQueryMock = vi.fn(
    async (
      _pool: unknown,
      fn: (client: { query: typeof queryMock }) => Promise<unknown>
    ) => fn({ query: queryMock })
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
  DatabasePixTransactionRepository,
  type PixTransactionRecord
} from '../../../apps/api/src/pix-transaction-repository.ts';

function createRecord(overrides: Partial<PixTransactionRecord> = {}): PixTransactionRecord {
  return {
    transactionId: 'pix_tx_1',
    provider: 'pagarme',
    accountId: 'acc_pix',
    billingRecordId: 'bill_1',
    amount: 180.5,
    currency: 'BRL',
    description: 'Recebimento PIX',
    qrCodePayload: 'payload',
    qrCodeBase64: 'base64',
    expiresAt: '2026-04-19T10:00:00.000Z',
    status: 'pending',
    createdAt: '2026-04-18T10:00:00.000Z',
    updatedAt: '2026-04-18T10:00:00.000Z',
    providerTransactionId: 'provider_tx_1',
    providerConfirmationId: 'provider_conf_1',
    providerWebhookEventId: 'provider_webhook_1',
    completedAt: '2026-04-18T10:30:00.000Z',
    lastProviderSyncAt: '2026-04-18T10:20:00.000Z',
    billingSettlementStatus: 'pending_billing',
    billingSettledAt: '2026-04-18T10:40:00.000Z',
    billingSettlementError: 'billing-timeout',
    cashReconciliationStatus: 'failed',
    cashReconciledAt: '2026-04-18T10:50:00.000Z',
    cashReconciliationError: 'cash-timeout',
    cashRegisterId: 'cash_1',
    cashMovementId: 'movement_1',
    ...overrides
  };
}

function createDbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    transaction_id: 'pix_tx_1',
    provider: 'pagarme',
    account_id: 'acc_pix',
    billing_record_id: 'bill_1',
    amount: '180.5',
    currency: 'BRL',
    description: 'Recebimento PIX',
    qr_code_payload: 'payload',
    qr_code_base64: 'base64',
    expires_at: '2026-04-19T10:00:00.000Z',
    status: 'pending',
    created_at: '2026-04-18T10:00:00.000Z',
    updated_at: '2026-04-18T10:00:00.000Z',
    provider_transaction_id: 'provider_tx_1',
    provider_confirmation_id: 'provider_conf_1',
    provider_webhook_event_id: 'provider_webhook_1',
    completed_at: '2026-04-18T10:30:00.000Z',
    last_provider_sync_at: '2026-04-18T10:20:00.000Z',
    billing_settlement_status: 'pending_billing',
    billing_settled_at: '2026-04-18T10:40:00.000Z',
    billing_settlement_error: 'billing-timeout',
    cash_reconciliation_status: 'failed',
    cash_reconciled_at: '2026-04-18T10:50:00.000Z',
    cash_reconciliation_error: 'cash-timeout',
    cash_register_id: 'cash_1',
    cash_movement_id: 'movement_1',
    ...overrides
  };
}

describe('DatabasePixTransactionRepository coverage guard', () => {
  beforeEach(() => {
    queryMock.mockReset();
    withTenantQueryMock.mockClear();
  });

  it('persists PIX transactions with canonical SQL payloads', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const repository = new DatabasePixTransactionRepository();

    await repository.create(
      createRecord({
        providerTransactionId: undefined,
        providerConfirmationId: undefined,
        providerWebhookEventId: undefined,
        completedAt: undefined,
        lastProviderSyncAt: undefined,
        billingSettledAt: undefined,
        billingSettlementError: undefined,
        cashReconciledAt: undefined,
        cashReconciliationError: undefined,
        cashRegisterId: undefined,
        cashMovementId: undefined
      })
    );

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO pix_transactions'), [
      'pix_tx_1',
      'pagarme',
      'acc_pix',
      'bill_1',
      180.5,
      'BRL',
      'Recebimento PIX',
      'payload',
      'base64',
      new Date('2026-04-19T10:00:00.000Z'),
      'pending',
      new Date('2026-04-18T10:00:00.000Z'),
      new Date('2026-04-18T10:00:00.000Z'),
      null,
      null,
      null,
      null,
      null,
      'pending_billing',
      null,
      null,
      'failed',
      null,
      null,
      null,
      null
    ]);
  });

  it('maps single-record lookups from database rows', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [createDbRow()] })
      .mockResolvedValueOnce({ rows: [createDbRow({ transaction_id: 'pix_tx_2' })] })
      .mockResolvedValueOnce({ rows: [] });

    const repository = new DatabasePixTransactionRepository();

    const byTransactionId = await repository.findByTransactionId('pix_tx_1');
    const byProvider = await repository.findByProviderTransactionId('pagarme', 'provider_tx_1');
    const missing = await repository.findByTransactionId('missing');

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM pix_transactions WHERE transaction_id = $1 LIMIT 1',
      ['pix_tx_1']
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('WHERE provider = $1 AND provider_transaction_id = $2'),
      ['pagarme', 'provider_tx_1']
    );
    expect(byTransactionId).toEqual(expect.objectContaining({ transactionId: 'pix_tx_1', amount: 180.5 }));
    expect(byProvider).toEqual(expect.objectContaining({ transactionId: 'pix_tx_2' }));
    expect(missing).toBeNull();
  });

  it('updates status, billing settlement and cash reconciliation with null-safe mapping', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [createDbRow({ status: 'completed' })] })
      .mockResolvedValueOnce({
        rows: [
          createDbRow({
            billing_settlement_status: 'applied',
            billing_settled_at: '2026-04-18T11:00:00.000Z',
            billing_settlement_error: null
          })
        ]
      })
      .mockResolvedValueOnce({
        rows: [
          createDbRow({
            cash_reconciliation_status: 'applied',
            cash_reconciled_at: '2026-04-18T11:05:00.000Z',
            cash_reconciliation_error: null,
            cash_register_id: 'cash_2',
            cash_movement_id: 'movement_2'
          })
        ]
      })
      .mockResolvedValueOnce({ rows: [] });

    const repository = new DatabasePixTransactionRepository();

    const status = await repository.updateStatus({
      transactionId: 'pix_tx_1',
      status: 'completed',
      providerConfirmationId: 'provider_conf_2',
      providerWebhookEventId: 'webhook_2',
      completedAt: '2026-04-18T11:00:00.000Z',
      lastProviderSyncAt: '2026-04-18T10:59:00.000Z',
      billingSettlementStatus: 'pending_billing'
    });
    const billing = await repository.updateBillingSettlement({
      transactionId: 'pix_tx_1',
      billingSettlementStatus: 'applied',
      billingSettledAt: '2026-04-18T11:00:00.000Z'
    });
    const cash = await repository.updateCashReconciliation({
      transactionId: 'pix_tx_1',
      cashReconciliationStatus: 'applied',
      cashReconciledAt: '2026-04-18T11:05:00.000Z',
      cashRegisterId: 'cash_2',
      cashMovementId: 'movement_2'
    });
    const missing = await repository.updateCashReconciliation({
      transactionId: 'missing',
      cashReconciliationStatus: 'failed'
    });

    expect(status).toEqual(
      expect.objectContaining({
        status: 'completed',
        providerConfirmationId: 'provider_conf_1'
      })
    );
    expect(billing).toEqual(
      expect.objectContaining({
        billingSettlementStatus: 'applied',
        billingSettledAt: '2026-04-18T11:00:00.000Z',
        billingSettlementError: undefined
      })
    );
    expect(cash).toEqual(
      expect.objectContaining({
        cashReconciliationStatus: 'applied',
        cashRegisterId: 'cash_2',
        cashMovementId: 'movement_2',
        cashReconciliationError: undefined
      })
    );
    expect(missing).toBeNull();
  });

  it('lists PIX transactions with dynamic filters and descending ordering', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [createDbRow(), createDbRow({ transaction_id: 'pix_tx_2' })] })
      .mockResolvedValueOnce({ rows: [createDbRow({ transaction_id: 'pix_tx_3', provider: 'local-pix' })] });

    const repository = new DatabasePixTransactionRepository();

    const unfiltered = await repository.list();
    const filtered = await repository.list({
      accountId: 'acc_pix',
      status: 'pending',
      provider: 'local-pix'
    });

    expect(queryMock).toHaveBeenNthCalledWith(
      1,
      'SELECT * FROM pix_transactions  ORDER BY created_at DESC',
      []
    );
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      'SELECT * FROM pix_transactions WHERE account_id = $1 AND status = $2 AND provider = $3 ORDER BY created_at DESC',
      ['acc_pix', 'pending', 'local-pix']
    );
    expect(unfiltered).toHaveLength(2);
    expect(filtered).toEqual([expect.objectContaining({ transactionId: 'pix_tx_3', provider: 'local-pix' })]);
  });
});
