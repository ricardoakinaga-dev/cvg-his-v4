import assert from 'node:assert/strict';
import test from 'node:test';

import { bootstrapServices } from './bootstrap.js';

test('production-like bootstrap rejects an absent database instead of using memory', async () => {
  await assert.rejects(
    () => bootstrapServices({ environment: 'production', skipDatabase: true }),
    /requires DATABASE_URL.*not an allowed fallback/
  );
});

test('development bootstrap keeps the explicit local in-memory mode available', async () => {
  const result = await bootstrapServices({ environment: 'development', skipDatabase: true });

  assert.equal(result.databaseHealthy, false);
  assert.equal(result.repositoriesUseDatabase, false);
  assert.equal(result.databaseDetail, 'Using in-memory repositories');
});
