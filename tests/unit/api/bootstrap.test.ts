import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.doUnmock('@cvg-his-v2/shared-database');
  });

  it('keeps in-memory repositories when skipDatabase is enabled', async () => {
    const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

    const result = await bootstrapServices({ skipDatabase: true });

    expect(result.repositoriesUseDatabase).toBe(false);
    expect(result.databaseHealthy).toBe(false);
    expect(result.databaseDetail).toContain('in-memory');
    expect(result.repositories.session).toBeDefined();
    expect(result.repositories.audit).toBeDefined();
  });

  it('keeps in-memory repositories when DATABASE_URL is absent', async () => {
    const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

    const result = await bootstrapServices({});

    expect(result.repositoriesUseDatabase).toBe(false);
    expect(result.databaseDetail).toContain('in-memory');
    expect(result.fileStorage).toBeDefined();
  });

  it('reports dependency health when the database check succeeds', async () => {
    vi.doMock('@cvg-his-v2/shared-database', async () => {
      const actual = await vi.importActual<object>('@cvg-his-v2/shared-database');
      return {
        ...actual,
        checkDatabaseHealth: vi.fn(async () => ({
          healthy: true,
          detail: 'Database connected'
        }))
      };
    });

    const { validateDependencies } = await import('../../../apps/api/src/bootstrap.ts');

    await expect(validateDependencies()).resolves.toEqual([
      { name: 'database', healthy: true, detail: 'Database connected' }
    ]);
  });

  it('captures dependency failures as unhealthy results', async () => {
    vi.doMock('@cvg-his-v2/shared-database', async () => {
      const actual = await vi.importActual<object>('@cvg-his-v2/shared-database');
      return {
        ...actual,
        checkDatabaseHealth: vi.fn(async () => {
          throw new Error('database unavailable');
        })
      };
    });

    const { validateDependencies } = await import('../../../apps/api/src/bootstrap.ts');

    await expect(validateDependencies()).resolves.toEqual([
      { name: 'database', healthy: false, detail: 'database unavailable' }
    ]);
  });
});
