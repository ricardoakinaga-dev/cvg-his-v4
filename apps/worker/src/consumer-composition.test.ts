import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWorkerEventConsumerRuntime,
  WORKER_EVENT_CONSUMER_NAMES
} from './consumer-composition.js';

function createDependencies() {
  return {
    billing: {
      getOrThrow() {
        throw new Error('not used');
      }
    },
    encounterFinancial: {},
    pixTransactions: {},
    cardTransactions: {},
    webhooks: {}
  } as never;
}

test('worker composition freezes the durable production consumer contract', () => {
  const runtime = createWorkerEventConsumerRuntime(createDependencies());
  assert.deepEqual(runtime.registry.names, WORKER_EVENT_CONSUMER_NAMES);
  assert.equal(runtime.registry.size, 3);
});

test('worker composition registers all consumers on the event bus in contract order', () => {
  const subscriptions: string[] = [];
  const eventBus = {
    subscribe(name: string) {
      subscriptions.push(name);
    }
  } as never;

  const runtime = createWorkerEventConsumerRuntime(createDependencies());
  runtime.register(eventBus);
  assert.deepEqual(subscriptions, WORKER_EVENT_CONSUMER_NAMES);
});
