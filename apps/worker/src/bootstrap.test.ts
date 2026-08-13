import assert from 'node:assert/strict';
import test from 'node:test';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';

test('bootstrapWorkerServices returns unhealthy when no databaseUrl provided', async () => {
  const result = await bootstrapWorkerServices({});

  assert.equal(result.databaseHealthy, false);
  assert.equal(result.databaseDetail, 'DATABASE_URL not configured');
});

test('production-like worker rejects an absent database instead of falling back', async () => {
  await assert.rejects(
    () => bootstrapWorkerServices({ environment: 'production' }),
    /requires DATABASE_URL.*not an allowed fallback/
  );
});

test('staging worker rejects an empty database URL instead of falling back', async () => {
  await assert.rejects(
    () => bootstrapWorkerServices({ environment: 'staging', databaseUrl: '' }),
    /requires DATABASE_URL.*not an allowed fallback/
  );
});

test('bootstrapWorkerServices returns unhealthy when databaseUrl is empty string', async () => {
  const result = await bootstrapWorkerServices({ databaseUrl: '' });

  assert.equal(result.databaseHealthy, false);
  assert.equal(result.databaseDetail, 'DATABASE_URL not configured');
});

test('shutdownWorkerServices completes without error', async () => {
  await shutdownWorkerServices();
});

test('bootstrapWorkerServices result has correct structure when unhealthy', async () => {
  const result = await bootstrapWorkerServices({});

  assert.ok('databaseHealthy' in result);
  assert.ok('databaseDetail' in result);
  assert.equal(result.databaseHealthy, false);
});

test('bootstrapWorkerServices returns unhealthy when connection fails', async () => {
  const unavailableDatabaseUrl = new URL('postgresql://localhost:9999/nonexistent');
  unavailableDatabaseUrl.username = 'invalid';
  unavailableDatabaseUrl.password = 'invalid';
  const result = await bootstrapWorkerServices({
    databaseUrl: unavailableDatabaseUrl.toString()
  });

  assert.equal(result.databaseHealthy, false);
});
