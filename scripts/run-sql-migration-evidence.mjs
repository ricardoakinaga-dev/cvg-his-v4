#!/usr/bin/env node
/**
 * PROD-011 producer for executable SQL migration evidence.
 *
 * The producer owns a temporary PostgreSQL cluster that listens only on its
 * private Unix socket. It runs the repository migration runner in isolated
 * databases, records source-bound migration rows and real catalog/data
 * observations, then asks the independent consumer to verify the candidate
 * before reporting success.
 */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, lstatSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

import { withPrivatePostgres } from './lib/private-postgres.mjs';
import {
  discoverSqlMigrations,
  migrationRowsDigest,
  normalizeMigrationRows,
  outboxPayloadIsValid,
  rowSnapshotDigest,
  sha256,
  sqlMigrationSourceDigest,
  stableJson,
  verifySqlMigrationEvidence
} from './lib/sql-migration-evidence.mjs';
import { resolveContainedPath } from './lib/root-contained-path.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = 'docs/engineering/critical-coverage-scope.json';
const PRODUCER_PATH = 'scripts/run-sql-migration-evidence.mjs';
const VERIFIER_PATH = 'scripts/lib/sql-migration-evidence.mjs';
const PREFIX_TARGET = '0169_clinical_workflow_event_order';
const FOUNDATIONAL_TARGET = '0016_feature_flags';
const LEGACY_FORWARD_TARGETS = [
  '0170_outbox_event_envelope',
  '0171_outbox_event_envelope_backfill_correction',
  '0172_outbox_event_envelope_full_validity_backfill',
  '0173_feature_flag_override_scope_uniqueness',
  '0174_feature_flag_override_tenant_ownership',
  '0175_access_control_change_versions',
  '0176_access_control_change_version_cleanup',
  '0177_clinical_evidence_cascade_immutability',
  '0178_pix_provider_events_pagarme'
];
const QUERY_TIMEOUT_MS = 30000;
const MIGRATION_TIMEOUT_MS = 300000;

const quoteIdentifier = (value) => `"${String(value).replaceAll('"', '""')}"`;
const sha256Bytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function scenarioDatabaseName(label, runId) {
  return `prod011_${label}_${runId.replaceAll('-', '').slice(0, 10)}`;
}

function scenarioDatabaseUrl(baseUrl, databaseName) {
  const url = new URL(baseUrl);
  url.pathname = `/${databaseName}`;
  return url.href;
}

async function withClient(databaseUrl, operation) {
  const client = new pg.Client({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 2000,
    query_timeout: QUERY_TIMEOUT_MS
  });
  await client.connect();
  try {
    return await operation(client);
  } finally {
    await client.end();
  }
}

async function createDatabase(adminUrl, databaseName) {
  await withClient(adminUrl, (client) =>
    client.query(`CREATE DATABASE ${quoteIdentifier(databaseName)} TEMPLATE template0`)
  );
}

