import { describe, expect, it, vi } from 'vitest';

import { getInitializedDatabasePool } from '../../../apps/api/src/helpers/initialized-database-pool.ts';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

import { getPool } from '@cvg-his-v2/shared-database';

const getPoolMock = vi.mocked(getPool);

describe('getInitializedDatabasePool', () => {
  it('returns the pool when initialized', () => {
    const pool = { max: 1 };
    getPoolMock.mockReturnValue(pool as never);
    expect(getInitializedDatabasePool()).toBe(pool);
  });

  it('returns undefined when the pool is not initialized', () => {
    getPoolMock.mockImplementation(() => {
      throw new Error('Database pool not initialized. Call createDatabaseClient first.');
    });
    expect(getInitializedDatabasePool()).toBeUndefined();
  });

  it('rethrows unexpected pool errors', () => {
    getPoolMock.mockImplementation(() => {
      throw new Error('other failure');
    });
    expect(() => getInitializedDatabasePool()).toThrow('other failure');
  });
});
