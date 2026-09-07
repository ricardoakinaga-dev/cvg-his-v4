import assert from 'node:assert/strict';
import test from 'node:test';
import { drizzle } from 'drizzle-orm/pg-proxy';
import { getTableColumns, type Table } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { featureFlags, featureFlagOverrides } from '@cvg-his-v2/shared-database/schemas';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type { AuditService } from '@cvg-his-v2/module-audit';
import {
  DatabaseFeatureFlagRepository,
  AuditableFeatureFlagRepository
} from './repositories/index.js';

const account = '11111111-1111-4111-8111-111111111111' as AccountId;
const other = '22222222-2222-4222-8222-222222222222' as AccountId;
const id = '33333333-3333-4333-8333-333333333333';
const overrideId = '44444444-4444-4444-8444-444444444444';
const flag = {
  id,
  accountId: account,
  key: 'test.flag',
  owner: 'team',
  description: 'before',
  defaultValue: false,
  enabled: true,
  scopes: ['environment'],
  expiresAt: null,
  auditRequired: true,
  tags: [],
  metadata: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z')
};
const override = {
  id: overrideId,
  accountId: account,
  flagId: id,
  environment: 'test',
  accountIdOverride: null,
  userId: null,
  percentage: null,
  allowedUsers: [],
  enabled: true,
  createdAt: flag.createdAt,
  updatedAt: flag.updatedAt
};
type Query = { sql: string; params: unknown[] };
function transport(
  respond: (query: Query) => { table: Table; row?: Record<string, unknown> },
  queries: Query[] = []
): DatabaseClient {
  // Exercise real Drizzle SQL generation and row decoding without a DB service.
  return drizzle(async (sql, params) => {
    const query = { sql, params };
    queries.push(query);
    const { table, row } = respond(query);
    const selected =
      sql.includes('returning "id"') && !sql.includes('returning "id",')
        ? ['id']
        : Object.keys(getTableColumns(table));
    return {
      rows: row
        ? [selected.map((key) => (row[key] instanceof Date ? row[key].toISOString() : row[key]))]
        : []
    };
  }) as unknown as DatabaseClient;
}

test('legacy repository builds real parameterized SQL and maps returned rows', async () => {
  const queries: Query[] = [];
  const db = transport(() => ({ table: featureFlags, row: flag }), queries);
  const repository = new DatabaseFeatureFlagRepository(db);
  const created = await repository.createFlag({
    accountId: account,
    key: flag.key,
    owner: flag.owner,
    description: flag.description
  });
  assert.equal(created.key, flag.key);
  assert.ok(created.createdAt instanceof Date);
  assert.match(queries[0]!.sql, /^insert into "feature_flags"/);
  assert.ok(queries[0]!.params.includes(account));
  await repository.findFlagByKey(flag.key, account);
  assert.match(queries[1]!.sql, /"key" = \$\d+ and "feature_flags"\."account_id" = \$\d+/);
  assert.deepEqual(queries[1]!.params.slice(0, 2), [flag.key, account]);
  await repository.updateFlag(id, { description: 'after' });
  assert.match(queries[2]!.sql, /^update "feature_flags"/);
  assert.ok(queries[2]!.params.includes('after'));
  await repository.deleteFlag(id);
  assert.match(queries[3]!.sql, /returning "id"/);
});

test('scoped ID writes constrain account and override parent ownership before mutation', async () => {
  const queries: Query[] = [];
  const db = transport(
    (q) => ({
      table: q.sql.startsWith('update "feature_flag_overrides"')
        ? featureFlagOverrides
        : featureFlags
    }),
    queries
  );
  const repository = new DatabaseFeatureFlagRepository(db, account);
  await assert.rejects(repository.updateFlag(id, { enabled: false }), /not found/);
  await assert.rejects(repository.deleteFlag(id), /not found/);
  await assert.rejects(repository.updateOverride(overrideId, { enabled: false }), /not found/);
  await assert.rejects(repository.deleteOverride(overrideId), /not found/);
  for (const query of queries) {
    assert.match(query.sql, /"account_id" = \$\d+/);
    assert.ok(query.params.includes(account));
  }
  for (const query of queries.slice(2)) {
    assert.match(query.sql, /exists \(select/);
    assert.match(query.sql, /"feature_flags"\."id" = "feature_flag_overrides"\."flag_id"/);
  }
  await assert.rejects(
    repository.createOverride({ accountId: account, flagId: id }),
    /not found in override account/
  );
  assert.equal(
    queries.some((q) => q.sql.startsWith('insert')),
    false
  );
  const count = queries.length;
  await assert.rejects(
    repository.createFlag({ accountId: other, key: flag.key, owner: 'x', description: 'x' }),
    /account mismatch/
  );
  await assert.rejects(repository.listFlags(other), /account mismatch/);
  assert.equal(queries.length, count);
});

test('administrative findOverride preserves optional wildcard filters and deterministic ordering', async () => {
  const queries: Query[] = [];
  const repository = new DatabaseFeatureFlagRepository(
    transport(() => ({ table: featureFlagOverrides, row: override }), queries)
  );
  assert.equal((await repository.findOverride(id, ''))?.id, overrideId);
  assert.doesNotMatch(queries[0]!.sql, /"user_id" is null|"account_id_override" =|"environment" =/);
  assert.match(
    queries[0]!.sql,
    /order by "feature_flag_overrides"\."updated_at" desc, "feature_flag_overrides"\."id"/
  );
  await repository.findOverride(id, 'test', account);
  assert.ok(queries[1]!.params.includes('test'));
  assert.ok(queries[1]!.params.includes(account));
  assert.doesNotMatch(queries[1]!.sql, /"user_id" is null/);
});

test('audit uses ID-scoped before state and describes every changed mutable field', async () => {
  let next: Record<string, unknown> = { ...flag, description: 'after' };
  const events: Array<{ payloadSummary: string }> = [],
    queries: Query[] = [];
  const audit = {
    write(event: { payloadSummary: string }) {
      events.push(event);
      return {};
    }
  } as unknown as AuditService;
  const db = transport(
    (q) => ({ table: featureFlags, row: q.sql.startsWith('select') ? flag : next }),
    queries
  );
  const repository = new AuditableFeatureFlagRepository(db, audit, 'actor', account);
  await repository.updateFlag(id, { description: 'after' });
  assert.match(events[0]!.payloadSummary, /description: before→after/);
  assert.doesNotMatch(events[0]!.payloadSummary, /no field changes|entire record/);
  assert.match(queries[0]!.sql, /"id" = \$\d+/);
  assert.ok(queries[0]!.params.includes(id));
  assert.equal(queries[0]!.params.includes(flag.key), false);
  const expiresAt = new Date('2026-12-01T00:00:00Z');
  next = {
    ...flag,
    expiresAt,
    scopes: ['account', 'user'],
    tags: ['rollout'],
    auditRequired: false
  };
  await repository.updateFlag(id, {
    expiresAt: expiresAt.toISOString(),
    scopes: ['account', 'user'],
    tags: ['rollout'],
    auditRequired: false
  });
  for (const field of ['expiresAt', 'scopes', 'tags', 'auditRequired'])
    assert.ok(events[1]!.payloadSummary.includes(`${field}:`));
  const count = queries.length;
  await assert.rejects(repository.findFlagByKey(flag.key, other), /account mismatch/);
  await assert.rejects(
    repository.createFlag({ accountId: other, key: flag.key, owner: 'x', description: 'x' }),
    /account mismatch/
  );
  assert.equal(queries.length, count);
  assert.equal(events.length, 2);
});
