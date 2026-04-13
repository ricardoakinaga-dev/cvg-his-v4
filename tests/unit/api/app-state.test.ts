import { describe, it, expect, beforeEach } from 'vitest';
import {
  getAppState,
  setAppState,
  isAppInitialized,
  areRepositoriesReady,
  isProductionReady,
  getPersistenceMode,
  type AppState
} from '../../../apps/api/src/app-state.js';

describe('app-state', () => {
  const initialState = getAppState();

  beforeEach(() => {
    // Reset to initial state before each test
    setAppState({
      persistenceMode: 'not-initialized',
      databaseConfigured: false,
      databaseHealthy: false,
      databaseDetail: 'Not initialized',
      repositoriesReady: false,
      repositoryCount: 0,
      workerReady: false,
      workerDetail: 'Worker status not initialized',
      productionReady: false,
      initialized: false
    });
  });

  describe('initial state', () => {
    it('starts with not-initialized persistence mode', () => {
      expect(getPersistenceMode()).toBe('not-initialized');
    });

    it('reports not initialized', () => {
      expect(isAppInitialized()).toBe(false);
    });

    it('reports repositories not ready', () => {
      expect(areRepositoriesReady()).toBe(false);
    });

    it('reports not production ready', () => {
      expect(isProductionReady()).toBe(false);
    });

    it('reports database not configured', () => {
      expect(getAppState().databaseConfigured).toBe(false);
    });

    it('reports database not healthy', () => {
      expect(getAppState().databaseHealthy).toBe(false);
    });
  });

  describe('setAppState / getAppState', () => {
    it('can set database configured to true', () => {
      setAppState({ databaseConfigured: true });
      expect(getAppState().databaseConfigured).toBe(true);
    });

    it('can set database healthy with detail', () => {
      setAppState({
        databaseConfigured: true,
        databaseHealthy: true,
        databaseDetail: 'Connected to postgres://localhost:5432/cvg_his_v2'
      });
      const state = getAppState();
      expect(state.databaseHealthy).toBe(true);
      expect(state.databaseDetail).toBe('Connected to postgres://localhost:5432/cvg_his_v2');
    });

    it('can set repositories ready with count', () => {
      setAppState({ repositoriesReady: true, repositoryCount: 11 });
      expect(getAppState().repositoriesReady).toBe(true);
      expect(getAppState().repositoryCount).toBe(11);
    });

    it('can set persistence mode to database', () => {
      setAppState({ persistenceMode: 'database' });
      expect(getPersistenceMode()).toBe('database');
    });

    it('can set persistence mode to in-memory', () => {
      setAppState({ persistenceMode: 'in-memory' });
      expect(getPersistenceMode()).toBe('in-memory');
    });

    it('can mark as initialized', () => {
      setAppState({ initialized: true });
      expect(isAppInitialized()).toBe(true);
    });

    it('can mark as production ready', () => {
      setAppState({ productionReady: true, initialized: true });
      expect(isProductionReady()).toBe(true);
    });

    it('can set worker ready', () => {
      setAppState({ workerReady: true, workerDetail: 'Worker connected to shared database' });
      expect(getAppState().workerReady).toBe(true);
      expect(getAppState().workerDetail).toBe('Worker connected to shared database');
    });

    it('can set worker degraded', () => {
      setAppState({
        workerReady: false,
        workerDetail: 'Worker dependency degraded: notification repository not ready'
      });
      expect(getAppState().workerReady).toBe(false);
      expect(getAppState().workerDetail).toContain('degraded');
    });

    it('merges partial updates correctly', () => {
      setAppState({ databaseConfigured: true, initialized: true });
      expect(getAppState().databaseConfigured).toBe(true);
      expect(getAppState().initialized).toBe(true);
      expect(getAppState().databaseHealthy).toBe(false); // unchanged
    });
  });

  describe('isAppInitialized', () => {
    it('returns false when initialized is false', () => {
      setAppState({ initialized: false });
      expect(isAppInitialized()).toBe(false);
    });

    it('returns true when initialized is true', () => {
      setAppState({ initialized: true });
      expect(isAppInitialized()).toBe(true);
    });
  });

  describe('areRepositoriesReady', () => {
    it('returns false when repositories not ready', () => {
      setAppState({ repositoriesReady: false });
      expect(areRepositoriesReady()).toBe(false);
    });

    it('returns true when repositories are ready', () => {
      setAppState({ repositoriesReady: true, repositoryCount: 7 });
      expect(areRepositoriesReady()).toBe(true);
    });
  });

  describe('isProductionReady', () => {
    it('returns false when productionReady is false', () => {
      setAppState({ productionReady: false });
      expect(isProductionReady()).toBe(false);
    });

    it('returns true when productionReady is true', () => {
      setAppState({
        productionReady: true,
        initialized: true,
        databaseHealthy: true,
        repositoriesReady: true
      });
      expect(isProductionReady()).toBe(true);
    });
  });

  describe('full initialization flow', () => {
    it('tracks the full boot sequence', () => {
      // Step 1: Not initialized
      expect(isAppInitialized()).toBe(false);

      // Step 2: Set in-memory mode
      setAppState({ persistenceMode: 'in-memory' });
      expect(getPersistenceMode()).toBe('in-memory');

      // Step 3: Repositories ready
      setAppState({ repositoriesReady: true, repositoryCount: 7 });
      expect(areRepositoriesReady()).toBe(true);

      // Step 4: Worker initialized
      setAppState({ workerReady: true, workerDetail: 'Worker can consume jobs' });
      expect(getAppState().workerReady).toBe(true);

      // Step 5: Fully initialized
      setAppState({ initialized: true });
      expect(isAppInitialized()).toBe(true);
    });

    it('tracks database fallback sequence', () => {
      // Not configured initially
      expect(getAppState().databaseConfigured).toBe(false);

      // Configure with no connection
      setAppState({
        databaseConfigured: true,
        databaseHealthy: false,
        databaseDetail: 'ECONNREFUSED',
        persistenceMode: 'in-memory'
      });
      expect(getPersistenceMode()).toBe('in-memory');
      expect(getAppState().databaseHealthy).toBe(false);

      // Connection succeeds
      setAppState({
        databaseHealthy: true,
        databaseDetail: 'postgres://localhost:5432/cvg_his_v2',
        persistenceMode: 'database',
        productionReady: true
      });
      expect(getAppState().databaseHealthy).toBe(true);
      expect(isProductionReady()).toBe(true);
    });
  });
});