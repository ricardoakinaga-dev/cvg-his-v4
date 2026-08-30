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
      async settleByRecordId(_accountId: never, recordId: never): Promise<never> {
        settles.push(recordId as string);
        return { id: recordId, status: 'settled' } as never;
      },
      getOrThrow(_accountId: never, recordId: never): never {
        return {
          id: recordId,
          accountId: 'acc_test',
          encounterId: 'enc_test_1',
          currency: 'BRL',
          subtotalAmount: 150
        } as never;
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
        _accountId: never,
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
    accountId: 'acc_test' as never,
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

function makePixIntentCreatedEvent(
  intentId = 'pix_intent_1',
  billingRecordId?: string
): OutboxEvent {
  return {
    id: 'evt_pix_001',
    accountId: 'acc_test' as never,
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

function makeCardIntentCreatedEvent(
  intentId = 'card_intent_1',
  billingRecordId?: string,
  amount = 150
): OutboxEvent {
  return {
    id: 'evt_card_001',
    accountId: 'acc_test' as never,
    correlationId: 'corr_card_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.card.intent.created',
    payload: {
      accountId: 'acc_test',
      intentId,
      billingRecordId,
      amount,
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

function makeCardCompletedEvent(billingRecordId: string, accountId = 'acc_test'): OutboxEvent {
  return {
    id: 'evt_card_complete_001',
    accountId: accountId as never,
    correlationId: 'corr_card_complete_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.card.completed',
    payload: {
      accountId,
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
  billingRecordId: string | undefined = 'br_test_123',
  options: {
    readonly paymentAttemptId?: string;
    readonly amount?: number;
    readonly withoutBilling?: boolean;
  } = {}
) {
  await repository.create({
    transactionId,
    provider: 'local-pix',
    accountId: 'acc_test',
    billingRecordId: options.withoutBilling ? undefined : billingRecordId,
    paymentAttemptId: options.paymentAttemptId,
    amount: options.amount ?? 150,
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

test('PaymentsEventHandlers refuses legacy PIX confirmation without an authoritative intent', async () => {
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

  await assert.rejects(
    handlers.handlers(makePixConfirmedEvent('br_missing_123')),
    /no authoritative PIX transaction intent/
  );

  assert.equal(await pixTransactions.findByTransactionId('pix_intent_1'), null);
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers rejects attempt-linked legacy PIX confirmation before mutation', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  await seedPixTransaction(pixTransactions, 'pix_attempt_1', 'br_test_123', {
    paymentAttemptId: 'attempt_b2_123'
  });
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  await assert.rejects(
    handlers.handle(
      Object.assign(makePixConfirmedEvent('br_test_123'), {
        payload: {
          ...makePixConfirmedEvent('br_test_123').payload,
          intentId: 'pix_attempt_1'
        }
      })
    ),
    /attempt-linked PIX confirmation must use the dedicated settlement flow/
  );

  const transaction = await pixTransactions.findByTransactionId('pix_attempt_1');
  assert.equal(transaction?.status, 'pending');
  assert.equal(transaction?.billingSettlementStatus, 'awaiting_payment');
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers rejects a legacy PIX event with a mismatched envelope account before mutation', async () => {
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
  const event = Object.assign(makePixConfirmedEvent('br_test_123'), {
    accountId: 'acc_other' as never
  }) as OutboxEvent;

  await assert.rejects(handlers.handle(event), /account/);

  const transaction = await pixTransactions.findByTransactionId('pix_intent_1');
  assert.equal(transaction?.status, 'pending');
  assert.equal(transaction?.billingSettlementStatus, 'awaiting_payment');
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers validates the authoritative PIX amount before mutation', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  await seedPixTransaction(pixTransactions, 'pix_amount_mismatch', 'br_test_123', {
    amount: 125
  });
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });
  const event = Object.assign(makePixConfirmedEvent('br_test_123'), {
    payload: { ...makePixConfirmedEvent('br_test_123').payload, intentId: 'pix_amount_mismatch' }
  }) as OutboxEvent;

  await assert.rejects(handlers.handle(event), /amount does not match the billing record/);

  const transaction = await pixTransactions.findByTransactionId('pix_amount_mismatch');
  assert.equal(transaction?.status, 'pending');
  assert.equal(transaction?.billingSettlementStatus, 'awaiting_payment');
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers refuses settlement when the authoritative status update disappears', async () => {
  const billing = createMockBillingService();
  const encounterFinancial = createMockEncounterFinancialService();
  const pixTransactions = new InMemoryPixTransactionRepository();
  const cardTransactions = new InMemoryCardTransactionRepository();
  await seedPixTransaction(pixTransactions);
  pixTransactions.updateStatus = async () => null;
  const handlers = new PaymentsEventHandlers({
    billing,
    encounterFinancial,
    pixTransactions,
    cardTransactions
  });

  await assert.rejects(
    handlers.handle(makePixConfirmedEvent('br_test_123')),
    /could not mark its authoritative transaction as completed/
  );
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

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
  await seedPixTransaction(pixTransactions, 'pix_intent_no_billing', undefined, {
    withoutBilling: true
  });
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
    accountId: 'acc_test' as never,
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

test('PaymentsEventHandlers refuses card capture without an authoritative intent', async () => {
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

  await assert.rejects(
    handlers.handle(makeCardCompletedEvent('br_card_456')),
    /no authoritative transaction intent/
  );
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
  assert.equal(await cardTransactions.findByTransactionId('card_intent_1'), null);
});

test('PaymentsEventHandlers rejects card capture when authoritative data does not match billing', async () => {
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

  await handlers.handle(makeCardIntentCreatedEvent('card_intent_1', 'br_card_456', 320));

  await assert.rejects(
    handlers.handle(makeCardCompletedEvent('br_card_456')),
    /amount does not match the billing record/
  );
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
  const transaction = await cardTransactions.findByTransactionId('card_intent_1');
  assert.equal(transaction?.status, 'authorized_pending_capture');
  assert.equal(transaction?.billingSettlementStatus, 'awaiting_capture');
});

test('PaymentsEventHandlers rejects card capture when event billing record differs from intent', async () => {
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

  await assert.rejects(
    handlers.handle(makeCardCompletedEvent('br_other_789')),
    /billing record account/
  );
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
});

test('PaymentsEventHandlers rejects card capture from a different account', async () => {
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

  await assert.rejects(
    handlers.handle(makeCardCompletedEvent('br_card_456', 'acc_other')),
    /billing account/
  );
  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
  const transaction = await cardTransactions.findByTransactionId('card_intent_1');
  assert.equal(transaction?.status, 'authorized_pending_capture');
});
