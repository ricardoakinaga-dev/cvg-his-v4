import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';

import { PaymentsEventHandlers } from './payments.consumer.js';

const ACCOUNT_ID = 'account-test';
const BILLING_ID = 'billing-test';
const INTENT_ID = 'card-test';
const COMPLETED_AT = '2026-09-16T18:00:00.000Z';

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

function cardRecord(overrides: Record<string, unknown> = {}) {
  return {
    transactionId: INTENT_ID,
    accountId: ACCOUNT_ID,
    billingRecordId: BILLING_ID,
    amount: 125,
    currency: 'BRL',
    provider: 'local-card',
    status: 'authorized_pending_capture',
    providerOrderId: 'order-original',
    providerChargeId: 'charge-original',
    providerAuthorizationCode: 'auth-original',
    providerReferenceId: 'reference-original',
    billingSettlementStatus: 'pending_billing',
    ...overrides
  };
}

function cardIntentPayload(overrides: Record<string, unknown> = {}) {
  return {
    accountId: ACCOUNT_ID,
    intentId: INTENT_ID,
    billingRecordId: BILLING_ID,
    amount: 125,
    currency: 'BRL',
    provider: 'local-card',
    status: 'authorized_pending_capture',
    createdAt: COMPLETED_AT,
    ...overrides
  };
}

function cardCompletedPayload(overrides: Record<string, unknown> = {}) {
  return {
    accountId: ACCOUNT_ID,
    intentId: INTENT_ID,
    billingRecordId: BILLING_ID,
    completedAt: COMPLETED_AT,
    ...overrides
  };
}

function cardFailedPayload(overrides: Record<string, unknown> = {}) {
  return {
    accountId: ACCOUNT_ID,
    intentId: INTENT_ID,
    billingRecordId: BILLING_ID,
    failedAt: COMPLETED_AT,
    failureReason: 'provider declined',
    ...overrides
  };
}

function createHarness(options: {
  transaction?: Record<string, unknown> | null;
  billingRecord?: Record<string, unknown> | undefined;
  payments?: readonly Record<string, unknown>[];
} = {}) {
  const currentTransaction = options.transaction === undefined ? cardRecord() : options.transaction;
  const billingRecord = options.billingRecord === undefined
    ? {
        id: BILLING_ID,
        accountId: ACCOUNT_ID,
        encounterId: 'encounter-test',
        currency: 'BRL',
        subtotalAmount: 125
      }
    : options.billingRecord;
  const billing = {
    getOrThrow: vi.fn(() => billingRecord),
    settleByRecordId: vi.fn(async () => undefined)
  };
  const encounterFinancial = {
    getSummary: vi.fn(async () => ({ payments: options.payments ?? [] })),
    recordPaymentForBillingRecord: vi.fn(async () => undefined)
  };
  const cardTransactions = {
    findByTransactionId: vi.fn(async () => currentTransaction),
    create: vi.fn(async (value) => value),
    updateStatus: vi.fn(async () => currentTransaction),
    updateBillingSettlement: vi.fn(async () => currentTransaction)
  };
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions: {} as never,
    cardTransactions
  } as never);
  return { billing, billingRecord, cardTransactions, encounterFinancial, handlers };
}

beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('PaymentsEventHandlers card intent contract', () => {
  it('skips an already-authoritative card intent', async () => {
    const harness = createHarness();
    await harness.handlers.handle(
      outboxEvent('payment.card.intent.created', cardIntentPayload())
    );
    expect(harness.cardTransactions.create).not.toHaveBeenCalled();
  });

  it.each([
    ['pagarme-card', 'captured', 'captured', 'pending_billing'],
    ['local-card', 'authorized_pending_capture', 'authorized_pending_capture', 'awaiting_capture'],
    ['unsupported', 'not_authorized', 'not_authorized', 'failed'],
    ['local-card', 'failed', 'failed', 'failed'],
    ['local-card', 'voided', 'voided', 'failed'],
    ['local-card', 'unknown', 'pending', 'failed']
  ])('normalizes provider/status and settlement state for %s/%s', async (
    provider,
    status,
    normalizedStatus,
    settlementStatus
  ) => {
    const harness = createHarness({ transaction: null });
    await harness.handlers.handle(
      outboxEvent('payment.card.intent.created', cardIntentPayload({
        provider,
        status,
        currency: 'USD',
        installments: 0,
        description: 'card description',
        card: { holderName: 'A User', brand: 'visa', last4: '1234' },
        providerOrderId: 'order-1',
        providerChargeId: 'charge-1',
        providerAuthorizationCode: 'auth-1',
        providerReferenceId: 'reference-1'
      }))
    );

    expect(harness.cardTransactions.create).toHaveBeenCalledWith(expect.objectContaining({
      provider: provider === 'pagarme-card' ? 'pagarme-card' : 'local-card',
      status: normalizedStatus,
      billingSettlementStatus: settlementStatus,
      currency: 'BRL',
      installments: 1,
      description: 'card description',
      cardHolderName: 'A User',
      cardLast4: '1234'
    }));
  });

  it('handles a card intent without billing, optional fields or a createdAt value', async () => {
    const harness = createHarness({ transaction: null });
    await harness.handlers.handle(
      outboxEvent('payment.card.intent.created', cardIntentPayload({
        billingRecordId: undefined,
        createdAt: undefined,
        installments: undefined,
        card: undefined,
        description: undefined
      }))
    );
    expect(harness.cardTransactions.create).toHaveBeenCalledWith(expect.objectContaining({
      installments: 1,
      description: `Card payment ${INTENT_ID}`,
      billingSettlementStatus: 'not_applicable'
    }));
    const created = harness.cardTransactions.create.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(created.createdAt).toEqual(created.updatedAt);
    expect(created.cardHolderName).toBeUndefined();
  });
});

