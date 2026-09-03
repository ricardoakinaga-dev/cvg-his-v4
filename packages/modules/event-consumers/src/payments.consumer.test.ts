import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';

import { PaymentsEventHandlers } from './payments.consumer.js';

const ACCOUNT_ID = 'account-test';
const BILLING_ID = 'billing-test';
const INTENT_ID = 'pix-test';
const COMPLETED_AT = '2026-09-02T18:00:00.000Z';

const PIX_TRANSACTION = {
  transactionId: INTENT_ID,
  accountId: ACCOUNT_ID,
  billingRecordId: BILLING_ID,
  amount: 125,
  currency: 'BRL',
  providerTransactionId: 'provider-original',
  billingSettlementStatus: 'pending_billing'
};

function outboxEvent(
  eventType: string,
  payload: Record<string, unknown>,
  accountId = ACCOUNT_ID
): OutboxEvent {
  return {
    id: `event-${eventType}`,
    accountId: accountId as never,
    correlationId: 'correlation-test' as never,
    moduleName: 'payments' as never,
    eventType,
    payload,
    status: 'pending',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: COMPLETED_AT,
    processedAt: null,
    error: null,
    createdAt: COMPLETED_AT
  };
}

function pixConfirmedPayload(overrides: Record<string, unknown> = {}) {
  return {
    accountId: ACCOUNT_ID,
    intentId: INTENT_ID,
    billingRecordId: BILLING_ID,
    status: 'completed',
    completedAt: COMPLETED_AT,
    ...overrides
  };
}