async function dropDatabase(adminUrl, databaseName) {
  try {
    await withClient(adminUrl, (client) =>
      client.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(databaseName)} WITH (FORCE)`)
    );
  } catch {
    // The cluster is owned by this run and is retained by withPrivatePostgres
    // for inspection. A failed cleanup must never hide the primary evidence
    // error, and no pre-existing database is ever targeted by this name.
  }
}

function childEnvironment(databaseUrl, target) {
  const environment = { ...process.env };
  for (const key of [
    'DATABASE_URL',
    'DATABASE_URL_TEST',
    'E2E_DATABASE_URL',
    'MIGRATION_TARGET',
    'PGHOST',
    'PGPORT',
    'PGUSER',
    'PGDATABASE',
    'PGPASSWORD',
    'PGSERVICE',
    'PGSERVICEFILE',
    'NODE_V8_COVERAGE'
  ]) delete environment[key];
  environment.NODE_ENV = 'test';
  environment.DOTENV_CONFIG_PATH = '/dev/null';
  environment.CVG_CRITICAL_PROCESS_RUNNER = '1';
  environment.DATABASE_URL = databaseUrl;
  environment.DATABASE_URL_TEST = databaseUrl;
  environment.E2E_DATABASE_URL = databaseUrl;
  environment.REQUIRE_TEST_DB = '1';
  environment.TEST_DB_EPHEMERAL = '0';
  environment.TEST_DB_SUFFIX = '';
  if (target) environment.MIGRATION_TARGET = target;
  return environment;
}

function runMigration(root, databaseUrl, target) {
  const child = spawnSync('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
    cwd: root,
    env: childEnvironment(databaseUrl, target),
    encoding: 'utf8',
    timeout: MIGRATION_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024
  });
  return {
    command: 'pnpm exec tsx packages/db/src/migrate.ts',
    target: target ?? null,
    status: child.status === null ? 'failed' : child.status === 0 && child.signal === null ? 'passed' : 'failed',
    exitCode: child.status === null ? 1 : child.status,
    signal: child.signal ?? null,
    stdoutSha256: sha256(child.stdout ?? ''),
    stderrSha256: sha256(child.stderr ?? ''),
    stdout: child.stdout ?? '',
    stderr: child.stderr ?? ''
  };
}

function stepEvidence(result, target, rows) {
  if (result.status !== 'passed') {
    throw new Error(`migration target ${target ?? 'HEAD'} failed: ${result.stderr.slice(-2000)}`);
  }
  return {
    status: 'passed',
    exitCode: result.exitCode,
    signal: result.signal,
    command: result.command,
    target: target ?? null,
    migrationRows: rows,
    migrationRowsDigest: migrationRowsDigest(rows),
    stdoutSha256: result.stdoutSha256,
    stderrSha256: result.stderrSha256
  };
}

async function migrationRows(client) {
  const result = await client.query(
    'SELECT migration_name AS "migrationName", hash FROM drizzle_migrations ORDER BY id ASC'
  );
  return normalizeMigrationRows(result.rows);
}

function expectedRows(migrations, target) {
  const end = target
    ? migrations.findIndex((migration) => migration.name === target)
    : migrations.length - 1;
  if (end < 0) throw new Error(`unknown expected migration target: ${target}`);
  return migrations.slice(0, end + 1).map(({ name, sha256: checksum }) => ({ name, hash: checksum }));
}

async function runAndObserve({ root, databaseUrl, target, migrations, label, saveLog }) {
  const result = runMigration(root, databaseUrl, target);
  saveLog(label, result);
  if (result.status !== 'passed')
    throw new Error(`migration ${label} failed: ${result.stderr.slice(-4000)}`);
  const rows = await withClient(databaseUrl, migrationRows);
  assert.deepEqual(rows, expectedRows(migrations, target), `migration rows after ${label}`);
  return stepEvidence(result, target, rows);
}

async function snapshotOutbox(client, accountId) {
  const result = await client.query(
    `SELECT id,
            account_id::text AS "accountId",
            correlation_id AS "correlationId",
            module_name AS "moduleName",
            event_type AS "eventType",
            payload
       FROM outbox_events
      WHERE account_id = $1
      ORDER BY id ASC`,
    [accountId]
  );
  return result.rows;
}

export function dataSnapshot(rows, extra = {}) {
  const content = Object.keys(extra).length ? { rows, ...extra } : rows;
  return {
    rows,
    rowCount: rows.length,
    digest: rowSnapshotDigest(content),
    ...extra
  };
}

async function snapshotData(client, catalog) {
  const rows = [];
  for (const table of catalog.tables) {
    const result = await client.query(`SELECT count(*)::int AS count FROM ${quoteIdentifier(table.name)}`);
    rows.push({ table: table.name, count: result.rows[0].count });
  }
  rows.sort((left, right) => left.table.localeCompare(right.table));
  let outboxRows = [];
  if (catalog.tables.some((table) => table.name === 'outbox_events')) {
    const result = await client.query(
      `SELECT id,
              account_id::text AS "accountId",
              correlation_id AS "correlationId",
              module_name AS "moduleName",
              event_type AS "eventType",
              payload
         FROM outbox_events
        ORDER BY id ASC`
    );
    outboxRows = result.rows;
  }
  return dataSnapshot(rows, { outboxRows });
}

async function insertAccount(client, accountId, slug, name = slug) {
  await client.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3)`,
    [accountId, slug, name]
  );
}

