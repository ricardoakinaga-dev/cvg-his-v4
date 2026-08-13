import assert from 'node:assert/strict';
import test from 'node:test';

import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';

import {
  InMemoryPixTransactionRepository,
  type PixTransactionRepository
} from '../pix-transaction-repository.js';
import { InMemoryCardTransactionRepository } from '../card-transaction-repository.js';
import { PaymentsEventHandlers } from './payments.consumer.js';

function createMockBillingService() {
  const settles: string[] = [];
  return Object.assign(
    {
      async settleByRecordId(recordId: never): Promise<never> {
        settles.push(recordId as string);
        return { id: recordId, status: 'settled' } as never;
      },
      getOrThrow(recordId: never): never {
        return { id: recordId, encounterId: 'enc_test_1' } as never;
      }
    },
    { settles }
  ) as unknown as BillingService & { settles: string[] };
}

function createMockEncounterFinancialService() {
  const payments: Array<{
    billingRecordId: string;
    amountPaid: number;
    transactionId?: string;
    externalReferenceType?: string | null;
  }> = [];
  return Object.assign(
    {
      async recordPaymentForBillingRecord(
        billingRecordId: never,
        input: {
          amountPaid: number;
          externalReferenceId?: string | null;
          externalReferenceType?: string | null;
        }
      ): Promise<never> {
        payments.push({
          billingRecordId: billingRecordId as string,
          amountPaid: input.amountPaid,
          transactionId: input.externalReferenceId ?? undefined,
          externalReferenceType: input.externalReferenceType ?? undefined
        });
        return {} as never;
      },
      async getSummary(): Promise<never> {
        return {
          payments: payments.map((payment, index) => ({
            id: `erp_${index}`,
            receivableId: `er_${index}`,
            financialAccountId: 'efa_test',
            encounterId: 'enc_test_1',
            amountPaid: payment.amountPaid,
            paidAt: new Date().toISOString(),
            paidByUserId: null,
            externalReferenceType: payment.externalReferenceType ?? 'pix_transaction',
            externalReferenceId: payment.transactionId,
            notes: null
          }))
        } as never;
      }
    },
    { payments }
  ) as unknown as EncounterFinancialService & {
    payments: Array<{
      billingRecordId: string;
      amountPaid: number;
      transactionId?: string;
      externalReferenceType?: string | null;
    }>;
  };
}

