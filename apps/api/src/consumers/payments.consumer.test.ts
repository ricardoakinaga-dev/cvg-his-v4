import assert from 'node:assert/strict';
import test from 'node:test';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { OutboxEvent } from '@cvg-his-v2/module-event-bus';
import { PaymentsEventHandlers } from './payments.consumer.js';

// Mock returns BillingService (satisfies interface) + extra `settles` prop for assertions
function createMockBillingService(): BillingService {
  const settles: string[] = [];
  return Object.assign({
    async settleByRecordId(recordId: never): Promise<never> {
      settles.push(recordId as string);
      return { id: recordId, status: 'settled' } as never;
    }
  }, { settles }) as unknown as BillingService;
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
      amount: 15000,
      currency: 'BRL',
      provider: 'local-pix',
      status: 'pending',
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
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

test('PaymentsEventHandlers handles payment.pix.confirmed and settles billing record', async () => {
  const billing = createMockBillingService();
  const handlers = new PaymentsEventHandlers({ billing });

  const event = makePixConfirmedEvent('br_test_123');
  await handlers.handle(event);

  assert.equal((billing as any).settles.length, 1);
  assert.equal((billing as any).settles[0], 'br_test_123');
});

test('PaymentsEventHandlers handles payment.pix.confirmed without billingRecordId (no-op)', async () => {
  const billing = createMockBillingService();
  const handlers = new PaymentsEventHandlers({ billing });

  const event = makePixConfirmedEvent('') as OutboxEvent;
  (event.payload as any).billingRecordId = undefined;

  await handlers.handle(event);

  assert.equal((billing as any).settles.length, 0);
});

test('PaymentsEventHandlers ignores billing.status_changed events (no-op)', async () => {
  const billing = createMockBillingService();
  const handlers = new PaymentsEventHandlers({ billing });

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

  assert.equal((billing as any).settles.length, 0);
});

test('PaymentsEventHandlers handles payment.pix.intent.created without error', async () => {
  const billing = createMockBillingService();
  const handlers = new PaymentsEventHandlers({ billing });

  const event = makePixIntentCreatedEvent('pix_intent_new', 'br_new_456');
  // Should not throw
  await handlers.handle(event);

  // No settlement should occur for intent creation
  assert.equal((billing as any).settles.length, 0);
});