function createHarness(transaction: Record<string, unknown> | null = PIX_TRANSACTION) {
  const billingRecord = {
    id: BILLING_ID,
    accountId: ACCOUNT_ID,
    encounterId: 'encounter-test',
    currency: 'BRL',
    subtotalAmount: 125
  };
  const billing = {
    getOrThrow: vi.fn(() => billingRecord),
    settleByRecordId: vi.fn(async () => undefined)
  };
  const encounterFinancial = {
    getSummary: vi.fn(async () => ({ payments: [] })),
    recordPaymentForBillingRecord: vi.fn(async () => undefined)
  };
  const pixTransactions = {
    findByTransactionId: vi.fn(async () => transaction),
    create: vi.fn(async (input) => input),
    updateStatus: vi.fn(async () => transaction),
    updateBillingSettlement: vi.fn(async () => transaction),
    updateCashReconciliation: vi.fn(async () => transaction)
  };
  const cardTransactions = {
    findByTransactionId: vi.fn(async () => null),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateBillingSettlement: vi.fn()
  };
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  } as never);

  return {
    billing,
    billingRecord,
    cardTransactions,
    encounterFinancial,
    handlers,
    pixTransactions
  };
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('PaymentsEventHandlers PIX contract', () => {
  it('dispatches through the adapter and ignores unknown events', async () => {
    const harness = createHarness();

    await harness.handlers.handlers(outboxEvent('unknown.event', {}));

    expect(harness.pixTransactions.findByTransactionId).not.toHaveBeenCalled();
  });

  it('creates a normalized completed PIX intent once and leaves a replay untouched', async () => {
    const harness = createHarness();
    harness.pixTransactions.findByTransactionId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(PIX_TRANSACTION);
    const event = outboxEvent('payment.pix.intent.created', {
      accountId: ACCOUNT_ID,
      intentId: INTENT_ID,
      billingRecordId: BILLING_ID,
      amount: 125,
      currency: 'USD',
      provider: 'unsupported-provider',
      status: 'completed',
      expiresAt: '2026-09-02T18:05:00.000Z'
    });

    await harness.handlers.handle(event);
    await harness.handlers.handle(event);

    expect(harness.pixTransactions.create).toHaveBeenCalledOnce();
    expect(harness.pixTransactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'local-pix',
        currency: 'BRL',
        description: `PIX payment ${INTENT_ID}`,
        qrCodePayload: '',
        qrCodeBase64: '',
        status: 'completed',
        billingSettlementStatus: 'pending_billing'
      })
    );
  });

  it('creates a pending intent with explicit optional data and no billing link', async () => {
    const harness = createHarness(null);

    await harness.handlers.handle(
      outboxEvent('payment.pix.intent.created', {
        accountId: ACCOUNT_ID,
        intentId: INTENT_ID,
        amount: 10,
        currency: 'BRL',
        provider: 'mock',
        status: 'pending',
        expiresAt: '2026-09-02T18:05:00.000Z',
        createdAt: COMPLETED_AT,
        description: 'explicit description',
        qrCodePayload: 'copy-and-paste',
        qrCodeBase64: 'image'
      })
    );

    expect(harness.pixTransactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'mock',
        status: 'pending',
        billingSettlementStatus: 'not_applicable'
      })
    );
  });

  it('rejects a confirmation without an authoritative intent', async () => {
    const harness = createHarness(null);

    await expect(
      harness.handlers.handle(outboxEvent('payment.pix.confirmed', pixConfirmedPayload()))
    ).rejects.toThrow('has no authoritative PIX transaction intent');
  });

  it('rejects attempt-linked, cross-account, mismatched and incomplete confirmations', async () => {
    const attemptLinked = createHarness({ ...PIX_TRANSACTION, paymentAttemptId: 'attempt-test' });
    await expect(
      attemptLinked.handlers.handle(
        outboxEvent('payment.pix.confirmed', pixConfirmedPayload())
      )
    ).rejects.toThrow('attempt-linked');

    const crossAccount = createHarness();
    await expect(
      crossAccount.handlers.handle(
        outboxEvent('payment.pix.confirmed', pixConfirmedPayload(), 'other-account')
      )
    ).rejects.toThrow('does not match the event');

    const wrongBilling = createHarness();
    await expect(
      wrongBilling.handlers.handle(
        outboxEvent(
          'payment.pix.confirmed',
          pixConfirmedPayload({ billingRecordId: 'other-billing' })
        )
      )
    ).rejects.toThrow('does not match the event');

    const rejectedStatus = createHarness();
    await expect(
      rejectedStatus.handlers.handle(
        outboxEvent('payment.pix.confirmed', pixConfirmedPayload({ status: 'failed' }))
      )
    ).rejects.toThrow('status is not completed');
  });

  it('rejects billing ownership, value and missing-update violations', async () => {
    const wrongOwner = createHarness();
    wrongOwner.billing.getOrThrow.mockReturnValue({
      ...wrongOwner.billingRecord,
      accountId: 'other-account'
    });
    await expect(
      wrongOwner.handlers.handle(outboxEvent('payment.pix.confirmed', pixConfirmedPayload()))
    ).rejects.toThrow('does not match the billing account');

    const wrongAmount = createHarness();
    wrongAmount.billing.getOrThrow.mockReturnValue({
      ...wrongAmount.billingRecord,
      subtotalAmount: 126
    });
    await expect(
      wrongAmount.handlers.handle(outboxEvent('payment.pix.confirmed', pixConfirmedPayload()))
    ).rejects.toThrow('amount does not match');

    const missingUpdate = createHarness();
    missingUpdate.pixTransactions.updateStatus.mockResolvedValue(null);
    await expect(
      missingUpdate.handlers.handle(outboxEvent('payment.pix.confirmed', pixConfirmedPayload()))
    ).rejects.toThrow('could not mark its authoritative transaction as completed');
  });

  it('completes a PIX without billing and marks cash reconciliation as skipped', async () => {
    const transaction = { ...PIX_TRANSACTION, billingRecordId: undefined };
    const harness = createHarness(transaction);

    await harness.handlers.handle(
      outboxEvent(
        'payment.pix.confirmed',
        pixConfirmedPayload({
          billingRecordId: undefined,
          completedAt: undefined,
          confirmedAt: COMPLETED_AT
        })
      )
    );

    expect(harness.billing.settleByRecordId).not.toHaveBeenCalled();
    expect(harness.pixTransactions.updateCashReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ cashReconciliationStatus: 'skipped_no_open_register' })
    );
  });

  it('does not settle a billing record twice', async () => {
    const harness = createHarness({ ...PIX_TRANSACTION, billingSettlementStatus: 'applied' });

    await harness.handlers.handle(
      outboxEvent('payment.pix.confirmed', pixConfirmedPayload({ status: undefined }))
    );

    expect(harness.billing.settleByRecordId).not.toHaveBeenCalled();
    expect(harness.pixTransactions.updateCashReconciliation).toHaveBeenCalledOnce();
  });

  it('settles billing, records the receivable payment and marks both outcomes', async () => {
    const harness = createHarness();

    await harness.handlers.handle(outboxEvent('payment.pix.confirmed', pixConfirmedPayload({
      providerTransactionId: 'provider-new',
      providerConfirmationId: undefined
    })));

    expect(harness.billing.settleByRecordId).toHaveBeenCalledWith(ACCOUNT_ID, BILLING_ID);
    expect(harness.encounterFinancial.recordPaymentForBillingRecord).toHaveBeenCalledWith(
      ACCOUNT_ID,
      BILLING_ID,
      expect.objectContaining({
        amountPaid: 125,
        externalReferenceType: 'pix_transaction',
        externalReferenceId: INTENT_ID
      })
    );
    expect(harness.pixTransactions.updateBillingSettlement).toHaveBeenCalledWith(
      expect.objectContaining({ billingSettlementStatus: 'applied' })
    );
    expect(harness.pixTransactions.updateCashReconciliation).toHaveBeenCalledWith(
      expect.objectContaining({ cashReconciliationStatus: 'skipped_no_open_register' })
    );
  });

  it('preserves a settlement error even when the failure marker also fails', async () => {
    const harness = createHarness();
    harness.billing.settleByRecordId.mockRejectedValue('settlement unavailable');
    harness.pixTransactions.updateBillingSettlement.mockRejectedValue(
      new Error('transaction already aborted')
    );

    await expect(
      harness.handlers.handle(outboxEvent('payment.pix.confirmed', pixConfirmedPayload()))
    ).rejects.toBe('settlement unavailable');

    expect(harness.pixTransactions.updateBillingSettlement).toHaveBeenCalledWith(
      expect.objectContaining({
        billingSettlementStatus: 'failed',
        billingSettlementError: 'settlement unavailable'
      })
    );
  });
});
