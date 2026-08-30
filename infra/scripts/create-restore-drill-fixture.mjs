#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const baseDir = resolve(process.env.RESTORE_FIXTURE_BASE_DIR ?? '/tmp/cvg-his-v2-backup-fixtures');
const profile = process.env.RESTORE_FIXTURE_PROFILE ?? 'minimal';
const postgresPassword = process.env.RESTORE_FIXTURE_POSTGRES_PASSWORD || randomUUID();
const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, 'Z');
const runId = `${timestamp}-${process.pid}`;
const bundleDir = join(baseDir, `fixture-${runId}`);
const payloadDir = join(bundleDir, '.storage-payload');
const containerName = `cvg-his-v2-backup-fixture-${runId.toLowerCase()}`;
let fixtureCompleted = false;
const representativeIds = Object.freeze({
  tenant: '11111111-1111-4111-8111-111111111110',
  account: '11111111-1111-4111-8111-111111111111',
  user: '22222222-2222-4222-8222-222222222222',
  owner: '33333333-3333-4333-8333-333333333333',
  patient: '44444444-4444-4444-8444-444444444444',
  encounter: '55555555-5555-4555-8555-555555555555',
  stay: '66666666-6666-4666-8666-666666666666',
  product: '77777777-7777-4777-8777-777777777777',
  clinicalNote: '88888888-8888-4888-8888-888888888888',
  clinicalNoteVersion: '99999999-9999-4999-8999-999999999999',
  inpatientProgress: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  document: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  encounterDocument: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  auditEvent: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  financialAccount: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  receivable: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  journalEntry: '12121212-1212-4121-8121-121212121212',
  journalDebitLine: '13131313-1313-4131-8131-131313131313',
  journalCreditLine: '14141414-1414-4141-8141-141414141414'
});

if (!['minimal', 'representative'].includes(profile)) {
  throw new Error(`unsupported restore fixture profile: ${profile}`);
}

function redactSensitive(value) {
  return String(value)
    .replace(/(POSTGRES_PASSWORD=)[^\s]+/gi, '$1***')
    .replace(/(postgres(?:ql)?:\/\/[^:\s/@]+:)[^@\s]+@/gi, '$1***@');
}

function makePrivateDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

function writePrivateFile(path, data) {
  writeFileSync(path, data, { mode: 0o600 });
  chmodSync(path, 0o600);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: Object.prototype.hasOwnProperty.call(options, 'encoding') ? options.encoding : 'utf8',
    stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
    env: options.env,
    input: options.input
  });

  if (result.status !== 0) {
    const output = redactSensitive(
      `${result.stdout?.toString() ?? ''}${result.stderr?.toString() ?? ''}`.trim()
    );
    throw new Error(`${redactSensitive(`${command} ${args.join(' ')}`)} failed: ${output}`);
  }

  return result;
}

function docker(args, options = {}) {
  return run('docker', args, options);
}

function cleanup() {
  spawnSync('docker', ['rm', '-f', containerName], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore']
  });
}

function waitForPostgres() {
  let stableConnections = 0;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const readiness = spawnSync(
      'docker',
      ['exec', containerName, 'pg_isready', '-U', 'postgres', '-d', 'postgres'],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );

    if (readiness.status === 0) {
      const probe = spawnSync(
        'docker',
        [
          'exec',
          containerName,
          'psql',
          '-v',
          'ON_ERROR_STOP=1',
          '-U',
          'postgres',
          '-d',
          'postgres',
          '-At',
          '-c',
          'SELECT 1'
        ],
        { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      );

      if (probe.status === 0) {
        stableConnections += 1;
        if (stableConnections >= 3) {
          return;
        }
      } else {
        stableConnections = 0;
      }
    } else {
      stableConnections = 0;
    }

    spawnSync('sleep', ['1']);
  }
  throw new Error('disposable postgres did not reach stable readiness in time');
}

function getMappedPostgresPort() {
  const result = docker(['port', containerName, '5432/tcp']);
  const match = result.stdout.match(/:(\d+)\s*$/m);
  if (!match?.[1]) {
    throw new Error(`could not resolve mapped disposable postgres port: ${result.stdout}`);
  }
  return match[1];
}

function applyCanonicalMigrations() {
  const mappedPostgresPort = getMappedPostgresPort();
  const databaseUrl = new URL('postgresql://127.0.0.1');
  databaseUrl.username = 'postgres';
  databaseUrl.password = postgresPassword;
  databaseUrl.port = mappedPostgresPort;
  databaseUrl.pathname = '/postgres';
  run('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, DATABASE_URL: databaseUrl.toString() }
  });
}

