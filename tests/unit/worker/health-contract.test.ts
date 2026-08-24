import { describe, expect, it } from 'vitest';

import {
  createWorkerHealthResponse,
  createWorkerLivenessResponse,
  createWorkerReadinessResponse
} from '../../../apps/worker/src/health.js';

describe('worker health contract', () => {
  it('returns structured health for database-backed mode', () => {
    const response = createWorkerHealthResponse(
      'worker',
      'production',
      '0.1.0',
      { headers: {} } as never,
      {
        databaseConfigured: true,
        databaseHealthy: true,
        databaseDetail: 'database connected',
        persistenceMode: 'database',
        ticksCompleted: 5,
        lastTickAt: '2026-04-17T00:00:00.000Z',
        lastError: null,
        initialized: true,
        requiredEventBusConsumers: ['payments'],
        registeredEventBusConsumers: ['payments'],
        deliveryGuaranteesReady: true,
        durableConsumerGuardReady: true,
        webhookDeliveryExecutorReady: true
      }
    );

    expect(response.ok).toBe(true);
    expect(response.readiness.ready).toBe(true);
    expect(response.dependencies.database.state).toBe('healthy');
    expect(response.dependencies.worker.state).toBe('ready');
  });

  it('returns degraded readiness when worker is running without database health', () => {
    const response = createWorkerReadinessResponse(
      'worker',
      'staging',
      '0.1.0',
      { headers: {} } as never,
      {
        databaseConfigured: true,
        databaseHealthy: false,
        databaseDetail: 'connection refused',
        persistenceMode: 'database',
        ticksCompleted: 0,
        lastTickAt: null,
        lastError: 'connection refused',
        initialized: true,
        requiredEventBusConsumers: ['payments'],
        registeredEventBusConsumers: ['payments'],
        deliveryGuaranteesReady: true,
        durableConsumerGuardReady: true,
        webhookDeliveryExecutorReady: true
      }
    );

    expect(response.ok).toBe(false);
    expect(response.readiness.ready).toBe(false);
    expect(response.dependencies.worker.state).toBe('degraded');
  });

  it('returns live response before the loop is fully initialized', () => {
    const response = createWorkerLivenessResponse(
      'worker',
      'test',
      '0.1.0',
      { headers: {} } as never,
      false
    );

    expect(response.ok).toBe(true);
    expect(response.liveness.live).toBe(true);
    expect(response.liveness.initialized).toBe(false);
    expect(response.readiness.ready).toBe(false);
  });

  it('fails readiness when no event bus consumers are registered', () => {
    const response = createWorkerReadinessResponse(
      'worker',
      'production',
      '0.1.0',
      { headers: {} } as never,
      {
        databaseConfigured: true,
        databaseHealthy: true,
        databaseDetail: 'database connected',
        persistenceMode: 'database',
        ticksCompleted: 5,
        lastTickAt: '2026-07-12T00:00:00.000Z',
        lastError: null,
        initialized: true,
        requiredEventBusConsumers: ['payments', 'billing', 'webhooks'],
        registeredEventBusConsumers: [],
        deliveryGuaranteesReady: true,
        durableConsumerGuardReady: true,
        webhookDeliveryExecutorReady: true
      } as never
    );

    expect(response.ok).toBe(false);
    expect(response.readiness.ready).toBe(false);
    expect(response.readiness.productionReady).toBe(false);
    expect(response.dependencies.worker.state).toBe('degraded');
    expect(response.dependencies.worker.detail).toContain('missing event bus consumers');
  });

  it('fails readiness when the durable webhook executor is unavailable', () => {
    const response = createWorkerReadinessResponse(
      'worker',
      'production',
      '0.1.0',
      { headers: {} } as never,
      {
        databaseConfigured: true,
        databaseHealthy: true,
        databaseDetail: 'database connected',
        persistenceMode: 'database',
        ticksCompleted: 5,
        lastTickAt: '2026-07-12T00:00:00.000Z',
        lastError: null,
        initialized: true,
        requiredEventBusConsumers: ['payments'],
        registeredEventBusConsumers: ['payments'],
        deliveryGuaranteesReady: true,
        durableConsumerGuardReady: true,
        webhookDeliveryExecutorReady: false
      } as never
    );

    expect(response.ok).toBe(false);
    expect(response.readiness.ready).toBe(false);
    expect(response.dependencies.worker.state).toBe('degraded');
    expect(response.dependencies.worker.detail).toContain('webhook delivery executor');
  });
});
