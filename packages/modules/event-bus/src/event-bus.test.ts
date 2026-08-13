import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import { DatabaseOutboxRepository, EventBusService } from './event-bus.service.js';

const mockCorrelationId = 'corr_test_123' as CorrelationId;
const mockModuleName = 'notifications' as ModuleName;

function createMockRepository() {
  const events: any[] = [];
  return {
    events, // expose for test assertions
    create: async (event: any) => { events.push(event); },
    update: async (event: any) => {
      const idx = events.findIndex(e => e.id === event.id);
      if (idx >= 0) events[idx] = event;
    },
    findById: async (id: string) => events.find(e => e.id === id) ?? null,
    findPending: async () => {
      const now = new Date();
      return events.filter(
        (e) =>
          (e.status === 'pending' || e.status === 'retrying') &&
          e.attempts < e.maxAttempts &&
          new Date(e.scheduledAt) <= now
      );
    },
    findFailed: async (limit: number) => events
      .filter((e) => e.status === 'failed')
      .slice(0, limit),
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

test('DatabaseOutboxRepository maps jsonb payload objects returned by pg', () => {
  const repository = new DatabaseOutboxRepository();
  const now = new Date();

  const mapped = (repository as any).mapRow({
    id: 'evt_1',
    correlation_id: mockCorrelationId,
    module_name: mockModuleName,
    event_type: 'test.jsonb',
    payload: { nested: { ok: true } },
    status: 'pending',
    attempts: 0,
    max_attempts: 3,
    scheduled_at: now,
    processed_at: null,
    error: null,
    created_at: now
  });

  assert.deepEqual(mapped.payload, { nested: { ok: true } });
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

test('EventBusService subscribe calls handler when event is processed', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const handledEvents: any[] = [];
  const unsubscribe = service.subscribe(async (event) => {
    handledEvents.push(event);
  });

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: { key: 'value' }
  });

  await service.processPending(10);

  assert.equal(handledEvents.length, 1);
  assert.equal(handledEvents[0].eventType, 'test.event');
  assert.deepEqual(handledEvents[0].payload, { key: 'value' });

  unsubscribe();
});

test('EventBusService subscribe returns unsubscribe function', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const handledEvents: any[] = [];
  const unsubscribe = service.subscribe(async (event) => {
    handledEvents.push(event);
  });

  unsubscribe();

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: {}
  });

  await service.processPending(10);

  assert.equal(handledEvents.length, 0, 'Handler should not be called after unsubscribe');
});

test('EventBusService multiple handlers are all called', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const calls: number[] = [];
  service.subscribe(async () => { calls.push(1); });
  service.subscribe(async () => { calls.push(2); });

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: {}
  });

  await service.processPending(10);

  assert.equal(calls.length, 2);
  assert.ok(calls.includes(1));
  assert.ok(calls.includes(2));
});

test('EventBusService processPending schedules retry with backoff on failure', async () => {
  const repo = createMockRepository();
  // Use tiny backoff (1ms base) so tests run fast
  const service = new EventBusService(repo as any, { baseMs: 1, maxMs: 10 });

  // Subscribe a handler that always throws — forcing a retry
  service.subscribe(async () => {
    throw new Error('always fails');
  });

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.retry_event',
    payload: {},
    maxAttempts: 3
  });

  const processingStartedAt = Date.now();
  const processed = await service.processPending(10);
  const processingFinishedAt = Date.now();

  // Event was processed (attempted), but is now 'retrying' (not 'failed')
  assert.equal(processed.length, 0, 'No event should be marked completed on handler failure');

  const allEvents = (repo as any).events;
  assert.equal(allEvents.length, 1);
  const event = allEvents[0];
  assert.equal(event.status, 'retrying');
  assert.equal(event.attempts, 1);
  assert.ok(event.error?.includes('always fails'));
  // scheduledAt should be delayed by the configured backoff window.
  const nextRunAt = new Date(event.scheduledAt).getTime();
  assert.ok(Number.isFinite(nextRunAt));
  assert.ok(
    nextRunAt >= processingStartedAt + 1,
    'Retry must not be scheduled before the configured 1ms base backoff'
  );
  assert.ok(
    nextRunAt <= processingFinishedAt + 10,
    'Retry must remain within the configured 10ms maximum backoff'
  );
});

test('EventBusService processPending moves event to DLQ after max attempts', async () => {
  const repo = createMockRepository();
  // Use tiny backoff for fast tests
  const service = new EventBusService(repo as any, { baseMs: 1, maxMs: 10 });

  service.subscribe(async () => {
    throw new Error('always fails');
  });

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.dlq_event',
    payload: {},
    maxAttempts: 2
  });

  // First attempt: retrying
  await service.processPending(10);
  // Second attempt: DLQ (failed) — wait for backoff delay to elapse
  await new Promise((resolve) => setTimeout(resolve, 20));
  await service.processPending(10);

  const allEvents = (repo as any).events;
  const event = allEvents[0];

  assert.equal(event.status, 'failed', 'Should be marked as DLQ after exhausting retries');
  assert.equal(event.attempts, 2, 'Should have all attempts recorded');
  assert.ok(event.error?.includes('DLQ'));
  assert.ok(event.error?.includes('always fails'));
  assert.ok(event.error?.includes('2 attempts'));
});

test('EventBusService getDeadLetterEvents returns failed events', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any, { baseMs: 1, maxMs: 10 });

  service.subscribe(async () => { throw new Error('always fails'); });

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.dlq_1',
    payload: {},
    maxAttempts: 1
  });
  await service.processPending(10);

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.dlq_2',
    payload: {},
    maxAttempts: 1
  });
  await service.processPending(10);

  const dlq = await service.getDeadLetterEvents(10);
  assert.equal(dlq.length, 2);
  assert.ok(dlq.every((e: any) => e.status === 'failed'));
});

test('EventBusService reprocessEvent resets failed event to pending', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any, { baseMs: 1, maxMs: 10 });

  service.subscribe(async () => { throw new Error('always fails'); });

  // Publish an event that will fail and go to DLQ
  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.reprocess_event',
    payload: {},
    maxAttempts: 1
  });
  await service.processPending(10);

  const allEvents = (repo as any).events;
  assert.equal(allEvents.length, 1);
  assert.equal(allEvents[0].status, 'failed');

  const eventId = allEvents[0].id;

  // Reprocess the failed event
  const reprocessed = await service.reprocessEvent(eventId);

  assert.ok(reprocessed, 'reprocessEvent should return the event');
  assert.equal(reprocessed!.status, 'pending');
  assert.equal(reprocessed!.attempts, 0);
  assert.equal(reprocessed!.error, null);
});

test('EventBusService reprocessEvent returns null for non-existent event', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const result = await service.reprocessEvent('non-existent-id');
  assert.equal(result, null);
});

test('EventBusService getPendingEvents returns pending/retrying events', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.pending_1',
    payload: {}
  });
  await service.publish({
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.pending_2',
    payload: {}
  });

  const pending = await service.getPendingEvents(50);
  // Both events are pending (not processed yet)
  assert.ok(pending.length >= 2);
});
