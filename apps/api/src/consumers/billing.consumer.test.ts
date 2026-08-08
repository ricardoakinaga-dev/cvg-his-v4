import assert from 'node:assert/strict';
import test from 'node:test';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';
import { BillingEventHandlers } from './billing.consumer.js';

function createMockBillingService(): BillingService {
  return Object.assign({
    async settleByRecordId(_recordId: never): Promise<never> {
      throw new Error('should not be called');
    }
  }, { settleCalled: false }) as unknown as BillingService;
}

test('BillingEventHandlers handles billing.record.created without error', async () => {
  const billing = createMockBillingService();
  const handlers = new BillingEventHandlers({ billing });

  const event: OutboxEvent = {
    id: 'evt_bil_001',
    accountId: 'acc_test' as never,
    correlationId: 'corr_bil_abc' as never,
    moduleName: 'billing' as never,
    eventType: 'billing.record.created',
    payload: {
      accountId: 'acc_test',
      encounterId: 'enc_123',
      patientId: 'pat_456',
      ownerId: 'own_789',
      status: 'pending'
    },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;

  // Should not throw
  await handlers.handle(event);
});

test('BillingEventHandlers handles billing.status_changed without error', async () => {
  const billing = createMockBillingService();
  const handlers = new BillingEventHandlers({ billing });

  const event: OutboxEvent = {
    id: 'evt_bil_002',
    accountId: 'acc_test' as never,
    correlationId: 'corr_bil_xyz' as never,
    moduleName: 'billing' as never,
    eventType: 'billing.status_changed',
    payload: {
      recordId: 'br_test',
      encounterId: 'enc_123',
      previousStatus: 'pending',
      newStatus: 'settled',
      subtotalAmount: 15000,
      currency: 'BRL'
    },
    status: 'processing',
    attempts: 0,
    maxAttempts: 3,
    scheduledAt: new Date().toISOString(),
    processedAt: null,
    error: null,
    createdAt: new Date().toISOString()
  } as OutboxEvent;

  // Should not throw
  await handlers.handle(event);
});

test('BillingEventHandlers ignores payment.pix.confirmed events (PIX flow is handled by PaymentsEventHandlers)', async () => {
  const billing = createMockBillingService();
  const handlers = new BillingEventHandlers({ billing });

  const event: OutboxEvent = {
    id: 'evt_pix_999',
    accountId: 'acc_test' as never,
    correlationId: 'corr_pix_xyz' as never,
    moduleName: 'billing' as never,
    eventType: 'payment.pix.confirmed',
    payload: {
      accountId: 'acc_test',
      intentId: 'pix_intent_1',
      billingRecordId: 'br_test_123',
      status: 'confirmed',
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

  await handlers.handle(event);
  // billing.settleByRecordId should NOT have been called
  // (PIX confirmation is handled by PaymentsEventHandlers)
});
