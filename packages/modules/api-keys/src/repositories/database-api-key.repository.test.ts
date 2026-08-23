import assert from 'node:assert/strict';

import { test } from 'vitest';

import { mapDatabaseApiKeyRow } from './database-api-key.repository.js';

const row = {
  id: 'key_1',
  account_id: 'account_1',
  name: 'Integration',
  key_prefix: 'cvg_1234',
  key_hash: 'a'.repeat(64),
  permissions: ['payments.manage'],
  rate_limit: 1000,
  rate_limit_window: 3600,
  expires_at: null,
  last_used_at: null,
  is_active: true,
  created_by: 'user_1',
  created_at: new Date('2026-01-01T00:00:00.000Z'),
  updated_at: new Date('2026-01-01T00:00:00.000Z')
};

test('mapDatabaseApiKeyRow accepts node-postgres JSONB arrays', () => {
  const mapped = mapDatabaseApiKeyRow(row);

  assert.deepEqual(mapped.permissions, ['payments.manage']);
  assert.notStrictEqual(mapped.permissions, row.permissions);
  assert.equal(mapped.createdAt, '2026-01-01T00:00:00.000Z');
});

test('mapDatabaseApiKeyRow accepts JSON encoded permissions for compatible drivers', () => {
  const mapped = mapDatabaseApiKeyRow({ ...row, permissions: '["payments.manage"]' });

  assert.deepEqual(mapped.permissions, ['payments.manage']);
});

test('mapDatabaseApiKeyRow rejects malformed JSONB permissions', () => {
  assert.throws(
    () => mapDatabaseApiKeyRow({ ...row, permissions: { permission: 'payments.manage' } }),
    /permissions must be an array of strings/
  );
});