const representativeSeedSql = `
BEGIN;

INSERT INTO tenants (id, slug, name, status, activated_at)
VALUES ('${representativeIds.tenant}', 'restore-drill-representative', 'Restore Drill Representative Tenant', 'active', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO accounts (id, tenant_id, slug, name, is_active)
VALUES ('${representativeIds.account}', '${representativeIds.tenant}', 'restore-drill-representative', 'Restore Drill Representative Account', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
VALUES ('${representativeIds.user}', '${representativeIds.account}', 'restore-drill-representative', 'restore-drill-representative@example.test', 'fixture-only-password-hash', 'Restore Drill Operator', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO owners (id, account_id, full_name, email)
VALUES ('${representativeIds.owner}', '${representativeIds.account}', 'Restore Drill Owner', 'owner@example.test')
ON CONFLICT (id) DO NOTHING;

INSERT INTO patients (id, account_id, owner_id, name, species, breed, alerts_json)
VALUES ('${representativeIds.patient}', '${representativeIds.account}', '${representativeIds.owner}', 'Restore Drill Patient', 'canine', 'mixed', '{"fixture":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
VALUES ('${representativeIds.encounter}', '${representativeIds.account}', '${representativeIds.patient}', '${representativeIds.owner}', 'open', '${representativeIds.user}', 'Representative restore proof')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inpatient_stays (id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed, admitted_by_user_id, chief_complaint, reason)
VALUES ('${representativeIds.stay}', '${representativeIds.account}', '${representativeIds.patient}', '${representativeIds.owner}', '${representativeIds.encounter}', 'admitted', 'Internacao', 'Ala A', 'A-01', '${representativeIds.user}', 'Restore drill', 'Representative backup fixture')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inpatient_progress (id, account_id, stay_id, encounter_id, note, authored_by_user_id)
VALUES ('${representativeIds.inpatientProgress}', '${representativeIds.account}', '${representativeIds.stay}', '${representativeIds.encounter}', 'Representative inpatient progress survives restore.', '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinical_notes (id, account_id, encounter_id, status, version_number, created_by_user_id, updated_by_user_id)
VALUES ('${representativeIds.clinicalNote}', '${representativeIds.account}', '${representativeIds.encounter}', 'draft', 1, '${representativeIds.user}', '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO clinical_note_versions (id, account_id, note_id, version_number, soap_json, created_by_user_id)
VALUES ('${representativeIds.clinicalNoteVersion}', '${representativeIds.account}', '${representativeIds.clinicalNote}', 1, '{"subjective":"Representative restore proof"}'::jsonb, '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (id, account_id, name, code, base_price, active)
VALUES ('${representativeIds.product}', '${representativeIds.account}', 'Restore Drill Supply', 'RESTORE-001', 12.50, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO stock_items (id, account_id, product_id, quantity, min_quantity, location, active)
VALUES ('15151515-1515-4151-8151-151515151515', '${representativeIds.account}', '${representativeIds.product}', 10, 2, 'Ala A', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_items (id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount, charge_unit_price_amount)
VALUES ('inventory-restore-001', '${representativeIds.account}', 'RESTORE-INV-001', 'Restore Drill Inventory', 'unit', 9, 2, 5.00, 12.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_consumptions (id, account_id, inventory_item_id, encounter_id, patient_id, quantity, unit, cost_amount, source_entity_type, source_entity_id, recorded_by_user_id)
VALUES ('inventory-consumption-restore-001', '${representativeIds.account}', 'inventory-restore-001', '${representativeIds.encounter}', '${representativeIds.patient}', 1, 'unit', 5.00, 'inpatient_stay', '${representativeIds.stay}', '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing_records (id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency, administrative_notes)
VALUES ('restore-drill-billing-001', '${representativeIds.account}', '${representativeIds.encounter}', '${representativeIds.patient}', '${representativeIds.owner}', 'open', 12.50, 'BRL', 'Representative restore proof')
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing_items (id, account_id, billing_record_id, encounter_id, item_type, description, quantity, unit_price_amount, total_amount, source_entity_type, source_entity_id, created_by_user_id)
VALUES ('restore-drill-billing-item-001', '${representativeIds.account}', 'restore-drill-billing-001', '${representativeIds.encounter}', 'supply', 'Restore Drill Inventory', 1, 12.50, 12.50, 'inventory_consumption', 'inventory-consumption-restore-001', '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO encounter_financial_accounts (id, account_id, encounter_id, financial_status, subtotal_snapshot, total_snapshot, paid_amount, balance_due, snapshot_json)
VALUES ('${representativeIds.financialAccount}', '${representativeIds.account}', '${representativeIds.encounter}', 'pending', 12.50, 12.50, 0, 12.50, '{"source":"restore-drill"}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO encounter_receivables (id, account_id, encounter_id, financial_account_id, installment_number, installment_label, status, amount_original, amount_paid, amount_outstanding)
VALUES ('${representativeIds.receivable}', '${representativeIds.account}', '${representativeIds.encounter}', '${representativeIds.financialAccount}', 1, 'Parcela 1/1', 'open', 12.50, 0, 12.50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_journal_entries (id, account_id, source_type, source_id, description, occurred_at, created_by_user_id)
VALUES ('${representativeIds.journalEntry}', '${representativeIds.account}', 'restore_drill', 'restore-drill-billing-001', 'Representative restore journal', now(), '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO financial_journal_lines (id, account_id, entry_id, account_code, debit, credit, memo)
VALUES ('${representativeIds.journalDebitLine}', '${representativeIds.account}', '${representativeIds.journalEntry}', '1.1.02-contas-a-receber', 12.50, 0, 'Representative restore debit'),
       ('${representativeIds.journalCreditLine}', '${representativeIds.account}', '${representativeIds.journalEntry}', '3.1.01-receita-clinica', 0, 12.50, 'Representative restore credit')
ON CONFLICT (id) DO NOTHING;

INSERT INTO outbox_events (id, account_id, correlation_id, module_name, event_type, payload, status, attempts, max_attempts, scheduled_at, created_at)
VALUES ('restore-drill-outbox-001', '${representativeIds.account}', '${representativeIds.encounter}', 'restore-drill', 'encounter.representative', '{"accountId":"${representativeIds.account}","encounterId":"${representativeIds.encounter}"}'::jsonb, 'pending', 0, 3, now(), now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_events (id, account_id, actor_user_id, actor_role, actor_roles, entity_type, entity_id, action, after_json, reason, request_id)
VALUES ('${representativeIds.auditEvent}', '${representativeIds.account}', '${representativeIds.user}', 'fixture', '["fixture"]'::jsonb, 'encounter', '${representativeIds.encounter}', 'restore_fixture_created', '{"profile":"representative"}'::jsonb, 'Restore drill evidence', 'restore-drill-representative')
ON CONFLICT (id) DO NOTHING;

INSERT INTO documents (id, account_id, storage_key, filename, mime_type, size_bytes, created_by_user_id)
VALUES ('${representativeIds.document}', '${representativeIds.account}', 'attachments/patients/restore-drill-clinical-note.txt', 'restore-drill-clinical-note.txt', 'text/plain', 43, '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

INSERT INTO encounter_documents (id, account_id, encounter_id, document_id, attached_by_user_id)
VALUES ('${representativeIds.encounterDocument}', '${representativeIds.account}', '${representativeIds.encounter}', '${representativeIds.document}', '${representativeIds.user}')
ON CONFLICT (id) DO NOTHING;

COMMIT;
`;

