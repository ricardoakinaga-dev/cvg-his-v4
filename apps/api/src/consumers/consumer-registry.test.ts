import assert from 'node:assert/strict';
import test from 'node:test';
import type { EventHandler } from '@cvg-his-v2/module-event-bus';
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

type Subscription = {
  name: string;
  handler: EventHandler;
};

function makeMockEventBus() {
  const subscriptions: Subscription[] = [];
  return {
    subscribe(name: string, handler: EventHandler) {
      subscriptions.push({ name, handler });
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
  const mockEventBus = makeMockEventBus();
  const registry = new ConsumerRegistry();

  const h1 = async () => {};
  const h2 = async () => {};

  registry.add('c1', makeConsumer('c1', h1));
  registry.add('c2', makeConsumer('c2', h2));

  registry.registerAll(mockEventBus as any);

  assert.equal(mockEventBus.subscriptions.length, 2);
  assert.deepEqual(
    mockEventBus.subscriptions.map(({ name }) => name),
    ['c1', 'c2']
  );
  assert.strictEqual(mockEventBus.subscriptions[0].handler, h1);
  assert.strictEqual(mockEventBus.subscriptions[1].handler, h2);
});

test('ConsumerRegistry.registerAll() respects add() call order', async () => {
  const mockEventBus = makeMockEventBus();
  const registry = new ConsumerRegistry();
  const order: string[] = [];

  const firstHandler = async () => {
    order.push('first');
  };
  const secondHandler = async () => {
    order.push('second');
  };
  const thirdHandler = async () => {
    order.push('third');
  };

  registry.add(
    'first',
    makeConsumer('first', firstHandler)
  );
  registry.add('second', makeConsumer('second', secondHandler));
  registry.add('third', makeConsumer('third', thirdHandler));

  registry.registerAll(mockEventBus as any);

  assert.deepEqual(
    mockEventBus.subscriptions.map(({ name }) => name),
    ['first', 'second', 'third']
  );
  assert.strictEqual(mockEventBus.subscriptions[0].handler, firstHandler);
  assert.strictEqual(mockEventBus.subscriptions[1].handler, secondHandler);
  assert.strictEqual(mockEventBus.subscriptions[2].handler, thirdHandler);

  await mockEventBus.subscriptions[0].handler();
  await mockEventBus.subscriptions[1].handler();
  await mockEventBus.subscriptions[2].handler();
  assert.deepEqual(order, ['first', 'second', 'third']);
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
  const mockEventBus = makeMockEventBus();
  const registry = new ConsumerRegistry();

  const consumer = makeConsumer('named-consumer');
  registry.add('named-consumer', consumer);
  registry.registerAll(mockEventBus as any);

  assert.equal(registry.size, 1);
  assert.equal(registry.names[0], 'named-consumer');
  assert.equal(mockEventBus.subscriptions[0].name, 'named-consumer');
  assert.strictEqual(mockEventBus.subscriptions[0].handler, consumer.handlers);
});

test('ConsumerRegistry.registerAll() with all three production consumers — correct order', () => {
  const mockEventBus = makeMockEventBus();
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

  registry.registerAll(mockEventBus as any);

  // Verify all three are registered in correct order
  assert.equal(registry.size, 3);
  assert.deepEqual(registry.names, ['payments', 'billing', 'webhooks']);
  assert.deepEqual(
    mockEventBus.subscriptions.map(({ name }) => name),
    ['payments', 'billing', 'webhooks']
  );
});
