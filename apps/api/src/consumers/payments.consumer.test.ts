import assert from 'node:assert/strict';
import test from 'node:test';

import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';

import {
  InMemoryPixTransactionRepository,
  type PixTransactionRepository
} from '../pix-transaction-repository.js';
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
  const payments: Array<{ billingRecordId: string; amountPaid: number; transactionId?: string }> = [];
  return Object.assign(
    {
      async recordPaymentForBillingRecord(
        billingRecordId: never,
        input: { amountPaid: number; externalReferenceId?: string | null }
      ): Promise<never> {
        payments.push({
          billingRecordId: billingRecordId as string,
          amountPaid: input.amountPaid,
          transactionId: input.externalReferenceId ?? undefined
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
            externalReferenceType: 'pix_transaction',
            externalReferenceId: payment.transactionId,
            notes: null
          }))
        } as never;
      }
    },
    { payments }
  ) as unknown as EncounterFinancialService & {
    payments: Array<{ billingRecordId: string; amountPaid: number; transactionId?: string }>;
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
  await seedPixTransaction(pixTransactions);
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions });

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
  await seedPixTransaction(pixTransactions, 'pix_intent_no_billing', undefined);
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions });

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
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions });

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
  const handlers = new PaymentsEventHandlers({ billing, encounterFinancial, pixTransactions });

  const event = makePixIntentCreatedEvent('pix_intent_new', 'br_new_456');
  await handlers.handle(event);

  assert.equal(billing.settles.length, 0);
  assert.equal(encounterFinancial.payments.length, 0);
  const transaction = await pixTransactions.findByTransactionId('pix_intent_new');
  assert.equal(transaction?.amount, 150);
  assert.equal(transaction?.billingSettlementStatus, 'awaiting_payment');
});
