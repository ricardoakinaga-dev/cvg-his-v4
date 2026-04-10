import assert from 'node:assert/strict';
import test from 'node:test';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import { EventBusService } from './event-bus.service.js';

const mockCorrelationId = 'corr_test_123' as CorrelationId;
const mockModuleName = 'notifications' as ModuleName;

function createMockRepository() {
  const events: any[] = [];
  return {
    create: async (event: any) => { events.push(event); },
    update: async (event: any) => {
      const idx = events.findIndex(e => e.id === event.id);
      if (idx >= 0) events[idx] = event;
    },
    findById: async (id: string) => events.find(e => e.id === id) ?? null,
    findPending: async () => events.filter(e => e.status === 'pending' || e.status === 'retrying'),
    findByCorrelationId: async (correlationId: CorrelationId) => events.filter(e => e.correlationId === correlationId)
  };
}

test('EventBusService publish creates a new event', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const result = await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'notification.sent',
    payload: { message: 'Test notification' }
  });

  assert.ok(result.id, 'Event should have an id');
  assert.equal(result.correlationId, mockCorrelationId);
  assert.equal(result.moduleName, mockModuleName);
  assert.equal(result.eventType, 'notification.sent');
  assert.equal(result.status, 'pending');
  assert.equal(result.attempts, 0);
});

test('EventBusService publish with custom maxAttempts', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const result = await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: {},
    maxAttempts: 5
  });

  assert.equal(result.maxAttempts, 5);
});

test('EventBusService processPending marks events as completed', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: {}
  });

  const processed = await service.processPending(10);

  assert.equal(processed.length, 1);
  assert.equal(processed[0].status, 'completed');
  assert.ok(processed[0].processedAt);
});

test('EventBusService getEvent returns event by id', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const published = await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: {}
  });

  const result = await service.getEvent(published.id);

  assert.ok(result);
  assert.equal(result!.id, published.id);
});

test('EventBusService getEventsByCorrelationId returns events for correlation', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event1',
    payload: {}
  });
  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event2',
    payload: {}
  });

  const results = await service.getEventsByCorrelationId(mockCorrelationId);

  assert.equal(results.length, 2);
});