function createDatabaseFixture() {
  docker([
    'run',
    '-d',
    '--rm',
    '--name',
    containerName,
    '-e',
    `POSTGRES_PASSWORD=${postgresPassword}`,
    '-e',
    'POSTGRES_DB=postgres',
    ...(profile === 'representative' ? ['-p', '127.0.0.1::5432'] : []),
    'postgres:16-alpine'
  ]);

  waitForPostgres();

  if (profile === 'representative') {
    applyCanonicalMigrations();
    run(
      'docker',
      [
        'exec',
        '-i',
        containerName,
        'psql',
        '-v',
        'ON_ERROR_STOP=1',
        '-U',
        'postgres',
        '-d',
        'postgres'
      ],
      {
        stdio: ['pipe', 'pipe', 'pipe'],
        input: representativeSeedSql
      }
    );
  } else {
    docker([
      'exec',
      containerName,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-c',
      [
        'CREATE TABLE public.restore_drill_probe (',
        'id uuid PRIMARY KEY,',
        'account_id uuid NOT NULL,',
        'label text NOT NULL,',
        'created_at timestamptz NOT NULL DEFAULT now()',
        ');',
        "INSERT INTO public.restore_drill_probe (id, account_id, label) VALUES ('00000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'fixture restore drill');",
        'CREATE TABLE public.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);',
        "INSERT INTO public.__drizzle_migrations (hash, created_at) VALUES ('restore-drill-fixture', 20260528120000);"
      ].join(' ')
    ]);
  }

  const dump = docker(
    [
      'exec',
      containerName,
      'pg_dump',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '--format=custom',
      '--compress=9'
    ],
    { encoding: null }
  );
  writePrivateFile(join(bundleDir, 'database', 'postgres.dump'), dump.stdout);

  const globals = docker(
    [
      'exec',
      containerName,
      'pg_dumpall',
      '-U',
      'postgres',
      '--globals-only',
      '--no-role-passwords'
    ],
    { encoding: 'utf8' }
  );
  writePrivateFile(join(bundleDir, 'database', 'postgres-globals.sql'), globals.stdout);
}