function makePixConfirmedEvent(billingRecordId: string): OutboxEvent {
  return {
    id: 'evt_123',
    correlationId: 'corr_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.pix.confirmed',
    payload: {
      accountId: 'acc_test',
      intentId: 'pix_intent_1',
      billingRecordId,
      providerTransactionId: 'provider_tx_1',
      providerConfirmationId: 'provider_tx_1',
      status: 'completed',
      completedAt: new Date().toISOString()
    },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;
}

function makePixIntentCreatedEvent(intentId = 'pix_intent_1', billingRecordId?: string): OutboxEvent {
  return {
    id: 'evt_pix_001',
    correlationId: 'corr_pix_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.pix.intent.created',
    payload: {
      accountId: 'acc_test',
      intentId,
      billingRecordId,
      amount: 150,
      currency: 'BRL',
      description: 'PIX Consulta',
      provider: 'local-pix',
      qrCodePayload: 'pix|acc_test|150',
      qrCodeBase64: 'cGl4fGFjY190ZXN0fDE1MA==',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;
}

function makeCardIntentCreatedEvent(intentId = 'card_intent_1', billingRecordId?: string): OutboxEvent {
  return {
    id: 'evt_card_001',
    correlationId: 'corr_card_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.card.intent.created',
    payload: {
      accountId: 'acc_test',
      intentId,
      billingRecordId,
      amount: 320,
      currency: 'BRL',
      description: 'Cartao Internacao',
      provider: 'local-card',
      installments: 2,
      status: 'authorized_pending_capture',
      card: {
        holderName: 'Maria Silva',
        brand: 'visa',
        last4: '4242'
      },
      providerOrderId: `order_${intentId}`,
      providerChargeId: `charge_${intentId}`,
      createdAt: new Date().toISOString()
    },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;
}

function makeCardCompletedEvent(billingRecordId: string): OutboxEvent {
  return {
    id: 'evt_card_complete_001',
    correlationId: 'corr_card_complete_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.card.completed',
    payload: {
      accountId: 'acc_test',
      intentId: 'card_intent_1',
      billingRecordId,
      provider: 'local-card',
      providerOrderId: 'order_card_intent_1',
      providerChargeId: 'charge_card_intent_1',
      providerAuthorizationCode: 'auth_123',
      providerReferenceId: 'ref_123',
      status: 'captured',
      capturedAt: new Date().toISOString()
    },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;
}

async function seedPixTransaction(
  repository: PixTransactionRepository,
  transactionId = 'pix_intent_1',
  billingRecordId = 'br_test_123'
) {
  await repository.create({
    transactionId,
    provider: 'local-pix',
    accountId: 'acc_test',
    billingRecordId,
    amount: 150,
    currency: 'BRL',
    description: 'PIX Consulta',
    qrCodePayload: 'pix|acc_test|150',
    qrCodeBase64: 'cGl4fGFjY190ZXN0fDE1MA==',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    billingSettlementStatus: 'awaiting_payment',
    cashReconciliationStatus: 'pending'
  });
}

test('PaymentsEventHandlers handles payment.pix.confirmed and settles billing record', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  await seedPixTransaction(pixTransactions);
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  const event = makePixConfirmedEvent('br_test_123');
  await handlers.handle(event);

  assert.equal(billing.settles.length, 1);
  assert.equal(billing.settles[0], 'br_test_123');
  assert.equal(encounterFinancial.payments.length, 1);
  assert.equal(encounterFinancial.payments[0]?.amountPaid, 150);
  assert.equal(encounterFinancial.payments[0]?.transactionId, 'pix_intent_1');

  const transaction = await pixTransactions.findByTransactionId('pix_intent_1');
  assert.equal(transaction?.status, 'completed');
  assert.equal(transaction?.billingSettlementStatus, 'applied');
  assert.equal(transaction?.cashReconciliationStatus, 'skipped_no_open_register');
});

test('PaymentsEventHandlers handles payment.pix.confirmed without billingRecordId (no-op)', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  await seedPixTransaction(pixTransactions, 'pix_intent_no_billing', undefined);
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  const event = makePixConfirmedEvent('') as OutboxEvent;
  (event.payload as { billingRecordId?: string }).billingRecordId = undefined;
  (event.payload as { intentId: string }).intentId = 'pix_intent_no_billing';

  await handlers.handle(event);

  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
  const transaction = await pixTransactions.findByTransactionId('pix_intent_no_billing');
  assert.equal(transaction?.status, 'completed');
  assert.equal(transaction?.billingSettlementStatus, 'not_applicable');
});

test('PaymentsEventHandlers ignores billing.status_changed events (no-op)', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  const event: OutboxEvent = {
    id: 'evt_456',
    correlationId: 'corr_xyz' as never,
    moduleName: 'billing' as never,
    eventType: 'billing.status_changed',
    payload: { recordId: 'br_789' },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;

  await handlers.handle(event);

  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers persists PIX intent creation without error', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  const event = makePixIntentCreatedEvent('pix_intent_new', 'br_new_456');
  await handlers.handle(event);

  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
  const transaction = await pixTransactions.findByTransactionId('pix_intent_new');
  assert.equal(transaction?.amount, 150);
  assert.equal(transaction?.billingSettlementStatus, 'awaiting_payment');
});

test('PaymentsEventHandlers persists card intent creation and settles billing on capture', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  await handlers.handle(makeCardIntentCreatedEvent('card_intent_1', 'br_card_456'));
  const created = await cardTransactions.findByTransactionId('card_intent_1');
  assert.equal(created?.status, 'authorized_pending_capture');
  assert.equal(created?.billingSettlementStatus, 'awaiting_capture');

  await handlers.handle(makeCardCompletedEvent('br_card_456'));

  assert.equal(billing.settles.includes('br_card_456'), true);
  assert.equal(encounterFinancial.payments.length, 1);
  assert.equal(encounterFinancial.payments[0]?.transactionId, 'card_intent_1');
  assert.equal(encounterFinancial.payments[0]?.externalReferenceType, 'other');

  const captured = await cardTransactions.findByTransactionId('card_intent_1');
  assert.equal(captured?.status, 'captured');
  assert.equal(captured?.billingSettlementStatus, 'applied');
});

test('PaymentsEventHandlers normalizes PIX intent defaults, completion and duplicate delivery', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions });
  const event = makePixIntentCreatedEvent('pix_normalized');
  Object.assign(event.payload as Record<string, unknown>, {
    provider: 'unsupported',
    currency: 'USD',
    status: 'completed',
    createdAt: undefined,
    description: undefined,
    qrCodePayload: undefined,
    qrCodeBase64: undefined
  });

  await handlers.handlers(event);
  await handlers.handle(event);

  const transaction = await pixTransactions.findByTransactionId('pix_normalized');
  assert.equal(transaction?.provider, 'local-pix');
  assert.equal(transaction?.currency, 'BRL');
  assert.equal(transaction?.status, 'completed');
  assert.equal(transaction?.description, 'PIX payment pix_normalized');
  assert.equal(transaction?.qrCodePayload, '');
  assert.equal(transaction?.qrCodeBase64, '');
  assert.equal(transaction?.billingSettlementStatus, 'not_applicable');
  assert.equal((await pixTransactions.list({ accountId: 'acc_test' })).length, 1);
});

