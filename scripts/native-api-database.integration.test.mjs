import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { withPrivatePostgres } from './lib/private-postgres.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('canonical API schema and seed are repeatable in an owned PostgreSQL cluster', { timeout: 300000 }, async () => {
  const migrationDirectory = join(root, 'packages/db/migrations');
  const expected = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql') && !name.endsWith('.revert.sql') && !name.endsWith('.seed.sql'))
    .sort().map((name) => ({ migration_name: name.slice(0, -4), hash: createHash('sha256').update(readFileSync(join(migrationDirectory, name))).digest('hex') }));
  const result = await withPrivatePostgres({
    binDir: process.env.NATIVE_POSTGRES_BIN,
    shareDir: process.env.NATIVE_POSTGRES_SHARE,
    libraryDir: process.env.NATIVE_POSTGRES_LIB,
    run: async ({ environment, directory, databaseUrl }) => {
      // Deliberately exclude inherited provider credentials, migration targets
      // and database URLs. The canonical DB package also has explicit dotenv
      // loading, disabled by its supported process-runner boundary below.
      const env = {
        PATH: process.env.PATH, ...environment, CVG_CRITICAL_PROCESS_RUNNER: '1',
        ADMIN_EMAIL: 'admin@cvg.local', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'seed_admin'
      };
      for (let round = 1; round <= 2; round += 1) {
        for (const step of ['migrate', 'seed']) {
          const child = spawnSync('pnpm', ['exec', 'tsx', `packages/db/src/${step}.ts`], {
            cwd: root, env, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024
          });
          const log = join(directory, `${step}-${round}.log`);
          writeFileSync(log, `${child.stdout ?? ''}\n${child.stderr ?? ''}`, { flag: 'wx', mode: 0o600 });
          assert.equal(child.signal, null, `interrupted ${step}; inspect ${log}`);
          assert.equal(child.status, 0, `failed ${step}; inspect ${log}`);
        }
        const client = new pg.Client({ connectionString: databaseUrl, connectionTimeoutMillis: 1000, query_timeout: 5000 });
        try {
          await client.connect();
          const migrations = await client.query('SELECT migration_name, hash FROM drizzle_migrations ORDER BY migration_name');
          assert.deepEqual(migrations.rows, expected);
          const admin = await client.query("SELECT count(*)::int AS count FROM users WHERE username = 'admin'");
          assert.equal(admin.rows[0].count, 1);
        } finally { await client.end(); }
      }
      return { migrations: expected.length, rounds: 2 };
    }
  });
  assert.equal(result.evidence.stopped.code, 0);
  assert.equal(existsSync(join(result.evidence.directory, 'data/postmaster.pid')), false);
  console.info(JSON.stringify(result));
});
