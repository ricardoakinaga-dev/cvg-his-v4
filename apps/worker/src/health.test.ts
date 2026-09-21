import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorkerHealthResponse } from './health.js';

const request = { headers: { 'x-correlation-id': 'corr-health-test' } } as never;

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
  assert.equal(
    response.dependencies.worker.detail,
    'Worker loop degraded; inspect worker logs using the response correlationId'
  );
  assert.equal(
    JSON.stringify(response).includes('secret-password'),
    false,
    'health payload must not contain raw operational error details'
  );
});
