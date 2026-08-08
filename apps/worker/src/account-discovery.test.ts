import assert from 'node:assert/strict';
import test from 'node:test';

import { refreshWorkerAccounts } from './account-discovery.js';

test('refreshWorkerAccounts discovers newly persisted accounts without duplicates', async () => {
  const result = await refreshWorkerAccounts({
    currentAccountIds: ['account-a'],
    loadAccountIds: async () => ['account-a', 'account-b', 'account-b'],
    environment: 'production'
  });

  assert.deepEqual(result.accountIds, ['account-a', 'account-b']);
  assert.deepEqual(result.discoveredAccountIds, ['account-b']);
});

test('refreshWorkerAccounts stops scheduling accounts removed from persistence', async () => {
  const result = await refreshWorkerAccounts({
    currentAccountIds: ['account-a', 'account-b'],
    loadAccountIds: async () => ['account-b'],
    environment: 'production'
  });

  assert.deepEqual(result.accountIds, ['account-b']);
  assert.deepEqual(result.discoveredAccountIds, []);
});

test('refreshWorkerAccounts honors a fixed account without querying persistence', async () => {
  let loadCalls = 0;
  const result = await refreshWorkerAccounts({
    currentAccountIds: [],
    configuredAccountId: 'account-fixed',
    loadAccountIds: async () => {
      loadCalls += 1;
      return ['account-other'];
    },
    environment: 'production'
  });

  assert.equal(loadCalls, 0);
  assert.deepEqual(result.accountIds, ['account-fixed']);
  assert.deepEqual(result.discoveredAccountIds, ['account-fixed']);
});

test('refreshWorkerAccounts keeps the last known accounts when a periodic refresh fails', async () => {
  const result = await refreshWorkerAccounts({
    currentAccountIds: ['account-a'],
    loadAccountIds: async () => {
      throw new Error('database unavailable');
    },
    environment: 'production',
    tolerateLoadFailure: true
  });

  assert.deepEqual(result.accountIds, ['account-a']);
  assert.deepEqual(result.discoveredAccountIds, []);
  assert.equal(result.loadError, 'database unavailable');
});

test('refreshWorkerAccounts keeps the last known accounts on an empty production refresh', async () => {
  const result = await refreshWorkerAccounts({
    currentAccountIds: ['account-a'],
    loadAccountIds: async () => [],
    environment: 'production',
    tolerateLoadFailure: true
  });

  assert.deepEqual(result.accountIds, ['account-a']);
  assert.deepEqual(result.discoveredAccountIds, []);
  assert.match(result.loadError ?? '', /no persisted accounts/);
});

test('refreshWorkerAccounts rejects an empty production account set at startup', async () => {
  await assert.rejects(
    refreshWorkerAccounts({
      currentAccountIds: [],
      loadAccountIds: async () => [],
      environment: 'production'
    }),
    /at least one persisted account/
  );
});

test('refreshWorkerAccounts uses the development fallback only outside production', async () => {
  const result = await refreshWorkerAccounts({
    currentAccountIds: [],
    loadAccountIds: async () => [],
    environment: 'development'
  });

  assert.deepEqual(result.accountIds, ['acc_cvg_demo']);
  assert.deepEqual(result.discoveredAccountIds, ['acc_cvg_demo']);
});
