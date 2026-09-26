import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { isDisposableTestDatabaseName, resolveTestDatabaseUrl } from '../../setup/env.js';

function stubOwnerDatabaseEnvironment(databaseName: string, runId: string): void {
  vi.stubEnv('DATABASE_URL_TEST', `postgres://test:test@127.0.0.1:5433/${databaseName}`);
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('TEST_DB_EPHEMERAL', '1');
  vi.stubEnv('TEST_DB_SUFFIX', '');
  vi.stubEnv('TEST_DB_RUN_ID', runId);
  vi.stubEnv('TEST_DB_URL_RESOLVED', '1');
}

describe('test database environment resolution', () => {
  const runtime = { pid: 4321, ppid: 1234 };
  const baseUrl = 'postgres://test:test@127.0.0.1:5433/cvg_his_v2_test';

  it('accepts only simple database names with a standalone test or e2e marker', () => {
    expect(isDisposableTestDatabaseName('cvg_his_v2_test')).toBe(true);
    expect(isDisposableTestDatabaseName('cvg_his_v2_e2e')).toBe(true);
    expect(isDisposableTestDatabaseName('ordinary')).toBe(false);
    expect(isDisposableTestDatabaseName('latest_testing')).toBe(false);
    expect(isDisposableTestDatabaseName('cvg_his_v2_prod')).toBe(false);
    expect(isDisposableTestDatabaseName('cvg_his_v2_test;DROP_DATABASE')).toBe(false);
  });

  it('refuses an ordinary explicit database before opening an administrative connection', async () => {
    vi.stubEnv('DATABASE_URL_TEST', 'postgres://test:test@127.0.0.1:5433/ordinary');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('TEST_DB_EPHEMERAL', '1');
    vi.stubEnv('TEST_DB_SUFFIX', '');
    vi.stubEnv('TEST_DB_URL_RESOLVED', '1');

    try {
      vi.resetModules();
      const { ensureTestDatabase } = await import('../../db/db-admin.js');
      await expect(ensureTestDatabase()).rejects.toThrow(/standalone test or e2e marker/);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('writes ownership intent first and rolls back role creation if its response is lost', async () => {
    const databaseName = 'cvg_his_v2_test_owner_transaction';
    const runId = 'e'.repeat(32);
    const statements: string[] = [];
    let recordedOwnership: readonly [string, string] | undefined;
    stubOwnerDatabaseEnvironment(databaseName, runId);
    vi.doMock('pg', () => ({
      Pool: class {
        async connect() {
          return {
            query: async (sql: string) => {
              statements.push(sql);
              if (sql.startsWith('CREATE ROLE')) {
                throw new Error('ambiguous CREATE ROLE response');
              }
              return { rowCount: 0, rows: [] };
            },
            release: () => statements.push('RELEASE')
          };
        }

        async query(sql: string) {
          statements.push(sql);
          return { rowCount: 0, rows: [] };
        }

        async end() {}
      }
    }));

    try {
      vi.resetModules();
      const { ensureTestDatabase } = await import('../../db/db-admin.js');
      await expect(
        ensureTestDatabase((ownerRoleName, ownerComment) => {
          statements.push('WRITE_OWNERSHIP_MARKER');
          recordedOwnership = [ownerRoleName, ownerComment];
        })
      ).rejects.toThrow(/ambiguous CREATE ROLE response/);

      expect(statements).toEqual([
        'WRITE_OWNERSHIP_MARKER',
        'BEGIN',
        expect.stringMatching(/^CREATE ROLE "cvg_test_owner_e{32}_p\d+" NOLOGIN NOINHERIT$/),
        'ROLLBACK',
        'RELEASE'
      ]);
      expect(recordedOwnership).toEqual([
        `cvg_test_owner_${runId}_p${process.pid}`,
        `cvg-test-db-owner:${runId}:${databaseName}`
      ]);
      expect(statements.some((sql) => sql.startsWith('CREATE DATABASE'))).toBe(false);
    } finally {
      vi.doUnmock('pg');
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('rejects owner-tag or privilege drift before dropping its database', async () => {
    const databaseName = 'cvg_his_v2_test_owner_privileges';
    const runId = 'f'.repeat(32);
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const statements: string[] = [];
    let databaseExists = false;
    let ownerRoleExists = false;
    let ownerCanCreateDatabase = false;
    let ownerTagMatches = true;
    stubOwnerDatabaseEnvironment(databaseName, runId);
    vi.doMock('pg', () => ({
      Pool: class {
        async connect() {
          return {
            query: async (sql: string) => {
              statements.push(sql);
              if (sql === 'COMMIT') ownerRoleExists = true;
              return { rowCount: 0, rows: [] };
            },
            release: () => statements.push('RELEASE')
          };
        }

        async query(sql: string) {
          statements.push(sql);
          if (sql.startsWith('CREATE DATABASE')) databaseExists = true;
          if (sql.startsWith('DROP DATABASE')) databaseExists = false;
          if (sql.startsWith('DROP ROLE')) ownerRoleExists = false;
          if (sql.includes("shobj_description(oid, 'pg_authid')")) {
            return {
              rowCount: ownerRoleExists ? 1 : 0,
              rows: ownerRoleExists
                ? [
                    {
                      owner_comment: ownerTagMatches ? ownerComment : 'changed-owner-tag',
                      rolcanlogin: false,
                      rolsuper: false,
                      rolcreatedb: ownerCanCreateDatabase,
                      rolcreaterole: false,
                      rolreplication: false,
                      rolbypassrls: false,
                      rolinherit: false
                    }
                  ]
                : []
            };
          }
          if (sql.includes('FROM pg_database AS db')) {
            return { rowCount: databaseExists ? 1 : 0, rows: [] };
          }
          if (sql.startsWith('SELECT 1 FROM pg_database WHERE datname')) {
            return { rowCount: databaseExists ? 1 : 0, rows: [] };
          }
          return { rowCount: 0, rows: [] };
        }

        async end() {}
      }
    }));

    try {
      vi.resetModules();
      const { dropTestDatabase, ensureTestDatabase } = await import('../../db/db-admin.js');
      await ensureTestDatabase();

      ownerTagMatches = false;
      await expect(dropTestDatabase()).rejects.toThrow(/no longer has this run's ownership tag/);
      expect(statements.some((sql) => sql.startsWith('DROP DATABASE'))).toBe(false);
      expect(databaseExists).toBe(true);

      ownerTagMatches = true;
      ownerCanCreateDatabase = true;

      await expect(dropTestDatabase()).rejects.toThrow(/unexpected privileges/);
      expect(statements.some((sql) => sql.startsWith('DROP DATABASE'))).toBe(false);
      expect(databaseExists).toBe(true);

      ownerCanCreateDatabase = false;
      await dropTestDatabase();
      expect(statements.some((sql) => sql.startsWith('DROP DATABASE'))).toBe(true);
      expect(statements.some((sql) => sql.startsWith('DROP ROLE'))).toBe(true);
      expect(databaseExists).toBe(false);
      expect(ownerRoleExists).toBe(false);
    } finally {
      vi.doUnmock('pg');
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('retains the parent recovery marker when teardown rejects a mismatched owner tag', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-owner-tag-recovery-'));
    const databaseName = 'cvg_his_v2_test_owner_tag_recovery';
    const runId = 'a'.repeat(32);
    const ownerRoleName = `cvg_test_owner_${runId}_p${process.pid}`;
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    let dropShouldFail = true;
    stubOwnerDatabaseEnvironment(databaseName, runId);
    vi.stubEnv('TEST_DB_OWNERSHIP_DIRECTORY', directory);
    writeFileSync(markerPath, JSON.stringify({ runId, databaseName, ownerRoleName, ownerComment }));
    vi.doMock('../../db/db-admin.js', () => ({
      closePools: async () => {},
      withTestDatabaseLock: async (callback: () => Promise<void>) => callback(),
      dropTestDatabase: async () => {
        if (dropShouldFail) throw new Error('owner tag mismatch');
      }
    }));

    try {
      vi.resetModules();
      const { globalTeardown } = await import('../../setup/global-setup.js');
      await expect(globalTeardown()).rejects.toThrow(/owner tag mismatch/);
      expect(existsSync(markerPath)).toBe(true);

      dropShouldFail = false;
      await globalTeardown();
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      vi.doUnmock('../../db/db-admin.js');
      vi.unstubAllEnvs();
      vi.resetModules();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('rejects an ordinary explicit ephemeral target before acquiring the setup lock', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-invalid-test-db-target-'));
    const withTestDatabaseLock = vi.fn(async (callback: () => Promise<unknown>) => callback());
    const ensureTestDatabase = vi.fn();
    vi.stubEnv('DATABASE_URL_TEST', 'postgres://test:test@127.0.0.1:5433/ordinary');
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('TEST_DB_EPHEMERAL', '1');
    vi.stubEnv('TEST_DB_SUFFIX', '');
    vi.stubEnv('TEST_DB_URL_RESOLVED', '1');
    vi.stubEnv('TEST_DB_RUN_ID', 'c'.repeat(32));
    vi.stubEnv('TEST_DB_OWNERSHIP_DIRECTORY', directory);
    vi.stubEnv('REQUIRE_TEST_DB', '1');
    vi.doMock('../../db/db-admin.js', () => ({
      closePools: async () => {},
      dropTestDatabase: async () => {},
      ensureTestDatabase,
      getAdminPool: vi.fn(),
      getTestPool: vi.fn(),
      withTestClusterSetupLock: async (callback: () => Promise<unknown>) => callback(),
      withTestDatabaseLock
    }));

    try {
      vi.resetModules();
      const { default: globalSetup } = await import('../../setup/global-setup.js');
      await expect(globalSetup()).rejects.toThrow(/standalone test or e2e marker/);
      expect(withTestDatabaseLock).not.toHaveBeenCalled();
      expect(ensureTestDatabase).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock('../../db/db-admin.js');
      vi.unstubAllEnvs();
      vi.resetModules();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('persists default ownership intent for a direct ephemeral invocation without marker variables', async () => {
    const originalRunId = process.env.TEST_DB_RUN_ID;
    const originalDirectory = process.env.TEST_DB_OWNERSHIP_DIRECTORY;
    delete process.env.TEST_DB_RUN_ID;
    delete process.env.TEST_DB_OWNERSHIP_DIRECTORY;

    const databaseName = 'cvg_his_v2_test_direct_marker';
    vi.stubEnv('DATABASE_URL_TEST', `postgres://test:test@127.0.0.1:5433/${databaseName}`);
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('TEST_DB_EPHEMERAL', '1');
    vi.stubEnv('TEST_DB_SUFFIX', '');
    vi.stubEnv('TEST_DB_URL_RESOLVED', '1');
    vi.stubEnv('REQUIRE_TEST_DB', '1');
    vi.doMock('../../db/db-admin.js', () => ({
      closePools: async () => {},
      dropTestDatabase: async () => {
        throw new Error('injected teardown failure');
      },
      ensureTestDatabase: async (
        registerOwnership: (roleName: string, comment: string) => void
      ) => {
        const { TEST_DB_OWNER_COMMENT, TEST_DB_OWNER_ROLE } = await import('../../setup/env.js');
        registerOwnership(TEST_DB_OWNER_ROLE, TEST_DB_OWNER_COMMENT);
      },
      getAdminPool: vi.fn(),
      getTestPool: vi.fn(),
      withTestClusterSetupLock: async (callback: () => Promise<unknown>) => callback(),
      withTestDatabaseLock: async (callback: () => Promise<unknown>) => callback()
    }));
    vi.doMock('../../db/db-schema.js', () => ({
      applyDrizzleMigration: async () => {
        throw new Error('injected migration failure');
      },
      applySeed: async () => {}
    }));

    let ownershipDirectory = '';
    try {
      vi.resetModules();
      const environment = await import('../../setup/env.js');
      ownershipDirectory = environment.DEFAULT_TEST_DB_OWNERSHIP_DIRECTORY;
      const markerPath = join(
        ownershipDirectory,
        `${createHash('sha256').update(databaseName).digest('hex')}.json`
      );
      const { default: globalSetup } = await import('../../setup/global-setup.js');

      await expect(globalSetup()).rejects.toThrow(
        /injected migration failure.*injected teardown failure/
      );
      expect(existsSync(markerPath)).toBe(true);
      expect(JSON.parse(readFileSync(markerPath, 'utf8'))).toEqual({
        runId: environment.TEST_DB_RUN_ID,
        databaseName,
        ownerRoleName: environment.TEST_DB_OWNER_ROLE,
        ownerComment: environment.TEST_DB_OWNER_COMMENT
      });
    } finally {
      vi.doUnmock('../../db/db-admin.js');
      vi.doUnmock('../../db/db-schema.js');
      vi.unstubAllEnvs();
      if (originalRunId === undefined) delete process.env.TEST_DB_RUN_ID;
      else process.env.TEST_DB_RUN_ID = originalRunId;
      if (originalDirectory === undefined) delete process.env.TEST_DB_OWNERSHIP_DIRECTORY;
      else process.env.TEST_DB_OWNERSHIP_DIRECTORY = originalDirectory;
      vi.resetModules();
      if (ownershipDirectory) rmSync(ownershipDirectory, { recursive: true, force: true });
    }
  });

  it('keeps one database for a regular ephemeral Vitest invocation', () => {
    expect(
      resolveTestDatabaseUrl(
        {
          DATABASE_URL_TEST: baseUrl,
          TEST_DB_EPHEMERAL: '1',
          TEST_DB_SUFFIX: 'critical_base'
        },
        runtime
      )
    ).toBe('postgres://test:test@127.0.0.1:5433/cvg_his_v2_test_critical_base');
  });

  it('adds process isolation only when the aggregate runner requests it', () => {
    expect(
      resolveTestDatabaseUrl(
        {
          DATABASE_URL_TEST: baseUrl,
          TEST_DB_EPHEMERAL: '1',
          TEST_DB_SUFFIX: 'aggregate',
          TEST_DB_PROCESS_ISOLATION: '1'
        },
        runtime
      )
    ).toBe('postgres://test:test@127.0.0.1:5433/cvg_his_v2_test_aggregate_p4321');
  });

  it('reuses a URL published by global setup without deriving another worker database', () => {
    const resolvedUrl = 'postgres://test:test@127.0.0.1:5433/cvg_his_v2_test_critical_base';

    expect(
      resolveTestDatabaseUrl(
        {
          DATABASE_URL_TEST: resolvedUrl,
          TEST_DB_EPHEMERAL: '1',
          TEST_DB_SUFFIX: 'critical_base',
          TEST_DB_PROCESS_ISOLATION: '1',
          TEST_DB_URL_RESOLVED: '1'
        },
        runtime
      )
    ).toBe(resolvedUrl);
  });
});
