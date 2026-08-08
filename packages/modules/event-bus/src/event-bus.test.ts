import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'vitest';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import { DatabaseOutboxRepository, EventBusService } from './event-bus.service.js';

const mockCorrelationId = 'corr_test_123' as CorrelationId;
const mockModuleName = 'notifications' as ModuleName;
const mockAccountId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as any;

function createMockRepository() {
  const events: any[] = [];
  return {
    deliveryGuarantees: 'ephemeral' as const,
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
    claimPending: async ({ limit, leaseOwner, leaseMs }: any) => {
      const now = Date.now();
      return events
        .filter(
          (event) =>
            ((event.status === 'pending' || event.status === 'retrying') &&
              new Date(event.scheduledAt).getTime() <= now) ||
            (event.status === 'processing' &&
              new Date(event.leaseExpiresAt ?? 0).getTime() <= now)
        )
        .filter((event) => event.attempts < event.maxAttempts)
        .slice(0, limit)
        .map((event) => {
          const claimed = {
            ...event,
            status: 'processing',
            attempts: event.attempts + 1,
            leaseOwner,
            leaseToken: randomUUID(),
            leaseVersion: (event.leaseVersion ?? 0) + 1,
            leaseExpiresAt: new Date(now + leaseMs).toISOString()
          };
          events[events.findIndex((candidate) => candidate.id === event.id)] = claimed;
          return {
            event: claimed,
            leaseOwner,
            leaseToken: claimed.leaseToken,
            leaseVersion: claimed.leaseVersion,
            leaseExpiresAt: claimed.leaseExpiresAt
          };
        });
    },
    renewClaim: async (claim: any, leaseMs: number) => {
      const event = events.find((candidate) => candidate.id === claim.event.id);
      if (!event || event.leaseToken !== claim.leaseToken || event.status !== 'processing') return false;
      event.leaseExpiresAt = new Date(Date.now() + leaseMs).toISOString();
      return true;
    },
    completeClaim: async (claim: any, processedAt: string) => {
      const index = events.findIndex((candidate) => candidate.id === claim.event.id);
      if (index < 0 || events[index].leaseToken !== claim.leaseToken || events[index].status !== 'processing') return false;
      events[index] = { ...events[index], status: 'completed', processedAt, leaseToken: null };
      return true;
    },
    retryClaim: async (claim: any, input: any) => {
      const index = events.findIndex((candidate) => candidate.id === claim.event.id);
      if (index < 0 || events[index].leaseToken !== claim.leaseToken || events[index].status !== 'processing') return false;
      events[index] = { ...events[index], status: 'retrying', ...input, leaseToken: null };
      return true;
    },
    failClaim: async (claim: any, error: string) => {
      const index = events.findIndex((candidate) => candidate.id === claim.event.id);
      if (index < 0 || events[index].leaseToken !== claim.leaseToken || events[index].status !== 'processing') return false;
      events[index] = { ...events[index], status: 'failed', error, leaseToken: null };
      return true;
    },
    reprocess: async (eventId: string) => {
      const index = events.findIndex((candidate) => candidate.id === eventId);
      if (index < 0 || !['failed', 'retrying'].includes(events[index].status)) return null;
      events[index] = {
        ...events[index],
        status: 'pending',
        attempts: 0,
        error: null,
        scheduledAt: new Date().toISOString()
      };
      return events[index];
    },
    peekPending: async (limit: number) => {
      const now = new Date();
      return events.filter(
        (e) =>
          (e.status === 'pending' || e.status === 'retrying') &&
          e.attempts < e.maxAttempts &&
          new Date(e.scheduledAt) <= now
      ).slice(0, limit);
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
    accountId: mockAccountId,
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
    accountId: mockAccountId,
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
  service.subscribe(async () => {});

  await service.publish({
    accountId: mockAccountId,
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

test('EventBusService leaves pending events untouched when no consumers are registered', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  await service.publish({
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.unhandled',
    payload: {}
  });

  const processed = await service.processPending(10);

  assert.deepEqual(processed, []);
  assert.equal(repo.events[0].status, 'pending');
});

test('EventBusService getEvent returns event by id', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  const published = await service.publish({
    accountId: mockAccountId,
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
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event1',
    payload: {}
  });
  await service.publish({
    accountId: mockAccountId,
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
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.event',
    payload: { key: 'value' }
  });

  await service.processPending(10);

  assert.equal(handledEvents.length, 1);
  assert.equal(handledEvents[0].eventType, 'test.event');
  assert.deepEqual(handledEvents[0].payload, {
    key: 'value',
    accountId: mockAccountId,
    _meta: { accountId: mockAccountId }
  });

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
    accountId: mockAccountId,
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
    accountId: mockAccountId,
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
  const service = new EventBusService(repo as any, { baseMs: 1_000, maxMs: 1_000 });

  // Subscribe a handler that always throws — forcing a retry
  service.subscribe(async () => {
    throw new Error('always fails');
  });

  await service.publish({
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.retry_event',
    payload: {},
    maxAttempts: 3
  });

  const processed = await service.processPending(10);

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
  assert.ok(nextRunAt >= Date.now() - 5);
});

test('EventBusService processPending moves event to DLQ after max attempts', async () => {
  const repo = createMockRepository();
  // Use tiny backoff for fast tests
  const service = new EventBusService(repo as any, { baseMs: 1, maxMs: 10 });

  service.subscribe(async () => {
    throw new Error('always fails');
  });

  await service.publish({
    accountId: mockAccountId,
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
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.dlq_1',
    payload: {},
    maxAttempts: 1
  });
  await service.processPending(10);

  await service.publish({
    accountId: mockAccountId,
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
    accountId: mockAccountId,
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
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.pending_1',
    payload: {}
  });
  await service.publish({
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.pending_2',
    payload: {}
  });

  const pending = await service.getPendingEvents(50);
  // Both events are pending (not processed yet)
  assert.ok(pending.length >= 2);
});

test('EventBusService getPendingEvents uses a read-only repository query', async () => {
  const repo = createMockRepository();
  repo.events.push({ id: 'pending-read-only', status: 'pending' });
  repo.findPending = async () => {
    throw new Error('claiming query must not be used by a read endpoint');
  };
  repo.peekPending = async () => repo.events;
  const service = new EventBusService(repo as any);

  const pending = await service.getPendingEvents(10);

  assert.equal(pending[0]?.id, 'pending-read-only');
  assert.equal(repo.events[0]?.status, 'pending');
});

test('retry executes only the consumer that has no committed inbox receipt', async () => {
  const repo = createMockRepository();
  const receipts = new Set<string>();
  const consumerGuard = {
    async executeOnce(event: any, consumerName: string, handler: () => Promise<void>) {
      const key = `${event.accountId}:${consumerName}:${event.id}`;
      if (receipts.has(key)) return false;
      await handler();
      receipts.add(key);
      return true;
    }
  };
  const service = new EventBusService(
    repo as any,
    { baseMs: 1, maxMs: 1 },
    { workerId: 'worker-test', leaseMs: 60_000, consumerGuard } as never
  );
  let callsA = 0;
  let callsB = 0;

  (service.subscribe as any)('consumer-a', async () => {
    callsA += 1;
  });
  (service.subscribe as any)('consumer-b', async () => {
    callsB += 1;
    if (callsB === 1) throw new Error('retry consumer b');
  });
  await service.publish({
    accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' as never,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.partial-retry',
    payload: { accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }
  });

  await service.processPending(1);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await service.processPending(1);

  assert.equal(callsA, 1);
  assert.equal(callsB, 2);
  assert.equal(repo.events[0]?.status, 'completed');
  assert.equal(receipts.size, 2);
});

test('renews the lease while a slow consumer is running', async () => {
  const repo = createMockRepository();
  let renewals = 0;
  const originalRenew = repo.renewClaim;
  repo.renewClaim = async (claim: any, leaseMs: number) => {
    renewals += 1;
    return originalRenew(claim, leaseMs);
  };
  const service = new EventBusService(
    repo as any,
    undefined,
    { workerId: 'worker-heartbeat', leaseMs: 1_000 }
  );
  service.subscribe('slow-consumer', async () => {
    await new Promise((resolve) => setTimeout(resolve, 400));
  });
  await service.publish({
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.slow',
    payload: {}
  });

  const processed = await service.processPending(1);

  assert.equal(processed.length, 1);
  assert.ok(renewals >= 1);
});

test('claims one event at a time so queued leases cannot expire', async () => {
  const repo = createMockRepository();
  const claimLimits: number[] = [];
  const originalClaim = repo.claimPending;
  repo.claimPending = async (input: any) => {
    claimLimits.push(input.limit);
    return originalClaim(input);
  };
  const service = new EventBusService(repo as any);
  service.subscribe('sequential-consumer', async () => {});
  for (const eventType of ['test.batch-a', 'test.batch-b']) {
    await service.publish({
      accountId: mockAccountId,
      correlationId: mockCorrelationId,
      moduleName: mockModuleName,
      eventType,
      payload: {}
    });
  }

  const processed = await service.processPending(2);

  assert.equal(processed.length, 2);
  assert.deepEqual(claimLimits, [1, 1]);
});

test('rejects a payload that attempts to change the event tenant', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any);

  await assert.rejects(
    service.publish({
      accountId: mockAccountId,
      correlationId: mockCorrelationId,
      moduleName: mockModuleName,
      eventType: 'test.cross-tenant',
      payload: { accountId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' }
    }),
    /does not match event account/
  );
  assert.equal(repo.events.length, 0);
});

test('quarantines a claimed event without canonical tenant metadata', async () => {
  const repo = createMockRepository();
  const service = new EventBusService(repo as any, { baseMs: 1_000, maxMs: 1_000 });
  let handlerCalls = 0;
  service.subscribe('canonical-consumer', async () => {
    handlerCalls += 1;
  });
  await service.publish({
    accountId: mockAccountId,
    correlationId: mockCorrelationId,
    moduleName: mockModuleName,
    eventType: 'test.missing-tenant-metadata',
    payload: {}
  });
  repo.events[0] = {
    ...repo.events[0],
    payload: { accountId: mockAccountId }
  };

  await service.processPending(1);

  assert.equal(handlerCalls, 0);
  assert.equal(repo.events[0]?.status, 'retrying');
  assert.match(repo.events[0]?.error ?? '', /_meta must be an object/);
});

test('requires a durable guard for any repository not explicitly marked ephemeral', async () => {
  const repository = {
    ...createMockRepository(),
    deliveryGuarantees: 'durable' as const
  };
  const service = new EventBusService(repository as any);
  service.subscribe('durable-consumer', async () => {});

  await assert.rejects(
    service.processPending(1),
    /requires a durable consumer guard/
  );
});