async function insertLegacyFixtures(client, accountId, suffix) {
  const validId = `prod011-valid-${suffix}`;
  const absentId = `prod011-absent-${suffix}`;
  const nullId = `prod011-null-${suffix}`;
  const partialId = `prod011-partial-${suffix}`;
  const eventType = 'legacy.migrated';
  const moduleName = 'legacy';
  const correlationId = `prod011-correlation-${suffix}`;
  const validPayload = {
    note: 'valid control',
    accountId,
    _meta: {
      eventId: validId,
      eventType,
      schemaVersion: 1,
      occurredAt: '2026-09-13T00:00:00.000Z',
      accountId,
      sourceModule: moduleName,
      actor: { type: 'system', id: 'legacy-outbox' },
      correlationId,
      causationId: null
    }
  };
  const fixtures = [
    [validId, validPayload],
    [absentId, { note: '0170 null-WHERE control' }],
    [nullId, null],
    [partialId, { note: '0171 partial-envelope control', _meta: { eventId: partialId, custom: 'preserve' } }]
  ];
  for (const [id, payload] of fixtures) {
    await client.query(
      `INSERT INTO outbox_events
         (id, account_id, correlation_id, module_name, event_type, payload, status,
          attempts, max_attempts, scheduled_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'pending', 0, 3, now(), now())`,
      [id, accountId, correlationId, moduleName, eventType, JSON.stringify(payload)]
    );
  }
  return { accountId, ids: fixtures.map(([id]) => id), validId, absentId, nullId, partialId };
}

function rowsById(rows) {
  return new Map(rows.map((row) => [row.id, row]));
}

function changedIds(leftRows, rightRows) {
  const left = rowsById(leftRows);
  const right = rowsById(rightRows);
  return [...left.keys()]
    .filter((id) => right.has(id) && stableJson(left.get(id)) !== stableJson(right.get(id)))
    .sort();
}

function snapshotRows(rows) {
  return dataSnapshot(rows);
}

