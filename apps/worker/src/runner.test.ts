import assert from 'node:assert/strict';
import test from 'node:test';

import type { Logger } from '@cvg-his-v2/shared-logging';
import type { NotificationRepository } from '@cvg-his-v2/module-notifications';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';

import {
  createWorkerNotifications,
  createWorkerEventBus,
  runWorkerTick,
  runEventBusTick,
  type WorkerTickContext
} from './runner.js';

const mockLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => mockLogger
};

const mockContext: WorkerTickContext = {
  service: 'test-worker',
  environment: 'test',
  correlationId: 'test-correlation-123',
  persistenceMode: 'database',
  databaseHealthy: true,
  databaseDetail: 'connected'
};

function createMockNotificationRepository(overrides: Partial<NotificationRepository> = {}): NotificationRepository {
  return {
    createNotification: async () => {},
    updateNotification: async () => {},
    findNotificationById: async () => null,
    findNotifications: async () => [],
    createJob: async () => {},
    updateJob: async () => {},
    findJobById: async () => null,
    findJobs: async () => [],
    findQueuedJobs: async () => [],
    ...overrides
  };
}

test('createWorkerNotifications creates service with optional repository', () => {
  const notifications = createWorkerNotifications();
  assert.ok(notifications, 'Should create notifications service');
});

test('createWorkerNotifications creates service with provided repository', () => {
  const mockRepo = createMockNotificationRepository();

  const notifications = createWorkerNotifications({ notificationRepository: mockRepo });
  assert.ok(notifications, 'Should create notifications service with repo');
});

test('createWorkerEventBus creates service with optional repository', () => {
  const eventBus = createWorkerEventBus();
  assert.ok(eventBus, 'Should create event bus service');
});

test('createWorkerEventBus creates service with provided repository', () => {
  const mockRepo: OutboxRepository = {
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });
  assert.ok(eventBus, 'Should create event bus service with repo');
});

test('runWorkerTick handles empty notification queue', async () => {
  let infoCalled = false;
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoCalled = true;
      infoData = ctx ?? {};
    }
  };

  const mockRepo = createMockNotificationRepository({
    findQueuedJobs: async () => []
  });

  const notifications = createWorkerNotifications({ notificationRepository: mockRepo });

  await runWorkerTick(logger, mockContext, notifications);

  assert.equal(infoCalled, true, 'Logger info should be called');
  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.correlationId, 'test-correlation-123');
  assert.equal(infoData.databaseHealthy, true);
});

test('runEventBusTick handles empty event queue', async () => {
  let infoCalled = false;
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoCalled = true;
      infoData = ctx ?? {};
    }
  };

  const mockRepo: OutboxRepository = {
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });

  await runEventBusTick(logger, mockContext, eventBus);

  assert.equal(infoCalled, true, 'Logger info should be called');
  assert.equal(infoData.service, 'test-worker');
  assert.equal(infoData.correlationId, 'test-correlation-123');
  assert.equal(infoData.databaseHealthy, true);
  assert.deepEqual(infoData.processedCorrelationIds, []);
});

test('runWorkerTick uses default notifications when none provided', async () => {
  let infoCalled = false;

  const logger: Logger = {
    ...mockLogger,
    info: () => {
      infoCalled = true;
    }
  };

  await runWorkerTick(logger, mockContext);

  assert.equal(infoCalled, true, 'Should use default notifications');
});

test('runEventBusTick uses provided eventBus', async () => {
  let infoCalled = false;

  const logger: Logger = {
    ...mockLogger,
    info: () => {
      infoCalled = true;
    }
  };

  const mockRepo: OutboxRepository = {
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });

  await runEventBusTick(logger, mockContext, eventBus);

  assert.equal(infoCalled, true, 'Should use provided event bus');
});

test('runEventBusTick logs processed event correlation ids for async trace follow-up', async () => {
  let infoData: Record<string, unknown> = {};

  const logger: Logger = {
    ...mockLogger,
    info: (_msg, ctx) => {
      infoData = ctx ?? {};
    }
  };

  const mockRepo: OutboxRepository = {
    create: async () => {},
    update: async () => {},
    findById: async () => null,
    findPending: async () => [
      {
        id: 'evt-1',
        correlationId: 'corr-api-123' as CorrelationId,
        moduleName: 'notifications' as ModuleName,
        eventType: 'notification.sent',
        payload: {
          _meta: {
            traceparent: '00-1234567890abcdef1234567890abcdef-1234567890abcdef-01'
          }
        },
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
        processedAt: null,
        error: null,
        createdAt: new Date(Date.now() - 1000).toISOString()
      }
    ],
    findFailed: async () => [],
    findByCorrelationId: async () => []
  };

  const eventBus = createWorkerEventBus({ eventBusRepository: mockRepo });
  await runEventBusTick(logger, mockContext, eventBus);

  assert.deepEqual(infoData.processedCorrelationIds, ['corr-api-123']);
  assert.deepEqual(infoData.processedEventIds, ['evt-1']);
});

test('WorkerTickContext type is correctly structured', () => {
  const ctx: WorkerTickContext = {
    service: 'my-service',
    environment: 'production',
    correlationId: 'corr-456',
    persistenceMode: 'database',
    databaseHealthy: true,
    databaseDetail: 'postgres://localhost:5432/his'
  };

  assert.equal(ctx.service, 'my-service');
  assert.equal(ctx.environment, 'production');
  assert.equal(ctx.correlationId, 'corr-456');
  assert.equal(ctx.persistenceMode, 'database');
  assert.equal(ctx.databaseHealthy, true);
});

test('WorkerTickContext supports in-memory persistence mode', () => {
  const ctx: WorkerTickContext = {
    service: 'my-service',
    environment: 'test',
    correlationId: 'corr-789',
    persistenceMode: 'in-memory',
    databaseHealthy: false,
    databaseDetail: 'DATABASE_URL not configured'
  };

  assert.equal(ctx.persistenceMode, 'in-memory');
  assert.equal(ctx.databaseHealthy, false);
});
