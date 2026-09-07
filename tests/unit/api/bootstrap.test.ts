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

  it.each(['production', 'prod', 'staging', 'stage'])(
    'fails closed instead of using in-memory repositories in %s',
    async (environment) => {
      const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

      await expect(
        bootstrapServices({
          environment,
          skipDatabase: true
        })
      ).rejects.toThrow(/production-like|DATABASE_URL|in-memory/i);
    }
  );

  it.each(['production', 'prod', 'staging', 'stage'])(
    'fails closed when the database is unavailable in %s',
    async (environment) => {
      const { bootstrapServices, shutdownServices } =
        await import('../../../apps/api/src/bootstrap.ts');

      try {
        await expect(
          bootstrapServices({
            environment,
            databaseUrl: 'postgresql://invalid:invalid@127.0.0.1:1/unavailable',
            maxRetries: 1,
            retryDelayMs: 0
          })
        ).rejects.toThrow(/database|connection|production-like/i);
      } finally {
        await shutdownServices();
      }
    }
  );

  it.each(['production', 'prod', 'staging', 'stage'])(
    'does not allow an explicit development option to downgrade NODE_ENV=%s',
    async (environment) => {
      const previousEnvironment = process.env.NODE_ENV;
      process.env.NODE_ENV = environment;
      try {
        const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

        await expect(
          bootstrapServices({
            environment: 'development',
            skipDatabase: true
          })
        ).rejects.toThrow(/production-like|DATABASE_URL|in-memory/i);
      } finally {
        if (previousEnvironment === undefined) delete process.env.NODE_ENV;
        else process.env.NODE_ENV = previousEnvironment;
      }
    }
  );

  it.each(['DATABASE_REQUIRE_RLS_ROLE', 'DATABASE_REQUIRE_SCHEMA', 'REQUIRE_TEST_DB'] as const)(
    'fails closed when %s is enabled without a database',
    async (flag) => {
      const previousRlsRole = process.env.DATABASE_REQUIRE_RLS_ROLE;
      const previousSchema = process.env.DATABASE_REQUIRE_SCHEMA;
      const previousRequireTestDb = process.env.REQUIRE_TEST_DB;
      delete process.env.DATABASE_REQUIRE_RLS_ROLE;
      delete process.env.DATABASE_REQUIRE_SCHEMA;
      delete process.env.REQUIRE_TEST_DB;
      process.env[flag] = '1';
      try {
        const { bootstrapServices } = await import('../../../apps/api/src/bootstrap.ts');

        await expect(
          bootstrapServices({ environment: 'development', skipDatabase: true })
        ).rejects.toThrow(/production-like|DATABASE_URL|in-memory/i);
      } finally {
        if (previousRlsRole === undefined) delete process.env.DATABASE_REQUIRE_RLS_ROLE;
        else process.env.DATABASE_REQUIRE_RLS_ROLE = previousRlsRole;
        if (previousSchema === undefined) delete process.env.DATABASE_REQUIRE_SCHEMA;
        else process.env.DATABASE_REQUIRE_SCHEMA = previousSchema;
        if (previousRequireTestDb === undefined) delete process.env.REQUIRE_TEST_DB;
        else process.env.REQUIRE_TEST_DB = previousRequireTestDb;
      }
    }
  );

  it('fails closed instead of using in-memory repositories when REQUIRE_TEST_DB rejects the database', async () => {
    const previousRequireTestDb = process.env.REQUIRE_TEST_DB;
    process.env.REQUIRE_TEST_DB = '1';

    const { bootstrapServices, shutdownServices } =
      await import('../../../apps/api/src/bootstrap.ts');

    try {
      await expect(
        bootstrapServices({
          environment: 'development',
          databaseUrl: 'postgresql://invalid:invalid@127.0.0.1:1/require_test_db_unavailable',
          maxRetries: 1,
          retryDelayMs: 0
        })
      ).rejects.toThrow(/database|connection|refusing in-memory/i);
    } finally {
      await shutdownServices();
      if (previousRequireTestDb === undefined) delete process.env.REQUIRE_TEST_DB;
      else process.env.REQUIRE_TEST_DB = previousRequireTestDb;
    }
  });

  it('keeps production readiness tied to the persisted commission report schema', async () => {
    const { findMissingProductionRepositories, productionDatabaseRepositoryKeys } =
      await import('../../../apps/api/src/bootstrap.ts');

    expect(productionDatabaseRepositoryKeys).toContain('commissionCalculations');
    expect(
      findMissingProductionRepositories({
        commissionCalculations: undefined
      })
    ).toContain('commissionCalculations');
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
