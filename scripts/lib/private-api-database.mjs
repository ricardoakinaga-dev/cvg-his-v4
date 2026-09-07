import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import pg from 'pg';

// Called only inside withPrivatePostgres's owned lifetime. No administrative
// URL or inherited database/provider configuration is accepted as a fallback.
export async function preparePrivateApiDatabase({ root, environment, directory }) {
  const url = new URL(environment.DATABASE_URL);
  if (url.protocol !== 'postgresql:' || url.searchParams.get('host') !== realpathSync(directory) ||
      url.pathname !== '/cvg_his_v2_test_native' || environment.DATABASE_URL_TEST !== url.href || environment.E2E_DATABASE_URL !== url.href) {
    throw new Error('API preparation requires the private cluster connection');
  }
  const env = {
    PATH: process.env.PATH, ...environment, CVG_CRITICAL_PROCESS_RUNNER: '1',
    ADMIN_EMAIL: 'admin@cvg.local', ADMIN_USERNAME: 'admin', ADMIN_PASSWORD: 'seed_admin'
  };
  const steps = [];
  for (const step of ['migrate', 'seed']) {
    const child = spawnSync('pnpm', ['exec', 'tsx', `packages/db/src/${step}.ts`], {
      cwd: root, env, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024
    });
    const log = join(directory, `${step}-${createHash('sha256').update(String(process.hrtime.bigint())).digest('hex').slice(0, 16)}.log`);
    writeFileSync(log, `${child.stdout ?? ''}\n${child.stderr ?? ''}`, { flag: 'wx', mode: 0o600 });
    steps.push({ step, exitCode: child.status, signal: child.signal, log });
    if (child.status !== 0 || child.signal) throw new Error(`private API ${step} failed; inspect ${log}`);
  }
  const migrationDirectory = join(root, 'packages/db/migrations');
  const expected = readdirSync(migrationDirectory)
    .filter((name) => name.endsWith('.sql') && !name.endsWith('.revert.sql') && !name.endsWith('.seed.sql'))
    .sort().map((name) => ({ migration_name: name.slice(0, -4), hash: createHash('sha256').update(readFileSync(join(migrationDirectory, name))).digest('hex') }));
  const client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 1000, query_timeout: 5000 });
  try {
    await client.connect();
    const actual = (await client.query('SELECT migration_name, hash FROM drizzle_migrations ORDER BY migration_name')).rows;
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('private API migration inventory differs from source');
    const admin = await client.query("SELECT count(*)::int AS count FROM users WHERE username = 'admin'");
    if (admin.rows[0].count !== 1) throw new Error('private API seed admin is missing or duplicated');
  } finally { await client.end(); }
  return { environment: env, evidence: { steps, migrations: expected, adminCount: 1 } };
}
