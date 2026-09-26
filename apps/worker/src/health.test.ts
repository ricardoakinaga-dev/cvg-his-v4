import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createWorkerHealthResponse,
  createWorkerLivenessResponse,
  isWorkerLoopStalled,
  sanitizeWorkerDiagnostic,
  WORKER_LOOP_DEGRADED_MESSAGE
} from './health.js';

const request = { headers: { 'x-correlation-id': 'patient@example.com' } } as never;

const baseDeps = {
  databaseConfigured: true,
  databaseHealthy: true,
  databaseDetail: 'database connected',
  persistenceMode: 'database' as const,
  ticksCompleted: 4,
  lastTickAt: '2026-09-21T03:00:00.000Z',
  initialized: true,
  draining: false,
  requiredEventBusConsumers: ['consumer-a'],
  registeredEventBusConsumers: ['consumer-a'],
  deliveryGuaranteesReady: true,
  durableConsumerGuardReady: true,
  webhookDeliveryExecutorReady: true
};

test('worker health does not expose raw loop errors to unauthenticated callers', () => {
  const response = createWorkerHealthResponse('worker', 'production', '0.1.0', request, {
    ...baseDeps,
    lastError: 'postgres://secret-user:secret-password@db.internal/clinical'
  });

  assert.equal(response.ok, false);
  assert.match(response.correlationId, /^worker_[0-9a-z]+_[a-f0-9]{18}$/);
  assert.equal(response.dependencies.worker.detail, WORKER_LOOP_DEGRADED_MESSAGE);
  assert.equal(
    JSON.stringify(response).includes('secret-password'),
    false,
    'health payload must not contain raw operational error details'
  );
  assert.equal(JSON.stringify(response).includes('patient@example.com'), false);
});

test('worker liveness does not echo caller-selected correlation values', () => {
  const response = createWorkerLivenessResponse('worker', 'production', '0.1.0', request, true);

  assert.match(response.correlationId, /^worker_[0-9a-z]+_[a-f0-9]{18}$/);
  assert.equal(response.correlationId.includes('patient@example.com'), false);
});

test('worker metrics diagnostics do not echo raw loop errors', () => {
  const rawError = 'postgres://secret-user:secret-password@db.internal/clinical';
  assert.equal(sanitizeWorkerDiagnostic(null), null);
  assert.equal(sanitizeWorkerDiagnostic(rawError), WORKER_LOOP_DEGRADED_MESSAGE);
  assert.equal(sanitizeWorkerDiagnostic(rawError)?.includes(rawError), false);
});

test('worker readiness and liveness fail when the loop stops completing ticks without an error', () => {
  const lastTickAt = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const stalled = createWorkerHealthResponse('worker', 'production', '0.1.0', request, {
    ...baseDeps,
    lastTickAt,
    lastError: null,
    stalledAfterMs: 15 * 60 * 1000
  });
  assert.equal(stalled.ok, false);
  assert.match(stalled.dependencies.worker.detail, /stalled/);

  const fresh = createWorkerHealthResponse('worker', 'production', '0.1.0', request, {
    ...baseDeps,
    lastTickAt: new Date().toISOString(),
    lastError: null,
    stalledAfterMs: 15 * 60 * 1000
  });
  assert.equal(fresh.ok, true);

  const liveness = createWorkerLivenessResponse('worker', 'production', '0.1.0', request, true, true);
  assert.equal(liveness.ok, false);
  assert.equal(liveness.liveness.live, false);
});

test('a first tick that never completes is detected from the loop start', () => {
  const now = Date.parse('2026-09-26T12:00:00.000Z');
  assert.equal(
    isWorkerLoopStalled(
      { lastTickAt: null, loopStartedAt: '2026-09-26T11:00:00.000Z', stalledAfterMs: 60_000 },
      now
    ),
    true
  );
  assert.equal(
    isWorkerLoopStalled({ lastTickAt: null, loopStartedAt: '2026-09-26T11:59:30.000Z', stalledAfterMs: 60_000 }, now),
    false
  );
  assert.equal(isWorkerLoopStalled({ lastTickAt: '2026-09-26T00:00:00.000Z' }, now), false);
});
