import assert from 'node:assert/strict';

import { beforeEach, expect, test, vi } from 'vitest';

import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

import {
  DatabaseApiKeyRepository,
  mapDatabaseApiKeyAuthRow,
  mapDatabaseApiKeyRow
} from './database-api-key.repository.js';

vi.mock('@cvg-his-v2/shared-database', () => ({
  getPool: vi.fn()
}));

vi.mock('@cvg-his-v2/tenant-context', () => ({
  withTenantQuery: vi.fn(async (pool: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn(pool))
}));

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

const authRow = {
  id: row.id,
  account_id: row.account_id,
  key_hash: row.key_hash,
  permissions: row.permissions,
  rate_limit: row.rate_limit,
  rate_limit_window: row.rate_limit_window,
  expires_at: row.expires_at,
  is_active: row.is_active
};

const query = vi.fn();
const client = { query };

beforeEach(() => {
  query.mockReset();
  vi.mocked(getPool).mockReturnValue(client as never);
  vi.mocked(withTenantQuery).mockImplementation(
    async (pool, fn) => fn(pool as never)
  );
});

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

test('mapDatabaseApiKeyAuthRow accepts only the minimum pre-context authentication projection', () => {
  const mapped = mapDatabaseApiKeyAuthRow({
    id: row.id,
    account_id: row.account_id,
    key_hash: row.key_hash,
    permissions: row.permissions,
    rate_limit: row.rate_limit,
    rate_limit_window: row.rate_limit_window,
    expires_at: row.expires_at,
    is_active: row.is_active
  });

  expect(Object.keys(mapped).sort()).toEqual([
    'accountId',
    'expiresAt',
    'id',
    'isActive',
    'keyHash',
    'permissions',
    'rateLimit',
    'rateLimitWindow'
  ]);
  expect(mapped.accountId).toBe(row.account_id);
  expect(mapped.permissions).toEqual(row.permissions);
});

test('DatabaseApiKeyRepository executes CRUD and tenant-scoped lookups', async () => {
  const repository = new DatabaseApiKeyRepository();

  await repository.create({
    ...mapDatabaseApiKeyRow(row),
    permissions: Object.freeze(['payments.manage'])
  });
  query.mockResolvedValueOnce({ rows: [row] });
  expect(await repository.findById(row.id as never)).toMatchObject({ id: row.id });
  query.mockResolvedValueOnce({ rows: [row] });
  expect(await repository.findByAccount(row.account_id)).toHaveLength(1);
  query.mockResolvedValueOnce({ rows: [row] });
  expect(await repository.findByPrefix(row.key_prefix)).toHaveLength(1);

  query.mockResolvedValueOnce({ rows: [authRow] });
  expect(await repository.findActiveByKeyHash(row.key_prefix, row.key_hash)).toMatchObject([
    { id: row.id, accountId: row.account_id }
  ]);
  query.mockResolvedValueOnce({ rows: [row] });
  expect(await repository.findActiveById(row.id as never)).toMatchObject({ id: row.id });

  await repository.update(mapDatabaseApiKeyRow(row));
  await repository.delete(row.id as never);

  expect(query).toHaveBeenCalled();
  expect(vi.mocked(withTenantQuery)).toHaveBeenCalled();
});

test('DatabaseApiKeyRepository returns empty results for missing keys and usage', async () => {
  const repository = new DatabaseApiKeyRepository();

  query.mockResolvedValue({ rows: [] });
  expect(await repository.findById('missing' as never)).toBeNull();
  expect(await repository.findByAccount('account-missing')).toEqual([]);
  expect(await repository.findByPrefix('prefix-missing')).toEqual([]);
  expect(await repository.findActiveById('missing' as never)).toBeNull();
  expect(await repository.getUsageCount('missing', new Date())).toBe(0);
  expect(await repository.getUsageHistory('missing')).toEqual([]);
});

test('DatabaseApiKeyRepository handles atomic rate-limit update, insert and exhausted retry paths', async () => {
  const repository = new DatabaseApiKeyRepository();
  const windowStart = new Date('2026-01-01T00:00:00.000Z');

  query.mockResolvedValueOnce({ rows: [{ request_count: 3 }] });
  await expect(repository.consumeRateLimit('key-1', windowStart, 10)).resolves.toEqual({
    allowed: true,
    current: 2,
    remaining: 7
  });

  query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ request_count: 1 }] });
  await expect(repository.consumeRateLimit('key-1', windowStart, 10)).resolves.toEqual({
    allowed: true,
    current: 0,
    remaining: 9
  });

  query
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [] })
    .mockResolvedValueOnce({ rows: [{ request_count: 10 }] });
  await expect(repository.consumeRateLimit('key-1', windowStart, 10)).resolves.toEqual({
    allowed: false,
    current: 10,
    remaining: 0
  });
});

test('DatabaseApiKeyRepository persists usage and maps optional values', async () => {
  const repository = new DatabaseApiKeyRepository();
  const windowStart = new Date('2026-01-01T00:00:00.000Z');

  await repository.incrementUsage('key-1', windowStart);
  await repository.recordUsage({
    id: 'usage-1',
    apiKeyId: 'key-1',
    endpoint: '/health',
    method: 'GET',
    statusCode: null,
    responseTimeMs: null,
    createdAt: windowStart.toISOString()
  });
  query.mockResolvedValueOnce({ rows: [{ request_count: 4 }] });
  expect(await repository.getUsageCount('key-1', windowStart)).toBe(4);
  query.mockResolvedValueOnce({
    rows: [
      {
        id: 'usage-1',
        api_key_id: 'key-1',
        endpoint: '/health',
        method: 'GET',
        status_code: null,
        response_time_ms: null,
        created_at: windowStart
      }
    ]
  });
  expect(await repository.getUsageHistory('key-1', 20)).toEqual([
    {
      id: 'usage-1',
      apiKeyId: 'key-1',
      endpoint: '/health',
      method: 'GET',
      statusCode: null,
      responseTimeMs: null,
      createdAt: windowStart.toISOString()
    }
  ]);
});

test('DatabaseApiKeyRepository rejects malformed persisted rows fail closed', () => {
  expect(() => mapDatabaseApiKeyRow({ ...row, id: 42 })).toThrow(/id must be a string/);
  expect(() => mapDatabaseApiKeyRow({ ...row, rate_limit: Number.NaN })).toThrow(
    /rate_limit must be a finite number/
  );
  expect(() => mapDatabaseApiKeyRow({ ...row, is_active: 'true' })).toThrow(
    /is_active must be a boolean/
  );
  expect(() => mapDatabaseApiKeyRow({ ...row, created_at: 'not-a-date' })).toThrow(
    /created_at must be a date/
  );
  expect(() => mapDatabaseApiKeyRow({ ...row, permissions: '["ok"' })).toThrow(
    /permissions must be JSON/
  );
  expect(() => mapDatabaseApiKeyRow({ ...row, permissions: [1] })).toThrow(
    /permissions must be an array of strings/
  );
});
