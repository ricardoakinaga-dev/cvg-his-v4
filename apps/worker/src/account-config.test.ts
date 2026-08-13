import assert from 'node:assert/strict';
import test from 'node:test';

import { loadWorkerAccountConfig } from './account-config.js';

const ACCOUNT_A = '11111111-1111-4111-8111-111111111111';
const ACCOUNT_B = '22222222-2222-4222-8222-222222222222';

test('loadWorkerAccountConfig parses, normalizes and freezes WORKER_ACCOUNT_IDS', () => {
  const result = loadWorkerAccountConfig(
    { WORKER_ACCOUNT_IDS: ` ${ACCOUNT_A.toUpperCase()}, ${ACCOUNT_B} ` },
    'production'
  );

  assert.deepEqual(result.accountIds, [ACCOUNT_A, ACCOUNT_B]);
  assert.equal(Object.isFrozen(result.accountIds), true);
  assert.equal(Object.isFrozen(result), true);
});

test('loadWorkerAccountConfig rejects a missing account list in production and staging', () => {
  assert.throws(
    () => loadWorkerAccountConfig({}, 'production'),
    /Production-like worker requires WORKER_ACCOUNT_IDS with at least one UUID/
  );
  assert.throws(
    () => loadWorkerAccountConfig({ WORKER_ACCOUNT_IDS: '   ' }, 'staging'),
    /Production-like worker requires WORKER_ACCOUNT_IDS with at least one UUID/
  );
});

test('loadWorkerAccountConfig allows an empty list only outside production-like environments', () => {
  assert.deepEqual(loadWorkerAccountConfig({}, 'test').accountIds, []);
  assert.deepEqual(
    loadWorkerAccountConfig({ WORKER_ACCOUNT_IDS: '  ' }, 'development').accountIds,
    []
  );
});

test('loadWorkerAccountConfig rejects malformed, empty and duplicate entries', () => {
  assert.throws(
    () => loadWorkerAccountConfig({ WORKER_ACCOUNT_IDS: `${ACCOUNT_A},not-a-uuid` }, 'test'),
    /valid UUID/
  );
  assert.throws(
    () => loadWorkerAccountConfig({ WORKER_ACCOUNT_IDS: `${ACCOUNT_A},,${ACCOUNT_B}` }, 'test'),
    /empty entry/
  );
  assert.throws(
    () => loadWorkerAccountConfig({ WORKER_ACCOUNT_IDS: `${ACCOUNT_A},${ACCOUNT_A}` }, 'test'),
    /duplicate UUID/
  );
});

test('loadWorkerAccountConfig rejects the legacy singular variable', () => {
  assert.throws(
    () => loadWorkerAccountConfig({ WORKER_ACCOUNT_ID: ACCOUNT_A }, 'test'),
    /WORKER_ACCOUNT_ID is not supported; configure WORKER_ACCOUNT_IDS/
  );
});
