import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventHandler, OutboxEvent } from '@cvg-his-v2/module-event-bus';
import { ConsumerRegistry, type DomainConsumer } from './index.js';
import { PaymentsEventHandlers } from './payments.consumer.js';
import { BillingEventHandlers } from './billing.consumer.js';
import { WebhooksEventHandlers } from './webhooks.consumer.js';
import { InMemoryCardTransactionRepository } from '../card-transaction-repository.js';

/**
 * Helper: create a minimal DomainConsumer with a given name.
 */
function makeConsumer(name: string, handler: EventHandler = async () => {}): DomainConsumer {
  return { name, handlers: handler };
}

function makeMockEventBus() {
  const subscriptions: EventHandler[] = [];
  return {
    subscribe(handler: EventHandler) {
      subscriptions.push(handler);
    },
    get subscriptions() {
      return subscriptions;
    }
  };
}

function createMockBillingService() {
  return {
    async settleByRecordId(_accountId: never, recordId: never): Promise<never> {
      return { id: recordId, status: 'settled' } as never;
    }
  } as unknown as import('@cvg-his-v2/module-billing').BillingService;
}

function createMockWebhooksService() {
  return {
    async dispatch(): Promise<void> {}
  } as unknown as import('@cvg-his-v2/module-webhooks').WebhooksService;
}

function createMockEncounterFinancialService() {
  return {
    async registerPayment(): Promise<void> {}
  } as unknown as import('@cvg-his-v2/module-financial').EncounterFinancialService;
}

function createMockPixTransactions() {
  return {
    async findByTransactionId(): Promise<null> {
      return null;
    },
    async create(): Promise<void> {},
    async updateStatus(): Promise<null> {
      return null;
    },
    async updateBillingSettlement(): Promise<void> {},
    async updateCashReconciliation(): Promise<void> {}
  } as unknown as import('../pix-transaction-repository.js').PixTransactionRepository;
}

test('ConsumerRegistry.add() registers a consumer', () => {
  const registry = new ConsumerRegistry();
  const consumer = makeConsumer('test');

  registry.add('test', consumer);

  assert.equal(registry.size, 1);
  assert.deepEqual(registry.names, ['test']);
});

test('ConsumerRegistry.add() throws on duplicate name', () => {
  const registry = new ConsumerRegistry();
  const consumer = makeConsumer('duplicate');

  registry.add('duplicate', consumer);

  assert.throws(
    () => registry.add('duplicate', makeConsumer('duplicate')),
    /Consumer 'duplicate' is already registered/
  );
});

test('ConsumerRegistry.registerAll() calls subscribe once per consumer', () => {
  const mockEventBus = makeMockEventBus() as any;
  const registry = new ConsumerRegistry();

  const h1 = async () => {};
  const h2 = async () => {};

  registry.add('c1', makeConsumer('c1', h1));
  registry.add('c2', makeConsumer('c2', h2));

  registry.registerAll(mockEventBus);

  assert.equal(mockEventBus.subscriptions.length, 2);
  assert.strictEqual(mockEventBus.subscriptions[0], h1);
  assert.strictEqual(mockEventBus.subscriptions[1], h2);
});

test('ConsumerRegistry.registerAll() respects add() call order', () => {
  const mockEventBus = makeMockEventBus() as any;
  const registry = new ConsumerRegistry();
  const order: string[] = [];

  registry.add(
    'first',
    makeConsumer('first', async () => {
      order.push('first');
    })
  );
  registry.add(
    'second',
    makeConsumer('second', async () => {
      order.push('second');
    })
  );
  registry.add(
    'third',
    makeConsumer('third', async () => {
      order.push('third');
    })
  );

  registry.registerAll(mockEventBus);

  assert.equal(registry.names[0], 'first');
  assert.equal(registry.names[1], 'second');
  assert.equal(registry.names[2], 'third');
});

test('ConsumerRegistry.size returns correct count', () => {
  const registry = new ConsumerRegistry();
  assert.equal(registry.size, 0);

  registry.add('a', makeConsumer('a'));
  assert.equal(registry.size, 1);

  registry.add('b', makeConsumer('b'));
  assert.equal(registry.size, 2);

  registry.add('c', makeConsumer('c'));
  assert.equal(registry.size, 3);
});

test('ConsumerRegistry.names returns all registered names', () => {
  const registry = new ConsumerRegistry();
  registry.add('payments', makeConsumer('payments'));
  registry.add('billing', makeConsumer('billing'));

  assert.deepEqual(registry.names, ['payments', 'billing']);
});

test('ConsumerRegistry can add and immediately register a consumer with the correct name', () => {
  const mockEventBus = makeMockEventBus() as any;
  const registry = new ConsumerRegistry();

  const consumer = makeConsumer('named-consumer');
  registry.add('named-consumer', consumer);
  registry.registerAll(mockEventBus);

  assert.equal(registry.size, 1);
  assert.equal(registry.names[0], 'named-consumer');
});

test('ConsumerRegistry.registerAll() with all three production consumers — correct order', () => {
  const mockEventBus = makeMockEventBus() as any;
  const registry = new ConsumerRegistry();

  const payments = new PaymentsEventHandlers({
    billing: createMockBillingService(),
    encounterFinancial: createMockEncounterFinancialService(),
    pixTransactions: createMockPixTransactions(),
    cardTransactions: new InMemoryCardTransactionRepository()
  });
  const billing = new BillingEventHandlers({ billing: createMockBillingService() });
  const webhooks = new WebhooksEventHandlers({ webhooks: createMockWebhooksService() });

  // Order matters: payments must be subscribed before billing (PIX settlement)
  registry.add('payments', payments);
  registry.add('billing', billing);
  registry.add('webhooks', webhooks);

  registry.registerAll(mockEventBus);

  // Verify all three are registered in correct order
  assert.equal(registry.size, 3);
  assert.deepEqual(registry.names, ['payments', 'billing', 'webhooks']);
  assert.equal(mockEventBus.subscriptions.length, 3);
});
