#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const root = process.cwd();
const localAdminUrl = new URL('postgres://127.0.0.1:5433/postgres');
localAdminUrl.username = 'postgres';
localAdminUrl.password = 'postgres';
const adminUrl = new URL(
  process.env.INSTALL_UPGRADE_ADMIN_URL ?? process.env.DATABASE_URL_TEST ?? localAdminUrl.href
);
adminUrl.pathname = '/postgres';
const suffix = `${Date.now().toString(36)}_${process.pid}`.replace(/[^a-z0-9_]/g, '');
const installDatabase = `cvg_install_${suffix}`;
const upgradeDatabase = `cvg_upgrade_${suffix}`;
const generatedDatabases = [installDatabase, upgradeDatabase];
const reportDir = resolve(
  process.env.INSTALL_UPGRADE_REPORT_DIR ?? `/tmp/cvg-his-v4-install-upgrade/${suffix}`
);
const migrations = readdirSync(resolve(root, 'packages/db/migrations'))
  .filter(
    (file) => file.endsWith('.sql') && !file.endsWith('.revert.sql') && !file.endsWith('.seed.sql')
  )
  .sort()
  .map((file) => file.replace(/\.sql$/, ''));
const previousTarget = migrations.at(-2);
const headTarget = migrations.at(-1);
const report = {
  schema_version: 1,
  status: 'FAIL',
  started_at: new Date().toISOString(),
  completed_at: null,
  previous_target: previousTarget,
  head_target: headTarget,
  migration_count: migrations.length,
  phases: [],
  rollback_policy:
    'database-forward-only; previous application revision may be redeployed only after compatibility probes pass'
};

if (!previousTarget || !headTarget || migrations.length < 2) {
  throw new Error('at least two canonical migrations are required for the upgrade drill');
}

function databaseUrl(name) {
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  return url.toString();
}

function runNodeScript(script, databaseName, extraEnv = {}) {
  const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl(databaseName),
      DATABASE_URL_TEST: databaseUrl(databaseName),
      ...extraEnv
    }
  });
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
      .trim()
      .split('\n')
      .slice(-20)
      .join('\n');
    throw new Error(`${script} failed for generated drill database ${databaseName}:\n${detail}`);
  }
}

async function timed(label, callback) {
  const started = Date.now();
  await callback();
  report.phases.push({ label, duration_ms: Date.now() - started, status: 'PASS' });
}

async function migrationCount(pool) {
  const result = await pool.query('SELECT COUNT(*)::integer AS count FROM drizzle_migrations');
  return result.rows[0].count;
}

function quoteIdentifier(value) {
  if (!/^cvg_(?:install|upgrade)_[a-z0-9_]+$/.test(value)) {
    throw new Error(`refusing unsafe generated database identifier: ${value}`);
  }
  return `"${value}"`;
}

const adminPool = new Pool({ connectionString: adminUrl.toString(), max: 2 });

async function createDatabase(name) {
  await adminPool.query(`CREATE DATABASE ${quoteIdentifier(name)}`);
}

async function dropDatabase(name) {
  await adminPool.query(
    'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()',
    [name]
  );
  await adminPool.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(name)}`);
}

try {
  mkdirSync(reportDir, { recursive: true });

  await timed('empty-database-install', async () => {
    await createDatabase(installDatabase);
    runNodeScript('packages/db/src/migrate.ts', installDatabase);
    runNodeScript('packages/db/src/seed.ts', installDatabase, {
      ADMIN_EMAIL: 'install-drill@example.test',
      ADMIN_PASSWORD: `InstallDrill-${randomUUID()}`
    });
    runNodeScript('packages/db/src/seed.ts', installDatabase, {
      ADMIN_EMAIL: 'install-drill@example.test',
      ADMIN_PASSWORD: `InstallDrill-${randomUUID()}`
    });
    runNodeScript('packages/db/src/migrate.ts', installDatabase);

    const pool = new Pool({ connectionString: databaseUrl(installDatabase), max: 1 });
    try {
      const counts = await pool.query(`
        SELECT
          (SELECT COUNT(*)::integer FROM tenants WHERE slug = 'default') AS tenants,
          (SELECT COUNT(*)::integer FROM accounts WHERE slug = 'default') AS accounts,
          (SELECT COUNT(*)::integer FROM users WHERE email = 'install-drill@example.test') AS users
      `);
      if ((await migrationCount(pool)) !== migrations.length)
        throw new Error('clean install migration count mismatch');
      if (
        counts.rows[0].tenants !== 1 ||
        counts.rows[0].accounts !== 1 ||
        counts.rows[0].users !== 1
      ) {
        throw new Error(`controlled seed is not idempotent: ${JSON.stringify(counts.rows[0])}`);
      }
    } finally {
      await pool.end();
    }
  });

  await timed('previous-snapshot-upgrade', async () => {
    await createDatabase(upgradeDatabase);
    runNodeScript('packages/db/src/migrate.ts', upgradeDatabase, {
      MIGRATION_TARGET: previousTarget
    });
    const pool = new Pool({ connectionString: databaseUrl(upgradeDatabase), max: 1 });
    const markerSlug = `upgrade-${suffix}`;
    try {
      if ((await migrationCount(pool)) !== migrations.length - 1) {
        throw new Error('previous snapshot did not stop at the requested migration');
      }
      await pool.query('INSERT INTO tenants (slug, name, status) VALUES ($1, $2, $3)', [
        markerSlug,
        'Upgrade drill marker',
        'active'
      ]);
    } finally {
      await pool.end();
    }

    runNodeScript('packages/db/src/migrate.ts', upgradeDatabase);
    runNodeScript('packages/db/src/migrate.ts', upgradeDatabase);

    const upgradedPool = new Pool({ connectionString: databaseUrl(upgradeDatabase), max: 1 });
    try {
      const marker = await upgradedPool.query(
        'SELECT COUNT(*)::integer AS count FROM tenants WHERE slug = $1',
        [markerSlug]
      );
      if ((await migrationCount(upgradedPool)) !== migrations.length)
        throw new Error('upgrade migration count mismatch');
      if (marker.rows[0].count !== 1) throw new Error('pre-upgrade tenant data did not survive');
      await upgradedPool.query('SELECT id, tenant_id, slug FROM accounts LIMIT 1');
      await upgradedPool.query('SELECT id, account_id, email FROM users LIMIT 1');
      await upgradedPool.query('SELECT id, account_id, name FROM patients LIMIT 1');
    } finally {
      await upgradedPool.end();
    }
  });

  report.status = 'PASS';
  report.completed_at = new Date().toISOString();
  writeFileSync(
    resolve(reportDir, 'install-upgrade-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.log(`INSTALL_UPGRADE_REPORT=${resolve(reportDir, 'install-upgrade-report.json')}`);
} catch (error) {
  report.completed_at = new Date().toISOString();
  report.error = error instanceof Error ? error.message : String(error);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(
    resolve(reportDir, 'install-upgrade-report.json'),
    `${JSON.stringify(report, null, 2)}\n`
  );
  console.error(error);
  process.exitCode = 1;
} finally {
  for (const database of generatedDatabases.reverse()) {
    await dropDatabase(database).catch(() => undefined);
  }
  await adminPool.end();
}
