import { describe, it, expect } from 'vitest';
import {
  describeChaosExperiment,
  resolveOperationalRuntimeState,
  type OperationalRuntimeState
} from '../../../apps/api/src/chaos-operational-state.js';
import { DATABASE_FAILURE_ID, REDIS_FAILURE_ID, WORKER_FAILURE_ID, API_LATENCY_ID, NETWORK_LATENCY_ID } from '@cvg-his-v2/chaos';
import type { AppState } from '../../../apps/api/src/app-state.js';

function createMockAppState(overrides: Partial<AppState> = {}): AppState {
  return {
    productionReady: true,
    databaseHealthy: true,
    databaseDetail: 'Database is healthy',
    workerReady: true,
    workerDetail: 'Worker is ready',
    persistenceMode: 'database',
    redisHealthy: true,
    redisDetail: 'Redis is healthy',
    redisConfigured: true,
    ...overrides
  } as AppState;
}

describe('chaos-operational-state', () => {
  describe('describeChaosExperiment', () => {
    it('returns descriptor for DATABASE_FAILURE_ID', () => {
      const descriptor = describeChaosExperiment(DATABASE_FAILURE_ID);
      expect(descriptor).toBeDefined();
      expect(descriptor?.runbook.title).toBe('Database Failure Runbook');
      expect(descriptor?.indicators).toContain('app_database_healthy');
      expect(descriptor?.summary).toContain('in-memory');
    });

    it('returns descriptor for REDIS_FAILURE_ID', () => {
      const descriptor = describeChaosExperiment(REDIS_FAILURE_ID);
      expect(descriptor).toBeDefined();
      expect(descriptor?.runbook.title).toBe('Redis Failure Runbook');
      expect(descriptor?.indicators).toContain('app_redis_healthy');
    });

    it('returns descriptor for WORKER_FAILURE_ID', () => {
      const descriptor = describeChaosExperiment(WORKER_FAILURE_ID);
      expect(descriptor).toBeDefined();
      expect(descriptor?.runbook.title).toBe('Incident Response Runbook');
      expect(descriptor?.indicators).toContain('readiness');
    });

    it('returns descriptor for API_LATENCY_ID', () => {
      const descriptor = describeChaosExperiment(API_LATENCY_ID);
      expect(descriptor).toBeDefined();
      expect(descriptor?.runbook.title).toBe('API Failure Runbook');
    });

    it('returns descriptor for NETWORK_LATENCY_ID', () => {
      const descriptor = describeChaosExperiment(NETWORK_LATENCY_ID);
      expect(descriptor).toBeDefined();
      expect(descriptor?.runbook.title).toBe('API Failure Runbook');
    });

    it('returns undefined for unknown experiment ID', () => {
      const descriptor = describeChaosExperiment('unknown-experiment');
      expect(descriptor).toBeUndefined();
    });
  });

  describe('resolveOperationalRuntimeState', () => {
    const baseInput = {
      activeExperimentIds: [] as readonly string[],
      runtimeDistributedStateEnabled: true,
      redisUrl: 'redis://localhost:6379/0'
    };

    it('returns healthy state when no experiments are active', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        appState
      });

      expect(result.databaseHealthy).toBe(true);
      expect(result.databaseDetail).toBe('Database is healthy');
      expect(result.workerReady).toBe(true);
      expect(result.workerDetail).toBe('Worker is ready');
      expect(result.productionReady).toBe(true);
      expect(result.redisHealthy).toBe(true);
      expect(result.redisConfigured).toBe(true);
      expect(result.rateLimiterMode).toBe('redis');
    });

    it('degrades database when DATABASE_FAILURE_ID is active', () => {
      const appState = createMockAppState({
        databaseHealthy: true,
        databaseDetail: 'Database is healthy'
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [DATABASE_FAILURE_ID],
        appState
      });

      expect(result.databaseHealthy).toBe(false);
      expect(result.databaseDetail).toContain('Simulated database failure');
      expect(result.databaseDetail).toContain(DATABASE_FAILURE_ID);
    });

    it('sets persistenceMode to in-memory when DATABASE_FAILURE_ID is active', () => {
      const appState = createMockAppState({
        persistenceMode: 'database'
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [DATABASE_FAILURE_ID],
        appState
      });

      expect(result.persistenceMode).toBe('in-memory');
    });

    it('keeps not-initialized persistenceMode when DATABASE_FAILURE_ID is active and mode is not-initialized', () => {
      const appState = createMockAppState({
        persistenceMode: 'not-initialized'
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [DATABASE_FAILURE_ID],
        appState
      });

      expect(result.persistenceMode).toBe('not-initialized');
    });

    it('blocks productionReady when database is degraded', () => {
      const appState = createMockAppState({
        productionReady: true,
        databaseHealthy: true,
        persistenceMode: 'database'
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [DATABASE_FAILURE_ID],
        appState
      });

      expect(result.productionReady).toBe(false);
    });

    it('degrades worker when WORKER_FAILURE_ID is active', () => {
      const appState = createMockAppState({
        workerReady: true,
        workerDetail: 'Worker is ready'
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [WORKER_FAILURE_ID],
        appState
      });

      expect(result.workerReady).toBe(false);
      expect(result.workerDetail).toContain('Simulated worker failure');
      expect(result.workerDetail).toContain(WORKER_FAILURE_ID);
    });

    it('blocks productionReady when worker is degraded', () => {
      const appState = createMockAppState({
        productionReady: true,
        workerReady: true
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [WORKER_FAILURE_ID],
        appState
      });

      expect(result.productionReady).toBe(false);
    });

    it('sets rateLimiterMode to in-memory-fallback when REDIS_FAILURE_ID is active and redis is configured', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [REDIS_FAILURE_ID],
        appState
      });

      expect(result.rateLimiterMode).toBe('in-memory-fallback');
      expect(result.redisHealthy).toBe(false);
      expect(result.redisDetail).toContain('Simulated Redis failure');
    });

    it('sets redisHealthy to false when redis is not configured', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        redisUrl: undefined,
        appState
      });

      expect(result.redisConfigured).toBe(false);
      expect(result.redisHealthy).toBe(false);
      expect(result.redisDetail).toBe('Redis not configured for this runtime.');
    });

    it('shows redis as healthy when redis is configured and REDIS_FAILURE_ID is not active', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [],
        appState
      });

      expect(result.redisHealthy).toBe(true);
      expect(result.redisDetail).toBe('Redis wired and healthy for distributed runtime state.');
    });

    it('uses in-memory rate limiter when runtimeDistributedStateEnabled is false', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        runtimeDistributedStateEnabled: false,
        appState
      });

      expect(result.rateLimiterMode).toBe('in-memory');
      expect(result.redisDetail).toBe('Redis configured, but distributed runtime state is disabled.');
    });

    it('uses in-memory rate limiter when redisUrl is empty string', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        redisUrl: '',
        appState
      });

      expect(result.rateLimiterMode).toBe('in-memory');
      expect(result.redisConfigured).toBe(false);
    });

    it('returns correct redisDetail for configured redis with disabled distributed state', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        runtimeDistributedStateEnabled: false,
        appState
      });

      expect(result.redisDetail).toBe('Redis configured, but distributed runtime state is disabled.');
    });

    it('combines multiple experiment effects correctly', () => {
      const appState = createMockAppState({
        productionReady: true,
        databaseHealthy: true,
        workerReady: true
      });
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: [DATABASE_FAILURE_ID, WORKER_FAILURE_ID],
        appState
      });

      expect(result.databaseHealthy).toBe(false);
      expect(result.workerReady).toBe(false);
      expect(result.productionReady).toBe(false);
      expect(result.persistenceMode).toBe('in-memory');
    });

    it('returns activeExperimentIds in result', () => {
      const appState = createMockAppState();
      const experiments = [DATABASE_FAILURE_ID, REDIS_FAILURE_ID] as const;
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        activeExperimentIds: experiments,
        appState
      });

      expect(result.activeExperimentIds).toEqual(experiments);
    });

    it('returns runtimeDistributedStateEnabled in result', () => {
      const appState = createMockAppState();
      const result = resolveOperationalRuntimeState({
        ...baseInput,
        runtimeDistributedStateEnabled: true,
        appState
      });

      expect(result.runtimeDistributedStateEnabled).toBe(true);
    });
  });
});