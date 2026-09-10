#!/usr/bin/env node

import pg from 'pg';

const { Client } = pg;
const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error('performance database configuration requires DATABASE_URL');
}

let connectionUrl;
try {
  connectionUrl = new URL(rawConnectionString);
} catch {
  throw new Error('performance database configuration received an invalid DATABASE_URL');
}

if (!['localhost', '127.0.0.1', '::1'].includes(connectionUrl.hostname)) {
  throw new Error('performance database configuration only permits a local PostgreSQL target');
}

const client = new Client({ connectionString: rawConnectionString });
try {
  await client.connect();
  await client.query("ALTER SYSTEM SET checkpoint_timeout = '30min'");
  await client.query("ALTER SYSTEM SET max_wal_size = '4GB'");
  await client.query("ALTER SYSTEM SET checkpoint_completion_target = '0.9'");
  const reload = await client.query('SELECT pg_reload_conf() AS reloaded');
  if (reload.rows[0]?.reloaded !== true) {
    throw new Error('PostgreSQL did not reload the performance checkpoint configuration');
  }
  await client.query('CHECKPOINT');
  console.log(
    'Performance PostgreSQL checkpoint policy configured for the disposable local target'
  );
} finally {
  await client.end();
}