describe('PaymentsEventHandlers card completion contract', () => {
  it('wraps authoritative lookup and billing lookup failures with their original cause', async () => {
    const lookupFailure = createHarness();
    lookupFailure.cardTransactions.findByTransactionId.mockRejectedValueOnce(new Error('db down'));
    await expect(
      lookupFailure.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toMatchObject({ message: expect.stringContaining('db down') });

    const nonErrorLookup = createHarness();
    nonErrorLookup.cardTransactions.findByTransactionId.mockRejectedValueOnce('unavailable');
    await expect(
      nonErrorLookup.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toMatchObject({ message: expect.stringContaining('unavailable') });

    const missing = createHarness({ transaction: null });
    await expect(
      missing.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toThrow('has no authoritative transaction intent');

    const billingFailure = createHarness();
    billingFailure.billing.getOrThrow.mockImplementationOnce(() => {
      throw new Error('billing unavailable');
    });
    await expect(
      billingFailure.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toMatchObject({ message: expect.stringContaining('billing unavailable') });

    const nonErrorBilling = createHarness();
    nonErrorBilling.billing.getOrThrow.mockImplementationOnce(() => {
      throw 'billing failed';
    });
    await expect(
      nonErrorBilling.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toMatchObject({ message: expect.stringContaining('billing failed') });
  });

  it('rejects account, billing identity, currency and amount mismatches', async () => {
    const transactionAccount = createHarness({ transaction: cardRecord({ accountId: 'other-account' }) });
    await expect(
      transactionAccount.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toThrow('billing account');

    const eventAccount = createHarness();
    await expect(
      eventAccount.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload(), 'other-account'))
    ).rejects.toThrow('billing account');

    const billingIdMismatch = createHarness();
    await expect(
      billingIdMismatch.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload({ billingRecordId: 'other-billing' })))
    ).rejects.toThrow('billing record account');

    const billingOwnerMismatch = createHarness({ billingRecord: {
      id: BILLING_ID,
      accountId: 'other-account',
      encounterId: 'encounter-test',
      currency: 'BRL',
      subtotalAmount: 125
    } });
    await expect(
      billingOwnerMismatch.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toThrow('billing record account');

    const currencyMismatch = createHarness({ billingRecord: {
      id: BILLING_ID,
      accountId: ACCOUNT_ID,
      encounterId: 'encounter-test',
      currency: 'USD',
      subtotalAmount: 125
    } });
    await expect(
      currencyMismatch.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toThrow('amount does not match');

    const amountMismatch = createHarness({ billingRecord: {
      id: BILLING_ID,
      accountId: ACCOUNT_ID,
      encounterId: 'encounter-test',
      currency: 'BRL',
      subtotalAmount: 126
    } });
    await expect(
      amountMismatch.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toThrow('amount does not match');
  });

  it('completes no-billing, applied, zero-value and receivable-linked transactions safely', async () => {
    const noBilling = createHarness({ transaction: cardRecord({ billingRecordId: undefined }) });
    await noBilling.handlers.handle(
      outboxEvent('payment.card.completed', cardCompletedPayload({ billingRecordId: undefined, capturedAt: COMPLETED_AT }))
    );
    expect(noBilling.billing.getOrThrow).not.toHaveBeenCalled();
    expect(noBilling.cardTransactions.updateBillingSettlement).toHaveBeenCalledWith(expect.objectContaining({
      billingSettlementStatus: 'not_applicable'
    }));

    const applied = createHarness({ transaction: cardRecord({ billingSettlementStatus: 'applied' }) });
    applied.cardTransactions.updateStatus.mockResolvedValueOnce(cardRecord({ billingSettlementStatus: 'applied' }));
    await applied.handlers.handle(
      outboxEvent('payment.card.completed', cardCompletedPayload({ capturedAt: undefined }))
    );
    expect(applied.billing.settleByRecordId).not.toHaveBeenCalled();

    const zero = createHarness({
      transaction: cardRecord({ amount: 0 }),
      billingRecord: {
        id: BILLING_ID,
        accountId: ACCOUNT_ID,
        encounterId: 'encounter-test',
        currency: 'BRL',
        subtotalAmount: 0
      }
    });
    await zero.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()));
    expect(zero.encounterFinancial.recordPaymentForBillingRecord).not.toHaveBeenCalled();

    const linked = createHarness({ payments: [{ externalReferenceType: 'other', externalReferenceId: INTENT_ID }] });
    await linked.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload({ completedAt: undefined })));
    expect(linked.billing.settleByRecordId).toHaveBeenCalledWith(ACCOUNT_ID, BILLING_ID);
    expect(linked.encounterFinancial.recordPaymentForBillingRecord).not.toHaveBeenCalled();
    expect(linked.cardTransactions.updateBillingSettlement).toHaveBeenCalledWith(expect.objectContaining({
      billingSettlementStatus: 'applied'
    }));
  });

  it('uses fallback provider fields and wraps capture/settlement failures without masking them', async () => {
    const captureError = createHarness();
    captureError.cardTransactions.updateStatus.mockRejectedValueOnce(new Error('capture failed'));
    await expect(
      captureError.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload({
        providerOrderId: undefined,
        providerChargeId: undefined,
        providerAuthorizationCode: undefined,
        providerReferenceId: undefined
      })))
    ).rejects.toMatchObject({ message: expect.stringContaining('capture failed') });

    const nonErrorCapture = createHarness();
    nonErrorCapture.cardTransactions.updateStatus.mockRejectedValueOnce('capture unavailable');
    await expect(
      nonErrorCapture.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toMatchObject({ message: expect.stringContaining('capture unavailable') });

    const settlementError = createHarness();
    settlementError.billing.settleByRecordId.mockRejectedValueOnce(new Error('settlement failed'));
    await expect(
      settlementError.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toThrow('settlement failed');
    expect(settlementError.cardTransactions.updateBillingSettlement).toHaveBeenCalledWith(expect.objectContaining({
      billingSettlementStatus: 'failed',
      billingSettlementError: 'settlement failed'
    }));

    const markerFailure = createHarness();
    markerFailure.billing.settleByRecordId.mockRejectedValueOnce('settlement unavailable');
    markerFailure.cardTransactions.updateBillingSettlement.mockRejectedValueOnce(new Error('aborted'));
    await expect(
      markerFailure.handlers.handle(outboxEvent('payment.card.completed', cardCompletedPayload()))
    ).rejects.toBe('settlement unavailable');
  });
});

describe('PaymentsEventHandlers card failure contract', () => {
  it('creates a failed placeholder from a provider failure and updates existing attempts', async () => {
    const created = createHarness({ transaction: null });
    await created.handlers.handle(outboxEvent('payment.card.failed', cardFailedPayload({
      billingRecordId: undefined,
      provider: undefined,
      failedAt: undefined
    })));
    expect(created.cardTransactions.create).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'local-card',
      amount: 0,
      status: 'failed',
      billingSettlementStatus: 'not_applicable'
    }));

    const existing = createHarness();
    await existing.handlers.handle(outboxEvent('payment.card.failed', cardFailedPayload({
      provider: 'pagarme-card',
      providerOrderId: undefined,
      providerChargeId: undefined,
      providerAuthorizationCode: undefined,
      providerReferenceId: undefined
    })));
    expect(existing.cardTransactions.updateStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: 'failed',
      providerOrderId: 'order-original',
      providerReferenceId: 'reference-original',
      billingSettlementStatus: 'failed'
    }));
    expect(existing.cardTransactions.updateBillingSettlement).toHaveBeenCalledWith(expect.objectContaining({
      billingSettlementStatus: 'failed',
      billingSettlementError: 'provider declined'
    }));
  });
});
