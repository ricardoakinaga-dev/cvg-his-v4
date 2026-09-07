import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { withPrivatePostgres } from './lib/private-postgres.mjs';

const configuration = () => ({ binDir: process.env.NATIVE_POSTGRES_BIN, shareDir: process.env.NATIVE_POSTGRES_SHARE, libraryDir: process.env.NATIVE_POSTGRES_LIB });

test('private PostgreSQL creates a new isolated database and stops its owned process', async () => {
  let connectionString;
  const result = await withPrivatePostgres({ ...configuration(), run: async ({ databaseUrl }) => {
    connectionString = databaseUrl;
    const client = new pg.Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.query('CREATE TABLE isolated_probe(id integer PRIMARY KEY)');
      await client.query('INSERT INTO isolated_probe VALUES (42)');
      return (await client.query('SELECT id FROM isolated_probe')).rows[0].id;
    } finally { await client.end(); }
  } });
  assert.equal(result.value, 42);
  assert.equal(result.evidence.tcpEnabled, false);
  assert.equal(result.evidence.stopped.code, 0);
  assert.equal(existsSync(join(result.evidence.directory, 'data/postmaster.pid')), false);
  const client = new pg.Client({ connectionString, connectionTimeoutMillis: 500 });
  try { await assert.rejects(() => client.connect()); } finally { await client.end().catch(() => {}); }
});

test('private PostgreSQL stops even when the test callback fails', async () => {
  let directory;
  await assert.rejects(() => withPrivatePostgres({ ...configuration(), run: async (context) => { directory = context.directory; throw new Error('fixture failure'); } }), /fixture failure/);
  assert.ok(directory);
  assert.equal(existsSync(join(directory, 'data/postmaster.pid')), false);
});