function createStorageFixture() {
  makePrivateDirectory(join(payloadDir, 'attachments', 'patients'));
  writePrivateFile(
    join(payloadDir, 'attachments', 'patients', 'restore-drill-note.txt'),
    'CVG HIS v4 restore drill fixture\n'
  );
  if (profile === 'representative') {
    writePrivateFile(
      join(payloadDir, 'attachments', 'patients', 'restore-drill-clinical-note.txt'),
      'Representative clinical note fixture for restore validation.\n'
    );
  }
  writePrivateFile(join(payloadDir, 'README.txt'), 'Fixture storage payload for restore drill.\n');

  const storageArchive = join(bundleDir, 'storage', 'file-storage.tar.gz');
  run('tar', ['-C', payloadDir, '-czf', storageArchive, '.']);
  chmodSync(storageArchive, 0o600);
  const listing = run('find', ['.', '-type', 'f'], { cwd: payloadDir, encoding: 'utf8' })
    .stdout.split('\n')
    .map((line) => line.replace(/^\.\//, '').trim())
    .filter(Boolean)
    .sort()
    .join('\n');
  writePrivateFile(join(bundleDir, 'storage', 'file-storage.contents.txt'), `${listing}\n`);
  rmSync(payloadDir, { recursive: true, force: true });
}

function writeMetadata() {
  const expectedCounts =
    profile === 'representative'
      ? {
          accounts: 1,
          owners: 1,
          patients: 1,
          encounters: 1,
          inpatient_stays: 1,
          inpatient_progress: 1,
          clinical_notes: 1,
          billing_records: 1,
          billing_items: 1,
          inventory_items: 1,
          inventory_consumptions: 1,
          encounter_financial_accounts: 1,
          encounter_receivables: 1,
          financial_journal_entries: 1,
          outbox_events: 1,
          audit_events: 1,
          documents: 1,
          encounter_documents: 1
        }
      : undefined;
  writePrivateFile(
    join(bundleDir, 'database', 'backup.info'),
    [
      'database=postgres',
      'user=postgres',
      'format=pg_dump_custom',
      'source=restore-drill-fixture',
      `profile=${profile}`,
      ...(expectedCounts ? [`expectedCounts=${JSON.stringify(expectedCounts)}`] : []),
      ''
    ].join('\n')
  );
  writePrivateFile(
    join(bundleDir, 'meta', 'manifest.json'),
    JSON.stringify(
      {
        createdAt: new Date().toISOString(),
        backupDir: bundleDir,
        source: 'restore-drill-fixture',
        profile,
        databaseDump: 'database/postgres.dump',
        globalsDump: 'database/postgres-globals.sql',
        storageIncluded: true,
        retentionDays: 1,
        ...(expectedCounts ? { expectedCounts } : {})
      },
      null,
      2
    )
  );
  writePrivateFile(
    join(bundleDir, 'meta', 'restore-hints.txt'),
    [
      'Restore drill fixture hints:',
      '1. Validate SHA256SUMS.',
      '2. Restore database/postgres-globals.sql.',
      '3. Restore database/postgres.dump with pg_restore.',
      '4. Restore storage/file-storage.tar.gz.',
      ''
    ].join('\n')
  );
}

function writeChecksums() {
  const result = run(
    'sh',
    ['-lc', 'find database storage meta -type f -print0 | sort -z | xargs -0 sha256sum'],
    {
      cwd: bundleDir,
      encoding: 'utf8'
    }
  );
  writePrivateFile(join(bundleDir, 'SHA256SUMS'), result.stdout);
}

try {
  makePrivateDirectory(bundleDir);
  makePrivateDirectory(join(bundleDir, 'database'));
  makePrivateDirectory(join(bundleDir, 'storage'));
  makePrivateDirectory(join(bundleDir, 'meta'));
  createDatabaseFixture();
  createStorageFixture();
  writeMetadata();
  writeChecksums();
  fixtureCompleted = true;
  console.log(bundleDir);
} catch (error) {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(redactSensitive(message));
  if (!fixtureCompleted) rmSync(bundleDir, { recursive: true, force: true });
  process.exitCode = 1;
} finally {
  cleanup();
}