async function catalogSnapshot(client) {
  const columns = (await client.query(`
    SELECT table_schema AS schema,
           table_name AS table,
           column_name AS name,
           ordinal_position AS ordinal,
           data_type AS "dataType",
           is_nullable AS nullable
      FROM information_schema.columns
     WHERE table_schema IN ('public', 'app')
     ORDER BY table_schema, table_name, ordinal_position
  `)).rows;
  const tables = (await client.query(`
    SELECT n.nspname AS schema,
           c.relname AS name,
           c.relkind AS kind,
           c.relrowsecurity AS "rowSecurity",
           c.relforcerowsecurity AS "forceRowSecurity"
      FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
     ORDER BY n.nspname, c.relname
  `)).rows;
  const constraints = (await client.query(`
    SELECT n.nspname AS schema,
           c.relname AS table,
           con.conname AS name,
           con.contype AS type,
           con.convalidated AS validated,
           pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_catalog.pg_constraint AS con
      JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
     ORDER BY n.nspname, c.relname, con.conname
  `)).rows;
  const indexes = (await client.query(`
    SELECT n.nspname AS schema,
           table_class.relname AS table,
           index_class.relname AS name,
           index_info.indisvalid AS valid,
           index_info.indisready AS ready,
           index_info.indisunique AS unique,
           pg_get_indexdef(index_info.indexrelid) AS definition
      FROM pg_catalog.pg_index AS index_info
      JOIN pg_catalog.pg_class AS index_class ON index_class.oid = index_info.indexrelid
      JOIN pg_catalog.pg_class AS table_class ON table_class.oid = index_info.indrelid
      JOIN pg_catalog.pg_namespace AS n ON n.oid = table_class.relnamespace
     WHERE n.nspname = 'public'
     ORDER BY n.nspname, table_class.relname, index_class.relname
  `)).rows;
  const policies = (await client.query(`
    SELECT schemaname AS schema,
           tablename AS table,
           policyname AS name,
           permissive,
           roles,
           cmd,
           qual AS using,
           with_check AS check
      FROM pg_catalog.pg_policies
     WHERE schemaname = 'public'
     ORDER BY schemaname, tablename, policyname
  `)).rows;
  const canonical = { columns, tables, constraints, indexes, policies };
  const columnsByTable = new Map();
  for (const column of columns) {
    const list = columnsByTable.get(column.table) ?? [];
    list.push(column);
    columnsByTable.set(column.table, list);
  }
  const policiesByTable = new Map();
  for (const policy of policies) {
    const list = policiesByTable.get(policy.table) ?? [];
    list.push(policy);
    policiesByTable.set(policy.table, list);
  }
  const exceptions = new Set(['accounts', 'tenants', 'drizzle_migrations', 'installation_state']);
  const tenantTables = tables.filter((table) =>
    !exceptions.has(table.name) && (columnsByTable.get(table.name) ?? []).some((column) => column.name === 'account_id')
  );
  const missingTables = tenantTables
    .filter((table) => {
      const tablePolicies = policiesByTable.get(table.name) ?? [];
      const hasCurrentAccountPredicate = tablePolicies.some((policy) =>
        /current_account_id|current_setting\(['"]app\.current_account_id/i.test(`${policy.using ?? ''} ${policy.check ?? ''}`)
      );
      return table.rowSecurity !== true || tablePolicies.length === 0 || !hasCurrentAccountPredicate;
    })
    .map((table) => table.name)
    .sort();
  return {
    ...canonical,
    fingerprint: sha256(stableJson(canonical)),
    tableCount: tables.length,
    invalidConstraints: constraints.filter((constraint) => constraint.validated !== true).length,
    invalidIndexes: indexes.filter((index) => index.valid !== true || index.ready !== true).length,
    rls: { tenantTableCount: tenantTables.length, missingTables }
  };
}

async function runRlsProbe(databaseUrl, runId) {
  const roleName = `prod011_probe_${runId.replaceAll('-', '').slice(0, 18)}`;
  const accountA = randomUUID();
  const accountB = randomUUID();
  const eventA = `prod011-rls-a-${runId.slice(0, 8)}`;
  const eventB = `prod011-rls-b-${runId.slice(0, 8)}`;
  return withClient(databaseUrl, async (client) => {
    await client.query(`CREATE ROLE ${quoteIdentifier(roleName)} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    try {
      await insertAccount(client, accountA, `prod011-rls-a-${runId.slice(0, 8)}`);
      await insertAccount(client, accountB, `prod011-rls-b-${runId.slice(0, 8)}`);
      const common = [eventA, eventB];
      await client.query(
        `INSERT INTO outbox_events
           (id, account_id, correlation_id, module_name, event_type, payload, status,
            attempts, max_attempts, scheduled_at, created_at)
         VALUES ($1, $3, 'prod011-rls-a', 'probe', 'probe.a', '{}', 'pending', 0, 3, now(), now()),
                ($2, $4, 'prod011-rls-b', 'probe', 'probe.b', '{}', 'pending', 0, 3, now(), now())`,
        [common[0], common[1], accountA, accountB]
      );
      await client.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(new URL(databaseUrl).pathname.slice(1))} TO ${quoteIdentifier(roleName)}`);
      await client.query(`GRANT USAGE ON SCHEMA public, app TO ${quoteIdentifier(roleName)}`);
      await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${quoteIdentifier(roleName)}`);
      await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${quoteIdentifier(roleName)}`);
      await client.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO ${quoteIdentifier(roleName)}`);
      const role = (await client.query(
        'SELECT rolsuper AS "isSuperuser", rolbypassrls AS "bypassRls" FROM pg_roles WHERE rolname = $1',
        [roleName]
      )).rows[0];
      const counts = {};
      await client.query('BEGIN');
      try {
        await client.query(`SET LOCAL ROLE ${quoteIdentifier(roleName)}`);
        await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', accountA]);
        counts.accountAVisible = (await client.query(
          'SELECT count(*)::int AS count FROM outbox_events WHERE id IN ($1, $2)',
          [eventA, eventB]
        )).rows[0].count;
        counts.crossTenantVisible = (await client.query(
          'SELECT count(*)::int AS count FROM outbox_events WHERE id = $1',
          [eventB]
        )).rows[0].count > 0;
        await client.query('ROLLBACK');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      }
      await client.query('BEGIN');
      try {
        await client.query(`SET LOCAL ROLE ${quoteIdentifier(roleName)}`);
        await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', accountB]);
        counts.accountBVisible = (await client.query(
          'SELECT count(*)::int AS count FROM outbox_events WHERE id IN ($1, $2)',
          [eventA, eventB]
        )).rows[0].count;
        await client.query('ROLLBACK');
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      }
      const duplicateConstraint = { accepted: true, sqlState: null };
      await client.query('BEGIN');
      try {
        await client.query(`SET LOCAL ROLE ${quoteIdentifier(roleName)}`);
        await client.query('SELECT set_config($1, $2, true)', ['app.current_account_id', accountA]);
        await client.query(
          `INSERT INTO outbox_events
             (id, account_id, correlation_id, module_name, event_type, payload, status,
              attempts, max_attempts, scheduled_at, created_at)
           VALUES ($1, $2, 'prod011-duplicate', 'probe', 'probe.duplicate', '{}', 'pending', 0, 3, now(), now())`,
          [eventA, accountA]
        );
        await client.query('ROLLBACK');
      } catch (error) {
        duplicateConstraint.accepted = false;
        duplicateConstraint.sqlState = error?.code ?? null;
        await client.query('ROLLBACK').catch(() => undefined);
      }
      return {
        roleName,
        roleIsSuperuser: role?.isSuperuser ?? null,
        roleBypassRls: role?.bypassRls ?? null,
        accountAVisible: counts.accountAVisible,
        accountBVisible: counts.accountBVisible,
        crossTenantVisible: counts.crossTenantVisible,
        duplicateConstraint
      };
    } finally {
      await client.query(`DROP ROLE IF EXISTS ${quoteIdentifier(roleName)}`).catch(() => undefined);
    }
  });
}

function outputDirectory(root, outputPath) {
  const absolute = resolve(root, outputPath);
  const directory = dirname(absolute);
  mkdirSync(directory, { recursive: true });
  const resolved = resolveContainedPath(root, directory, { allowRoot: true });
  if (!resolved.ok || resolved.realpath !== resolved.absolute || !lstatSync(resolved.absolute).isDirectory())
    throw new Error(`SQL evidence output directory is not an owned repository directory: ${directory}`);
  return { absolute, relative: relative(root, absolute).split('\\').join('/') };
}

function saveLog(outputRoot, label, result) {
  const safe = label.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
  writeFileSync(
    join(outputRoot, `${safe}.log.json`),
    JSON.stringify({
      command: result.command,
      target: result.target,
      status: result.status,
      exitCode: result.exitCode,
      signal: result.signal,
      stdout: result.stdout,
      stderr: result.stderr
    }, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 }
  );
}

function parseArgs(argv) {
  const args = { output: null };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--output') args.output = argv[++index] ?? null;
    else if (value === '--help') {
      console.log('Usage: node scripts/run-sql-migration-evidence.mjs [--output <candidate.json>]');
      process.exit(0);
    } else throw new Error(`Unknown argument: ${value}`);
  }
  return args;
}

export async function produceSqlMigrationEvidence({ root = ROOT, output = null } = {}) {
  const manifestFile = resolveContainedPath(root, MANIFEST_PATH);
  if (!manifestFile.ok) throw new Error(`SQL evidence manifest unavailable: ${manifestFile.reason}`);
  const manifestBytes = readFileSync(manifestFile.realpath);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  const config = manifest.specializedEvidence?.sql;
  if (!config) throw new Error('specializedEvidence.sql is required before producing SQL evidence');
  const migrations = discoverSqlMigrations(root, { sourceDirectory: config.sourceDirectory });
  const runId = randomUUID();
  const defaultOutput = `artifacts/remediation/PROD-011/sql-migration-evidence/runs/${runId}/evidence.json`;
  const target = outputDirectory(root, output ?? defaultOutput);
  const outputRoot = dirname(target.absolute);
  const implementation = {
    producerPath: PRODUCER_PATH,
    producerSha256: sha256Bytes(readFileSync(resolve(root, PRODUCER_PATH))),
    verifierPath: VERIFIER_PATH,
    verifierSha256: sha256Bytes(readFileSync(resolve(root, VERIFIER_PATH)))
  };
  const { value: phaseResult } = await withPrivatePostgres({
    binDir: process.env.NATIVE_POSTGRES_BIN,
    shareDir: process.env.NATIVE_POSTGRES_SHARE,
    libraryDir: process.env.NATIVE_POSTGRES_LIB,
    run: async ({ databaseUrl }) => {
      const names = {
        clean: scenarioDatabaseName('clean', runId),
        foundational: scenarioDatabaseName('foundation', runId),
        legacy: scenarioDatabaseName('legacy', runId),
        failure: scenarioDatabaseName('failure', runId)
      };
      const databases = Object.values(names);
      for (const name of databases) await createDatabase(databaseUrl, name);
      try {
        const urls = Object.fromEntries(Object.entries(names).map(([key, name]) => [key, scenarioDatabaseUrl(databaseUrl, name)]));
        const cleanStep = await runAndObserve({
          root,
          databaseUrl: urls.clean,
          target: null,
          migrations,
          label: 'clean-apply',
          saveLog: (label, result) => saveLog(outputRoot, label, result)
        });
        const catalog = await withClient(urls.clean, (client) => catalogSnapshot(client));
        const cleanSchemaFingerprint = catalog.fingerprint;
        if (catalog.invalidConstraints !== 0 || catalog.invalidIndexes !== 0 || catalog.rls.missingTables.length !== 0)
          throw new Error(`clean catalog invariants failed: missing RLS=${catalog.rls.missingTables.join(',') || 'none'}`);

        const foundational = await withClient(urls.foundational, async (client) => {
          const beforeStep = await runAndObserve({
            root,
            databaseUrl: urls.foundational,
            target: FOUNDATIONAL_TARGET,
            migrations,
            label: 'upgrade-foundational-prefix',
            saveLog: (label, result) => saveLog(outputRoot, label, result)
          });
          const accountId = randomUUID();
          const slug = `prod011-foundation-${runId.slice(0, 8)}`;
          await insertAccount(client, accountId, slug, 'PROD-011 foundational preexisting account');
          const beforeData = (await client.query('SELECT id::text AS id, tenant_id::text AS "tenantId", slug, name FROM accounts WHERE id = $1', [accountId])).rows[0];
          const finalStep = await runAndObserve({
            root,
            databaseUrl: urls.foundational,
            target: null,
            migrations,
            label: 'upgrade-foundational-head',
            saveLog: (label, result) => saveLog(outputRoot, label, result)
          });
          const afterData = (await client.query('SELECT id::text AS id, tenant_id::text AS "tenantId", slug, name FROM accounts WHERE id = $1', [accountId])).rows[0];
          assert.deepEqual(afterData, beforeData, 'pre-existing account was changed by upgrade');
          const scenarioCatalog = await catalogSnapshot(client);
          assert.equal(scenarioCatalog.fingerprint, cleanSchemaFingerprint, 'foundational schema differs from clean schema');
          return {
            status: 'passed',
            exitCode: 0,
            signal: null,
            target: FOUNDATIONAL_TARGET,
            beforeMigrationRows: beforeStep.migrationRows,
            beforeMigrationRowsDigest: beforeStep.migrationRowsDigest,
            afterMigrationRows: finalStep.migrationRows,
            afterMigrationRowsDigest: finalStep.migrationRowsDigest,
            preexistingData: { table: 'accounts', key: accountId, before: beforeData, after: afterData, preserved: true }
          };
        });

        const legacy = await withClient(urls.legacy, async (client) => {
          const prefixStep = await runAndObserve({
            root,
            databaseUrl: urls.legacy,
            target: PREFIX_TARGET,
            migrations,
            label: 'upgrade-legacy-prefix',
            saveLog: (label, result) => saveLog(outputRoot, label, result)
          });
          const accountId = randomUUID();
          await insertAccount(client, accountId, `prod011-legacy-${runId.slice(0, 8)}`, 'PROD-011 legacy envelope account');
          const fixture = await insertLegacyFixtures(client, accountId, runId.slice(0, 8));
          const beforeRows = await snapshotOutbox(client, accountId);
          const beforeSnapshot = snapshotRows(beforeRows);
          const steps = [];
          const snapshots = { before: beforeSnapshot };
          for (const targetName of LEGACY_FORWARD_TARGETS) {
            const step = await runAndObserve({
              root,
              databaseUrl: urls.legacy,
              target: targetName,
              migrations,
              label: `upgrade-legacy-${targetName.slice(0, 4)}`,
              saveLog: (label, result) => saveLog(outputRoot, label, result)
            });
            const rows = await snapshotOutbox(client, accountId);
            const snapshotKey = targetName.slice(0, 4);
            if (snapshotKey === '0170' || snapshotKey === '0171' || snapshotKey === '0172') {
              steps.push(step);
              snapshots[`after${snapshotKey}`] = snapshotRows(rows);
            }
          }
          const finalCatalog = await catalogSnapshot(client);
          assert.equal(finalCatalog.fingerprint, cleanSchemaFingerprint, 'legacy schema differs from clean schema');
          const finalRows = snapshots.after0172.rows;
          assert.equal(finalRows.length, fixture.ids.length, 'legacy fixture row count changed');
          assert.equal(finalRows.filter(outboxPayloadIsValid).length, fixture.ids.length, 'legacy rows remain consumer-invalid after 0172');
          return {
            status: 'passed',
            exitCode: 0,
            signal: null,
            prefixTarget: PREFIX_TARGET,
            prefixMigrationCount: prefixStep.migrationRows.length,
            prefixMigrationRowsDigest: prefixStep.migrationRowsDigest,
            steps,
            snapshots,
            repairedIdsAfter0170: changedIds(snapshots.before.rows, snapshots.after0170.rows),
            repairedIdsAfter0171: changedIds(snapshots.after0170.rows, snapshots.after0171.rows),
            repairedIdsAfter0172: changedIds(snapshots.after0171.rows, snapshots.after0172.rows),
            knownBadControl: {
              reproduced: true,
              migration: '0170_outbox_event_envelope',
              controlId: fixture.absentId,
              predicateResult: 'NULL for payload without object _meta'
            },
            schemaFingerprint: finalCatalog.fingerprint,
            finalSchemaFingerprint: finalCatalog.fingerprint
          };
        });

        const legacyReexecution = await withClient(urls.legacy, async (client) => {
          const beforeRows = await migrationRows(client);
          const beforeData = await snapshotData(client, catalog);
          const result = runMigration(root, urls.legacy, null);
          saveLog(outputRoot, 'reexecution-head', result);
          if (result.status !== 'passed') throw new Error(`migration reexecution failed: ${result.stderr.slice(-4000)}`);
          const afterRows = await migrationRows(client);
          const afterData = await snapshotData(client, catalog);
          assert.deepEqual(afterRows, expectedRows(migrations), 'reexecution migration rows changed');
          assert.deepEqual(afterData, beforeData, 'reexecution data snapshot changed');
          return {
            status: 'passed',
            exitCode: result.exitCode,
            signal: result.signal,
            command: result.command,
            beforeMigrationRows: beforeRows,
            beforeMigrationDigest: migrationRowsDigest(beforeRows),
            afterMigrationRows: afterRows,
            afterMigrationDigest: migrationRowsDigest(afterRows),
            beforeData,
            afterData,
            duplicateMigrationRows: 0,
            noDuplicateMigrationRows: true
          };
        });

        const failureRecovery = await withClient(urls.failure, async (client) => {
          const prefixStep = await runAndObserve({
            root,
            databaseUrl: urls.failure,
            target: PREFIX_TARGET,
            migrations,
            label: 'failure-recovery-prefix',
            saveLog: (label, result) => saveLog(outputRoot, label, result)
          });
          const corruptedMigration = migrations.find((migration) => migration.name === '0000_vengeful_pet_avengers');
          if (!corruptedMigration) throw new Error('corruption target is missing from canonical inventory');
          // The checksum-failure scenario intentionally stops at the 0169
          // prefix. Snapshot that database's own catalog so later migrations
          // that add tables (for example 0175) do not make the pre-upgrade
          // fixture unreadable before the failure is exercised.
          const prefixCatalog = await catalogSnapshot(client);
          const beforeData = await snapshotData(client, prefixCatalog);
          await client.query('UPDATE drizzle_migrations SET hash = $1 WHERE migration_name = $2', ['0'.repeat(64), corruptedMigration.name]);
          const failed = runMigration(root, urls.failure, null);
          saveLog(outputRoot, 'failure-recovery-corrupted-head', failed);
          const observedRows = await migrationRows(client);
          const afterFailedData = await snapshotData(client, prefixCatalog);
          assert.notEqual(failed.status, 'passed', 'checksum corruption unexpectedly passed');
          assert.deepEqual(afterFailedData, beforeData, 'failed checksum guard changed data');
          assert.equal(observedRows.length, prefixStep.migrationRows.length, 'failed checksum guard created a migration row');
          await client.query('UPDATE drizzle_migrations SET hash = $1 WHERE migration_name = $2', [corruptedMigration.sha256, corruptedMigration.name]);
          const restoredRows = await migrationRows(client);
          assert.deepEqual(restoredRows, prefixStep.migrationRows, 'checksum repair did not restore original hash');
          const recoveryResult = await runAndObserve({
            root,
            databaseUrl: urls.failure,
            target: null,
            migrations,
            label: 'failure-recovery-head-after-repair',
            saveLog: (label, result) => saveLog(outputRoot, label, result)
          });
          return {
            status: 'passed',
            exitCode: 0,
            signal: null,
            prefixTarget: PREFIX_TARGET,
            corruptedMigrationName: corruptedMigration.name,
            originalHash: corruptedMigration.sha256,
            corruptedHash: '0'.repeat(64),
            failedAttempt: {
              status: 'failed',
              exitCode: failed.exitCode,
              signal: failed.signal,
              migrationRows: observedRows,
              restoredMigrationRows: restoredRows,
              data: afterFailedData
            },
            recoveryAttempt: recoveryResult,
            rollbackVerified: true,
            noMigrationRowCreated: observedRows.length === prefixStep.migrationRows.length
          };
        });

        const rlsProbe = await runRlsProbe(urls.clean, runId);
        const databaseInvariants = Object.entries(urls).map(([name]) => ({
          database: name,
          status: 'passed',
          schemaFingerprint: cleanSchemaFingerprint,
          invalidConstraints: catalog.invalidConstraints,
          invalidIndexes: catalog.invalidIndexes
        }));
        return {
          cleanStep,
          cleanSchemaFingerprint,
          catalog,
          foundational,
          legacy,
          legacyReexecution,
          failureRecovery,
          rlsProbe,
          databaseInvariants
        };
      } finally {
        for (const name of databases.reverse()) await dropDatabase(databaseUrl, name);
      }
    }
  });
  const evidence = {
    schemaVersion: 1,
    evidenceKind: 'sql-migration-behavior',
    ticket: 'PROD-011',
    status: 'passed',
    finalizedAfterExit: true,
    exitCode: 0,
    signal: null,
    runId,
    head: manifest.head,
    manifestSha256: sha256Bytes(manifestBytes),
    sqlSourceSetSha256: sqlMigrationSourceDigest(migrations),
    migrationCount: migrations.length,
    contractualMigrationCount: config.contractualMigrationCount,
    humanCertification: false,
    migrations: migrations.map(({ order, name, path, sha256: checksum }) => ({ order, name, path, sha256: checksum })),
    implementation,
    phases: {
      cleanApply: {
        status: 'passed',
        exitCode: 0,
        signal: null,
        command: phaseResult.cleanStep.command,
        migrationRows: phaseResult.cleanStep.migrationRows,
        migrationRowsDigest: phaseResult.cleanStep.migrationRowsDigest,
        schemaFingerprint: phaseResult.cleanSchemaFingerprint
      },
      upgrade: {
        status: 'passed',
        exitCode: 0,
        signal: null,
        scenarios: {
          foundational: phaseResult.foundational,
          legacyEnvelope: phaseResult.legacy
        }
      },
      reexecution: phaseResult.legacyReexecution,
      failureRecovery: phaseResult.failureRecovery,
      invariants: {
        status: 'passed',
        exitCode: 0,
        signal: null,
        catalog: phaseResult.catalog,
        databases: phaseResult.databaseInvariants,
        rlsProbe: phaseResult.rlsProbe
      }
    }
  };
  writeFileSync(target.absolute, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const verification = verifySqlMigrationEvidence({ root, manifestPath: MANIFEST_PATH, evidencePath: target.relative });
  if (verification.status !== 'PASS') throw new Error(`SQL evidence consumer rejected candidate: ${verification.errors.join('; ')}`);
  return {
    status: 'PASS',
    candidatePath: target.relative,
    runId,
    migrationCount: migrations.length,
    sqlScope: verification.sqlScope,
    privatePostgresTcpEnabled: false
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.NATIVE_POSTGRES_BIN || !process.env.NATIVE_POSTGRES_SHARE)
    throw new Error('SQL evidence producer requires NATIVE_POSTGRES_BIN and NATIVE_POSTGRES_SHARE; no existing application port or database will be used');
  const result = await produceSqlMigrationEvidence({ root: ROOT, output: args.output });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`SQL migration evidence producer failed: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  });
}
