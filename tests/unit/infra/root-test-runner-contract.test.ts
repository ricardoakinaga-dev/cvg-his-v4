import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildTestCommands,
  buildRootTestEnvironment,
  cleanupOwnedTestDatabases,
  filterExpectedJsdomWarnings,
  runRootTestSuite
} from '../../../scripts/run-root-test-suite.mjs';

const root = resolve(import.meta.dirname, '../../..');

function nodeCommand(source: string) {
  return { executable: process.execPath, args: ['-e', source] };
}

describe('canonical root test runner contract', () => {
  it('declares separate root and workspace stages behind the canonical test command', () => {
    const packageManifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      readonly scripts?: Readonly<Record<string, string>>;
    };

    expect(packageManifest.scripts?.test).toBe('node scripts/run-root-test-suite.mjs');
    expect(packageManifest.scripts?.['test:root']).toBe(
      'pnpm exec vitest run --config vitest.config.ts'
    );
    expect(packageManifest.scripts?.['test:workspaces']).toBe(
      "pnpm -r --filter '@cvg-his-v2/*' --filter '@cvg-his/*' run test"
    );
    expect(buildTestCommands('pnpm')).toEqual([
      { label: 'root', executable: 'pnpm', args: ['run', 'test:root'] },
      { label: 'workspaces', executable: 'pnpm', args: ['run', 'test:workspaces'] }
    ]);
  });

  it('runs the root stage before the workspace stage and propagates success', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-root-test-runner-success-'));
    const marker = resolve(directory, 'workspace-stage-ran');
    try {
      const status = await runRootTestSuite({
        cwd: directory,
        commands: [
          { label: 'root', ...nodeCommand('process.exit(0)') },
          {
            label: 'workspaces',
            ...nodeCommand(
              `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'workspace-stage-ran')`
            )
          }
        ]
      });

      expect(status).toBe(0);
      expect(existsSync(marker)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('known-bad: a failing root test stops the gate before workspaces run', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-root-test-runner-known-bad-'));
    const marker = resolve(directory, 'workspace-stage-must-not-run');
    let cleaned = false;
    try {
      const status = await runRootTestSuite({
        cwd: directory,
        commands: [
          { label: 'root', ...nodeCommand('process.exit(73)') },
          {
            label: 'workspaces',
            ...nodeCommand(
              `require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'unexpected')`
            )
          }
        ],
        cleanup: async () => {
          cleaned = true;
        }
      });

      expect(status).toBe(73);
      expect(existsSync(marker)).toBe(false);
      expect(cleaned).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('suppresses only the known JSDOM navigation warning', () => {
    expect(
      filterExpectedJsdomWarnings(
        'before\nNot implemented: navigation to another Document\nafter\nUnexpected warning\n'
      )
    ).toBe('before\nafter\nUnexpected warning\n');
  });

  it('requires an explicitly named disposable database and strips ambient database overrides', () => {
    expect(() =>
      buildRootTestEnvironment({ DATABASE_URL: 'postgres://shared.invalid/live' })
    ).toThrow(/TEST_DB_EPHEMERAL=1/);
    expect(() =>
      buildRootTestEnvironment({
        DATABASE_URL_TEST: 'postgres://test:secret@127.0.0.1:5433/cvg_test',
        TEST_DB_EPHEMERAL: '1',
        REQUIRE_TEST_DB: '1'
      })
    ).toThrow(/unique TEST_DB_SUFFIX/);

    const env = buildRootTestEnvironment({
      PATH: '/usr/bin',
      DATABASE_URL: 'postgres://shared.invalid/live',
      DATABASE_URL_TEST: 'postgres://test:secret@127.0.0.1:5433/cvg_test',
      PGHOST: 'shared.invalid',
      PGPORT: '5432',
      TEST_DB_SUFFIX: 'runner_123',
      TEST_DB_EPHEMERAL: '1',
      REQUIRE_TEST_DB: '1',
      SECRET_TOKEN: 'must-not-reach-child'
    });

    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.PGHOST).toBeUndefined();
    expect(env.PGPORT).toBeUndefined();
    expect(env.SECRET_TOKEN).toBeUndefined();
    expect(env.DATABASE_URL_TEST).toBe('postgres://test:secret@127.0.0.1:5433/cvg_test');
    expect(env.TEST_DB_SUFFIX).toMatch(/^runner_123_\d+_[a-f0-9]{8}$/);
    expect(env.TEST_DB_PROCESS_ISOLATION).toBe('1');
    expect(env.TEST_DB_RUN_ID).toMatch(/^[a-f0-9]{32}$/);
    expect(env.TEST_DB_URL_RESOLVED).toBeUndefined();
    expect(env.DOTENV_CONFIG_PATH).toBe('/dev/null');
    expect(() =>
      buildRootTestEnvironment({
        DATABASE_URL_TEST: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_prod',
        TEST_DB_EPHEMERAL: '1',
        REQUIRE_TEST_DB: '1',
        TEST_DB_SUFFIX: 'runner'
      })
    ).toThrow(/disposable test or e2e database/);
    expect(() =>
      buildRootTestEnvironment({
        DATABASE_URL_TEST: 'postgres://test:secret@127.0.0.1:5433/ordinary',
        TEST_DB_EPHEMERAL: '1',
        REQUIRE_TEST_DB: '1',
        TEST_DB_SUFFIX: 'runner'
      })
    ).toThrow(/disposable test or e2e database/);
  });

  it('cleans only databases recorded as owned by this runner invocation', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-owned-test-db-cleanup-'));
    const runId = 'a'.repeat(32);
    const databaseName = 'cvg_his_v2_test_runner_123_p4321';
    const ownerRoleName = `cvg_test_owner_${runId}_p4321`;
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    const statements: Array<{ sql: string; values?: readonly unknown[] }> = [];
    writeFileSync(markerPath, JSON.stringify({ runId, databaseName, ownerRoleName, ownerComment }));

    try {
      const cleaned = await cleanupOwnedTestDatabases({
        directory,
        runId,
        databaseUrl: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_test',
        createPool: (connectionString: string) => {
          expect(connectionString).toBe('postgres://test:secret@127.0.0.1:5433/postgres');
          return {
            query: async (sql: string, values?: readonly unknown[]) => {
              statements.push({ sql, values });
              if (sql.includes("shobj_description(oid, 'pg_authid')")) {
                return {
                  rowCount: 1,
                  rows: [
                    {
                      owner_comment: ownerComment,
                      rolcanlogin: false,
                      rolsuper: false,
                      rolcreatedb: false,
                      rolcreaterole: false,
                      rolreplication: false,
                      rolbypassrls: false,
                      rolinherit: false
                    }
                  ]
                };
              }
              if (sql.includes('FROM pg_database AS db')) {
                return {
                  rowCount: 1,
                  rows: [{ owner_role_name: ownerRoleName, owner_comment: ownerComment }]
                };
              }
              return { rowCount: 0, rows: [] };
            },
            end: async () => {}
          };
        }
      });

      expect(cleaned).toEqual([databaseName]);
      expect(statements.some(({ sql }) => sql.includes('pg_terminate_backend'))).toBe(true);
      expect(statements.some(({ sql }) => sql === `DROP DATABASE "${databaseName}"`)).toBe(true);
      expect(statements.some(({ sql }) => sql === `DROP ROLE "${ownerRoleName}"`)).toBe(true);
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('clears a write-ahead marker when a failed role transaction left no resources', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-empty-test-db-intent-'));
    const runId = 'b'.repeat(32);
    const databaseName = 'cvg_his_v2_test_role_transaction_123_p4321';
    const ownerRoleName = `cvg_test_owner_${runId}_p4321`;
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    writeFileSync(markerPath, JSON.stringify({ runId, databaseName, ownerRoleName, ownerComment }));

    try {
      const cleaned = await cleanupOwnedTestDatabases({
        directory,
        runId,
        databaseUrl: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_test',
        createPool: () => ({
          query: async () => ({ rowCount: 0, rows: [] }),
          end: async () => {}
        })
      });

      expect(cleaned).toEqual([databaseName]);
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('preserves the database if the recorded owner role has gained privileges', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-privileged-test-db-owner-'));
    const runId = 'c'.repeat(32);
    const databaseName = 'cvg_his_v2_test_runner_123_p4321';
    const ownerRoleName = `cvg_test_owner_${runId}_p4321`;
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    const statements: string[] = [];
    writeFileSync(markerPath, JSON.stringify({ runId, databaseName, ownerRoleName, ownerComment }));

    try {
      await expect(
        cleanupOwnedTestDatabases({
          directory,
          runId,
          databaseUrl: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_test',
          createPool: () => ({
            query: async (sql: string) => {
              statements.push(sql);
              if (sql.includes("shobj_description(oid, 'pg_authid')")) {
                return {
                  rowCount: 1,
                  rows: [
                    {
                      owner_comment: ownerComment,
                      rolcanlogin: false,
                      rolsuper: false,
                      rolcreatedb: true,
                      rolcreaterole: false,
                      rolreplication: false,
                      rolbypassrls: false,
                      rolinherit: false
                    }
                  ]
                };
              }
              return { rowCount: 0, rows: [] };
            },
            end: async () => {}
          })
        })
      ).rejects.toThrow(/Could not clean 1 owned test database/);
      expect(statements.some((sql) => sql.includes('FROM pg_database AS db'))).toBe(false);
      expect(statements.some((sql) => sql.startsWith('DROP DATABASE'))).toBe(false);
      expect(existsSync(markerPath)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('preserves a database when its recorded name has a different PostgreSQL owner', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-foreign-owned-test-db-'));
    const runId = 'd'.repeat(32);
    const databaseName = 'cvg_his_v2_test_runner_123_p4321';
    const ownerRoleName = `cvg_test_owner_${runId}_p4321`;
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    const statements: string[] = [];
    writeFileSync(markerPath, JSON.stringify({ runId, databaseName, ownerRoleName, ownerComment }));

    try {
      await expect(
        cleanupOwnedTestDatabases({
          directory,
          runId,
          databaseUrl: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_test',
          createPool: () => ({
            query: async (sql: string) => {
              statements.push(sql);
              if (sql.includes("shobj_description(oid, 'pg_authid')")) {
                return {
                  rowCount: 1,
                  rows: [
                    {
                      owner_comment: ownerComment,
                      rolcanlogin: false,
                      rolsuper: false,
                      rolcreatedb: false,
                      rolcreaterole: false,
                      rolreplication: false,
                      rolbypassrls: false,
                      rolinherit: false
                    }
                  ]
                };
              }
              if (sql.includes('FROM pg_database AS db')) {
                return {
                  rowCount: 1,
                  rows: [{ owner_role_name: 'someone_else', owner_comment: 'unrelated' }]
                };
              }
              return { rowCount: 0, rows: [] };
            },
            end: async () => {}
          })
        })
      ).rejects.toThrow(/Could not clean 1 owned test database/);
      expect(statements.some((sql) => sql.startsWith('DROP DATABASE'))).toBe(false);
      expect(statements.some((sql) => sql.startsWith('DROP ROLE'))).toBe(false);
      expect(existsSync(markerPath)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('leaves a database untouched when its ownership marker belongs to another run', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-unowned-test-db-cleanup-'));
    const runId = 'a'.repeat(32);
    const databaseName = 'cvg_his_v2_test_runner_123_p4321';
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    let poolCreated = false;
    writeFileSync(markerPath, JSON.stringify({ runId: 'b'.repeat(32), databaseName }));

    try {
      await expect(
        cleanupOwnedTestDatabases({
          directory,
          runId,
          databaseUrl: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_test',
          createPool: () => {
            poolCreated = true;
            throw new Error('cleanup pool must not be reached');
          }
        })
      ).rejects.toThrow(/belong to another run/);
      expect(poolCreated).toBe(false);
      expect(existsSync(markerPath)).toBe(true);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('cancels the current stage and waits for its process tree to exit', async () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'cvg-root-test-runner-cancel-'));
    const controller = new AbortController();
    const runId = 'c'.repeat(32);
    const databaseName = 'cvg_his_v2_test_cancel_123_p4321';
    const ownerRoleName = `cvg_test_owner_${runId}_p4321`;
    const ownerComment = `cvg-test-db-owner:${runId}:${databaseName}`;
    const markerPath = join(
      directory,
      `${createHash('sha256').update(databaseName).digest('hex')}.json`
    );
    const droppedDatabases: string[] = [];
    const cancellation = setTimeout(() => controller.abort(), 250);
    try {
      const status = await runRootTestSuite({
        commands: [
          nodeCommand(
            `require('node:fs').writeFileSync(${JSON.stringify(markerPath)}, ${JSON.stringify(JSON.stringify({ runId, databaseName, ownerRoleName, ownerComment }))}); setInterval(() => {}, 1000)`
          )
        ],
        abortSignal: controller.signal,
        cleanup: async () =>
          cleanupOwnedTestDatabases({
            directory,
            runId,
            databaseUrl: 'postgres://test:secret@127.0.0.1:5433/cvg_his_v2_test',
            createPool: () => ({
              query: async (sql: string, values?: readonly unknown[]) => {
                if (sql.startsWith('DROP DATABASE')) {
                  droppedDatabases.push(sql.slice('DROP DATABASE '.length).replaceAll('"', ''));
                }
                if (sql.includes("shobj_description(oid, 'pg_authid')")) {
                  return {
                    rowCount: 1,
                    rows: [
                      {
                        owner_comment: ownerComment,
                        rolcanlogin: false,
                        rolsuper: false,
                        rolcreatedb: false,
                        rolcreaterole: false,
                        rolreplication: false,
                        rolbypassrls: false,
                        rolinherit: false
                      }
                    ]
                  };
                }
                if (sql.includes('FROM pg_database AS db')) {
                  return {
                    rowCount: 1,
                    rows: [{ owner_role_name: ownerRoleName, owner_comment: ownerComment }]
                  };
                }
                return { rowCount: 0, rows: [], values };
              },
              end: async () => {}
            })
          })
      });
      expect(status).toBe(143);
      expect(droppedDatabases).toEqual([databaseName]);
      expect(existsSync(markerPath)).toBe(false);
    } finally {
      clearTimeout(cancellation);
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('keeps workspace test builds reusable after the CI build stage', () => {
    const apiManifest = JSON.parse(
      readFileSync(resolve(root, 'apps/api/package.json'), 'utf8')
    ) as {
      readonly scripts?: Readonly<Record<string, string>>;
    };
    const workerManifest = JSON.parse(
      readFileSync(resolve(root, 'apps/worker/package.json'), 'utf8')
    ) as {
      readonly scripts?: Readonly<Record<string, string>>;
    };
    const workflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');

    expect(apiManifest.scripts?.test).toContain('CVG_WORKSPACE_BUILD_PREPARED');
    expect(workerManifest.scripts?.test).toContain('CVG_WORKSPACE_BUILD_PREPARED');
    expect(apiManifest.scripts?.test).toContain('--test-reporter=dot');
    expect(workerManifest.scripts?.test).toContain('--test-reporter=dot');
    expect(workflow).toContain('CVG_WORKSPACE_BUILD_PREPARED: 1');
    expect(workflow).toContain('TEST_DB_EPHEMERAL: 1');
    expect(workflow).toContain(
      "TEST_DB_SUFFIX: 'ci_${{ github.run_id }}_${{ github.run_attempt }}'"
    );
  });
});
