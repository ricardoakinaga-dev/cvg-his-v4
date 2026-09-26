import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertSupportedPostgresVersion,
  compareDatabaseSchema,
  getExpectedDatabaseTables,
  validateLoopbackDatabaseUrl
} from './database-preflight.js';
import { getMigrationFiles } from './migration-files.js';

test('accepts PostgreSQL URIs for literal or named loopback destinations', () => {
  for (const host of ['localhost', '127.0.0.1', '127.44.2.9', '[::1]']) {
    assert.doesNotThrow(() => validateLoopbackDatabaseUrl(`postgres://user:pass@${host}/cvg`));
  }
});

test('refuses remote hosts without echoing URL credentials or destination', () => {
  const secretUrl = 'postgres://user:super-secret@db.example.invalid/cvg';
  assert.throws(
    () => validateLoopbackDatabaseUrl(secretUrl),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /loopback/);
      assert.equal(error.message.includes('super-secret'), false);
      assert.equal(error.message.includes('db.example.invalid'), false);
      return true;
    }
  );
});

test('refuses connection parameters that can replace the loopback destination', () => {
  for (const parameter of ['host', 'hostaddr', 'service', 'servicefile', 'port', 'options']) {
    assert.throws(
      () => validateLoopbackDatabaseUrl(`postgres://u:p@localhost/cvg?${parameter}=remote`),
      /override/
    );
  }
});

test('requires PostgreSQL 16', () => {
  assert.doesNotThrow(() => assertSupportedPostgresVersion(160004));
  for (const version of [90624, 150009, 170000, Number.NaN, 160000.5]) {
    assert.throws(() => assertSupportedPostgresVersion(version), /PostgreSQL 16/);
  }
});

test('reports missing Drizzle tables and columns while ignoring unrelated database objects', () => {
  const differences = compareDatabaseSchema(
    [
      { schema: 'public', name: 'patients', columns: ['id', 'account_id', 'name'] },
      { schema: 'public', name: 'accounts', columns: ['id', 'slug'] }
    ],
    [
      { schema: 'public', name: 'patients', columns: ['id', 'name'] },
      { schema: 'public', name: 'unrelated', columns: ['id'] }
    ]
  );

  assert.deepEqual(differences, {
    missingTables: ['public.accounts'],
    missingColumns: ['public.patients.account_id']
  });
});

test('derives a non-empty table and migration manifest from the release sources', () => {
  const tables = getExpectedDatabaseTables();
  const migrations = getMigrationFiles();

  assert.ok(tables.some((table) => table.name === 'patients' && table.columns.includes('account_id')));
  assert.ok(migrations.length > 0);
  assert.deepEqual(migrations.map((migration) => migration.name),
    [...migrations.map((migration) => migration.name)].sort());
  assert.ok(migrations.every((migration) => /^[a-f0-9]{64}$/.test(migration.checksum)));
});