test('PaymentsEventHandlers creates a missing PIX confirmation and keeps settlement idempotent', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions });
  const event = makePixConfirmedEvent('br_missing_intent');
  Object.assign(event.payload as Record<string, unknown>, {
    intentId: 'pix_missing_intent',
    completedAt: undefined,
    confirmedAt: '2026-08-12T10:00:00.000Z',
    providerConfirmationId: undefined
  });

  await handlers.handle(event);
  await handlers.handle(event);

  const transaction = await pixTransactions.findByTransactionId('pix_missing_intent');
  assert.equal(transaction?.status, 'completed');
  assert.equal(transaction?.providerConfirmationId, 'provider_tx_1');
  assert.equal(transaction?.billingSettlementStatus, 'applied');
  assert.equal(billing.settles.length, 1);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers records PIX settlement failures and propagates retryable errors', async () => {
  const billing = createMockBillingService();
  billing.settleByRecordId = async () => {
    throw new Error('billing temporarily unavailable');
  };
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  await seedPixTransaction(pixTransactions, 'pix_failure', 'br_failure');
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions });
  const event = makePixConfirmedEvent('br_failure');
  (event.payload as { intentId: string }).intentId = 'pix_failure';

  await assert.rejects(handlers.handle(event), /billing temporarily unavailable/);
  const transaction = await pixTransactions.findByTransactionId('pix_failure');
  assert.equal(transaction?.billingSettlementStatus, 'failed');
  assert.equal(transaction?.billingSettlementError, 'billing temporarily unavailable');
});

test('PaymentsEventHandlers normalizes every card intent status and provider without duplicating intents', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions });
  const cases = [
    ['captured', 'pagarme-card', 'pending_billing'],
    ['not_authorized', 'unsupported', 'failed'],
    ['failed', 'local-card', 'failed'],
    ['voided', 'local-card', 'failed'],
    ['unknown', 'local-card', 'failed']
  ] as const;

  for (const [status, provider, billingStatus] of cases) {
    const intentId = `card_${status}`;
    const event = makeCardIntentCreatedEvent(intentId, `br_${status}`);
    Object.assign(event.payload as Record<string, unknown>, {
      status,
      provider,
      currency: 'USD',
      createdAt: undefined,
      description: undefined,
      installments: 0,
      card: undefined
    });
    await handlers.handle(event);
    await handlers.handle(event);
    const transaction = await cardTransactions.findByTransactionId(intentId);
    assert.equal(transaction?.provider, provider === 'pagarme-card' ? 'pagarme-card' : 'local-card');
    assert.equal(transaction?.currency, 'BRL');
    assert.equal(transaction?.status, status === 'unknown' ? 'pending' : status);
    assert.equal(transaction?.billingSettlementStatus, billingStatus);
    assert.equal(transaction?.installments, 1);
    assert.equal(transaction?.description, `Card payment ${intentId}`);
    assert.equal(transaction?.capturedAt === undefined, status !== 'captured');
  }
});

