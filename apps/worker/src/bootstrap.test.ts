import assert from 'node:assert/strict';
import test from 'node:test';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';

test('bootstrapWorkerServices returns unhealthy when no databaseUrl provided', async () => {
  const result = await bootstrapWorkerServices({});

  assert.equal(result.databaseHealthy, false);
  assert.equal(result.databaseDetail, 'DATABASE_URL not configured');
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
  const result = await bootstrapWorkerServices({
    databaseUrl: 'postgresql://invalid:invalid@localhost:9999/nonexistent'
  });

  assert.equal(result.databaseHealthy, false);
});