test('PaymentsEventHandlers handles card completion without prior intent, billing or duplicate settlement', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions });
  const withoutBilling = makeCardCompletedEvent('');
  Object.assign(withoutBilling.payload as Record<string, unknown>, {
    intentId: 'card_without_billing',
    billingRecordId: undefined,
    provider: 'unsupported',
    capturedAt: undefined,
    completedAt: '2026-08-12T11:00:00.000Z'
  });
  await handlers.handle(withoutBilling);
  const noBilling = await cardTransactions.findByTransactionId('card_without_billing');
  assert.equal(noBilling?.provider, 'local-card');
  assert.equal(noBilling?.billingSettlementStatus, 'not_applicable');

  const appliedIntent = makeCardIntentCreatedEvent('card_applied', 'br_applied');
  Object.assign(appliedIntent.payload as Record<string, unknown>, { status: 'captured' });
  await handlers.handle(appliedIntent);
  await cardTransactions.updateBillingSettlement({
    transactionId: 'card_applied',
    billingSettlementStatus: 'applied',
    billingSettledAt: '2026-08-12T11:00:00.000Z',
    updatedAt: '2026-08-12T11:00:00.000Z'
  });
  const completed = makeCardCompletedEvent('br_applied');
  (completed.payload as { intentId: string }).intentId = 'card_applied';
  await handlers.handle(completed);
  assert.equal(billing.settles.length, 0);
});

test('PaymentsEventHandlers records card settlement failure and card failure lifecycle', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions, cardTransactions });
  await handlers.handle(makeCardIntentCreatedEvent('card_settlement_failure', 'br_card_failure'));
  billing.settleByRecordId = async () => {
    throw 'gateway offline';
  };
  const completion = makeCardCompletedEvent('br_card_failure');
  (completion.payload as { intentId: string }).intentId = 'card_settlement_failure';
  await assert.rejects(handlers.handle(completion), (error) => error === 'gateway offline');
  const settlementFailure = await cardTransactions.findByTransactionId('card_settlement_failure');
  assert.equal(settlementFailure?.billingSettlementStatus, 'failed');
  assert.equal(settlementFailure?.billingSettlementError, 'gateway offline');

  const newFailure = {
    ...makeCardCompletedEvent(''),
    eventType: 'payment.card.failed',
    payload: {
      accountId: 'acc_test',
      intentId: 'card_new_failure',
      provider: 'unsupported',
      status: 'failed',
      failureReason: 'not authorized',
      failedAt: '2026-08-12T12:00:00.000Z'
    }
  } as OutboxEvent;
  await handlers.handle(newFailure);
  const createdFailure = await cardTransactions.findByTransactionId('card_new_failure');
  assert.equal(createdFailure?.provider, 'local-card');
  assert.equal(createdFailure?.status, 'failed');
  assert.equal(createdFailure?.billingSettlementStatus, 'not_applicable');

  const existingIntent = makeCardIntentCreatedEvent('card_existing_failure', 'br_existing_failure');
  await handlers.handle(existingIntent);
  const existingFailure = {
    ...newFailure,
    payload: {
      accountId: 'acc_test',
      intentId: 'card_existing_failure',
      billingRecordId: 'br_existing_failure',
      failureReason: 'issuer declined'
    }
  } as OutboxEvent;
  await handlers.handle(existingFailure);
  const updatedFailure = await cardTransactions.findByTransactionId('card_existing_failure');
  assert.equal(updatedFailure?.status, 'failed');
  assert.equal(updatedFailure?.billingSettlementStatus, 'failed');
  assert.equal(updatedFailure?.billingSettlementError, 'issuer declined');
});
