import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { it } from 'vitest';
import {
  createScopedDatabaseClient,
  type DatabaseClient
} from '../../../packages/shared/database/src/index.js';
import {
  DatabaseFeatureFlagRepository,
  AuditableFeatureFlagRepository
} from '@cvg-his-v2/shared-feature-flags/repositories';
import { createDatabaseFeatureFlagProvider } from '@cvg-his-v2/shared-feature-flags/database-provider';
import {
  createFlagDecision,
  type FlagDefinition,
  type FeatureFlagProvider
} from '@cvg-his-v2/shared-feature-flags';
import { AuditService } from '../../../packages/modules/audit/src/index.js';
import { DatabaseAuditRepository } from '../../../packages/modules/audit/src/repositories/database-audit.repository.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

async function withFixture(
  run: (f: {
    db: DatabaseClient;
    repository: DatabaseFeatureFlagRepository;
    audit: AuditService;
    audited: AuditableFeatureFlagRepository;
    accountA: string;
    accountB: string;
    actor: string;
  }) => Promise<void>
): Promise<void> {
  const pool = getTestPool(),
    client = await pool.connect();
  const tenant = randomUUID(),
    accountA = randomUUID(),
    accountB = randomUUID(),
    actor = randomUUID();
  const db = createScopedDatabaseClient(client);
  const audit = new AuditService({ auditRepository: new DatabaseAuditRepository(db) });
  try {
    await client.query(
      "INSERT INTO tenants (id,slug,name,status) VALUES ($1,$2,'Flag persistence tenant','active')",
      [tenant, `flag-${tenant}`]
    );
    await client.query(
      "INSERT INTO accounts (id,tenant_id,slug,name) VALUES ($1,$3,$4,'Flag account A'),($2,$3,$5,'Flag account B')",
      [accountA, accountB, tenant, `a-${accountA}`, `b-${accountB}`]
    );
    await client.query(
      "INSERT INTO users (id,account_id,username,email,password_hash,full_name) VALUES ($1,$2,$3,$4,'test-hash','Flag actor')",
      [actor, accountA, `flag-${actor}`, `${actor}@example.test`]
    );
    await run({
      db,
      repository: new DatabaseFeatureFlagRepository(db),
      audit,
      audited: new AuditableFeatureFlagRepository(db, audit, actor, accountA),
      accountA,
      accountB,
      actor
    });
  } finally {
    try {
      await audit.waitForPersistence();
      await client.query('DELETE FROM audit_events WHERE account_id = ANY($1::uuid[])', [
        [accountA, accountB]
      ]);
      await client.query('DELETE FROM tenants WHERE id=$1', [tenant]);
    } finally {
      client.release();
    }
  }
}
const definition = (key: string): FlagDefinition => ({
  key,
  owner: 'flags-test',
  description: 'Real PostgreSQL feature flag',
  defaultValue: false,
  scopes: ['environment', 'account', 'user']
});
const input = (accountId: string, key: string) => ({
  ...definition(key),
  accountId: accountId as never
});

it('legacy repository persists canonical JSONB booleans, arrays, dates, CRUD and override values', async () =>
  withFixture(async ({ repository, accountA, accountB, actor }) => {
    const expiration = '2030-09-06T15:34:56.789Z';
    const flag = await repository.createFlag({
      ...input(accountA, 'json-roundtrip'),
      defaultValue: false,
      auditRequired: false,
      scopes: ['account', 'user'],
      tags: ['one', 'two'],
      expiresAt: expiration
    });
    assert.equal(flag.defaultValue, false);
    assert.equal(flag.auditRequired, false);
    assert.equal(flag.enabled, true);
    assert.deepEqual(flag.scopes, ['account', 'user']);
    assert.deepEqual(flag.tags, ['one', 'two']);
    assert.equal(flag.expiresAt?.toISOString(), expiration);
    assert(flag.createdAt instanceof Date);
    assert(flag.updatedAt instanceof Date);
    const raw = (
      await getTestPool().query(
        'SELECT default_value,enabled,audit_required,scopes,tags,jsonb_typeof(default_value) AS kind FROM feature_flags WHERE id=$1',
        [flag.id]
      )
    ).rows[0];
    assert.deepEqual(raw, {
      default_value: false,
      enabled: true,
      audit_required: false,
      scopes: ['account', 'user'],
      tags: ['one', 'two'],
      kind: 'boolean'
    });
    await repository.updateFlag(flag.id, {
      defaultValue: true,
      auditRequired: true,
      owner: 'changed-owner',
      tags: [],
      scopes: ['environment'],
      expiresAt: '2031-01-02T03:04:05.000Z'
    });
    const updated = await repository.findFlagByKey(flag.key, accountA as never);
    assert.equal(updated?.defaultValue, true);
    assert.equal(updated?.auditRequired, true);
    assert.deepEqual(updated?.tags, []);
    assert.equal(updated?.expiresAt?.toISOString(), '2031-01-02T03:04:05.000Z');
    await repository.createFlag({ ...input(accountB, flag.key), defaultValue: false });
    assert.equal(
      (await repository.findFlagByKey(flag.key, accountB as never))?.defaultValue,
      false
    );
    assert.equal(await repository.findFlagByKey('missing', accountA as never), null);
    assert((await repository.listFlags(accountA as never)).every((f) => f.accountId === accountA));
    const override = await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      environment: 'test',
      accountIdOverride: accountA as never,
      percentage: 37,
      allowedUsers: [actor],
      enabled: false
    });
    assert.equal(override.percentage, 37);
    assert.equal(override.enabled, false);
    assert.deepEqual(override.allowedUsers, [actor]);
    assert(override.createdAt instanceof Date);
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      environment: 'user-test',
      accountIdOverride: accountA as never,
      userId: actor,
      enabled: true
    });
    assert.equal(
      (await repository.findOverride(flag.id, 'test', accountA as never))?.id,
      override.id
    );
    assert((await repository.listOverrides(flag.id)).some((row) => row.userId === actor));
    await repository.updateOverride(override.id, {
      percentage: 0,
      allowedUsers: [],
      enabled: true
    });
    const changed = (await repository.listOverrides(flag.id)).find((row) => row.id === override.id);
    assert.equal(changed?.percentage, 0);
    assert.deepEqual(changed?.allowedUsers, []);
    assert.equal(changed?.enabled, true);
    await repository.deleteOverride(override.id);
    assert.equal(
      (await repository.listOverrides(flag.id)).find((row) => row.id === override.id)?.enabled,
      false
    );
    await repository.deleteFlag(flag.id);
    assert.equal((await repository.findFlagByKey(flag.key, accountA as never))?.enabled, false);
  }));

it('auditable wrapper refuses foreign-account IDs and inputs before any flag, override or audit write', async () =>
  withFixture(async ({ repository, audited, audit, accountA, accountB }) => {
    const foreign = await repository.createFlag(input(accountB, 'foreign-only'));
    const override = await repository.createOverride({
      accountId: accountB as never,
      flagId: foreign.id,
      environment: 'test'
    });
    const snapshot = async () =>
      (
        await getTestPool().query(
          'SELECT (SELECT jsonb_agg(to_jsonb(f) ORDER BY id) FROM feature_flags f WHERE account_id=ANY($1::uuid[])) AS flags,(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM feature_flag_overrides o WHERE account_id=ANY($1::uuid[])) AS overrides,(SELECT count(*)::int FROM audit_events WHERE account_id=ANY($1::uuid[])) AS audits',
          [[accountA, accountB]]
        )
      ).rows[0];
    const before = await snapshot();
    for (const attempt of [
      () => audited.createFlag(input(accountB, 'forbidden-create')),
      () => audited.updateFlag(foreign.id, { enabled: false }),
      () => audited.deleteFlag(foreign.id),
      () => audited.createOverride({ accountId: accountB as never, flagId: foreign.id }),
      () => audited.createOverride({ accountId: accountA as never, flagId: foreign.id }),
      () => audited.updateOverride(override.id, { enabled: false }),
      () => audited.deleteOverride(override.id)
    ])
      await assert.rejects(attempt);
    await audit.waitForPersistence();
    assert.deepEqual(await snapshot(), before);
    assert.equal(audit.list().length, 0);
  }));

it('auditable writes persist real before/after differences and the correct actor/account', async () =>
  withFixture(async ({ audited, audit, accountA, actor }) => {
    const flag = await audited.createFlag({
      ...input(accountA, 'audit-difference'),
      owner: 'before-owner',
      defaultValue: false
    });
    await audited.updateFlag(flag.id, { owner: 'after-owner', defaultValue: true });
    await audited.deleteFlag(flag.id);
    await audit.waitForPersistence();
    const rows = (
      await getTestPool().query(
        'SELECT action,actor_user_id,account_id,entity_id,metadata FROM audit_events WHERE entity_id=$1 ORDER BY action',
        [flag.id]
      )
    ).rows;
    assert.deepEqual(
      rows.map((r) => r.action),
      ['flag.create', 'flag.delete', 'flag.update']
    );
    for (const row of rows) {
      assert.equal(row.actor_user_id, actor);
      assert.equal(row.account_id, accountA);
      assert.equal(row.entity_id, flag.id);
      assert.equal(row.metadata.riskLevel, 'high');
    }
    const update = rows.find((r) => r.action === 'flag.update');
    assert.match(update.metadata.payloadSummary, /defaultValue: false→true/);
    assert.match(update.metadata.payloadSummary, /owner: before-owner→after-owner/);
    assert.doesNotMatch(update.metadata.payloadSummary, /entire record/);
  }));

it('provider isolates account decisions and invalidates every cached context for a flag', async () =>
  withFixture(async ({ db, repository, accountA, accountB }) => {
    const def = definition('provider-cache');
    const a = await repository.createFlag({ ...input(accountA, def.key), defaultValue: false });
    await repository.createFlag({ ...input(accountB, def.key), defaultValue: true });
    const fallback: FeatureFlagProvider = {
      name: 'async-fallback',
      async evaluate(d, c) {
        return createFlagDecision(d, c, {
          enabled: false,
          provider: 'async-fallback',
          reason: 'fallback'
        });
      }
    };
    const provider = createDatabaseFeatureFlagProvider(db, fallback, { cacheTtlMs: 60_000 });
    const context = { accountId: accountA, environment: 'test' };
    assert.equal((await provider.evaluate(def, context)).enabled, false);
    assert.equal(
      (await provider.evaluate(def, { ...context, environment: 'staging' })).enabled,
      false
    );
    assert.equal((await provider.evaluate(def, { ...context, accountId: accountB })).enabled, true);
    await repository.updateFlag(a.id, { defaultValue: true });
    assert.equal((await provider.evaluate(def, context)).enabled, false);
    provider.invalidateCache(def.key);
    assert.equal((await provider.evaluate(def, context)).enabled, true);
    assert.equal(
      (await provider.evaluate(def, { ...context, environment: 'staging' })).enabled,
      true
    );
    const override = await repository.createOverride({
      accountId: accountA as never,
      flagId: a.id,
      environment: 'test',
      accountIdOverride: accountA as never,
      enabled: false
    });
    provider.invalidateCache(def.key);
    assert.equal((await provider.evaluate(def, context)).reason, 'kill_switch');
    assert.equal((await provider.evaluate(def, { ...context, accountId: accountB })).enabled, true);
    await repository.updateOverride(override.id, { enabled: true, percentage: 0 });
    provider.invalidateCache();
    assert.equal((await provider.evaluate(def, context)).enabled, false);
  }));

it('provider awaits asynchronous fallback after a real PostgreSQL connection closes and caches its decision', async () =>
  withFixture(async ({ accountA }) => {
    const pool = new Pool({ connectionString: TEST_DB_URL });
    await pool.query('SELECT 1');
    const db = drizzle(pool) as DatabaseClient;
    await pool.end();
    let fallbackCalls = 0;
    const evaluations: unknown[] = [];
    const fallback: FeatureFlagProvider = {
      name: 'async-fallback',
      async evaluate(d, c) {
        fallbackCalls++;
        await Promise.resolve();
        return createFlagDecision(d, c, {
          enabled: true,
          provider: 'async-fallback',
          reason: 'fallback'
        });
      }
    };
    const provider = createDatabaseFeatureFlagProvider(db, fallback, {
      metrics: {
        recordEvaluation(e) {
          evaluations.push(e);
        },
        recordFallback() {},
        recordError() {}
      }
    });
    const def = definition('closed-database'),
      context = { accountId: accountA, environment: 'test' };
    const decision = await provider.evaluate(def, context);
    assert.equal(decision.enabled, true);
    assert.equal(decision.provider, 'async-fallback');
    const cached = await provider.evaluate(def, context);
    assert.equal(cached.enabled, true);
    assert.equal(cached.provider, 'async-fallback');
    assert.equal(cached.reason, decision.reason);
    assert.equal(fallbackCalls, 1);
    assert(evaluations.every((e) => typeof (e as { enabled: unknown }).enabled === 'boolean'));
    provider.invalidateCache(def.key);
    assert.equal((await provider.evaluate(def, context)).enabled, true);
    assert.equal(fallbackCalls, 2);
  }));

it('provider SQL respects user, account, environment and global precedence without inheriting foreign overrides', async () =>
  withFixture(async ({ db, repository, accountA, accountB, actor }) => {
    const def = definition('sql-override-precedence');
    const flag = await repository.createFlag({ ...input(accountA, def.key), defaultValue: true });
    const fallback: FeatureFlagProvider = {
      name: 'unexpected-fallback',
      evaluate() {
        throw new Error('Persisted flag must be evaluated from PostgreSQL');
      }
    };
    // Disable caching so every assertion exercises the real SQL selection.
    const provider = createDatabaseFeatureFlagProvider(db, fallback, { cacheTtlMs: 0 });
    const context = { accountId: accountA, environment: 'test' };
    const otherUser = randomUUID();
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      enabled: false
    });
    assert.equal((await provider.evaluate(def, context)).enabled, false);
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      environment: 'test',
      enabled: true
    });
    assert.equal((await provider.evaluate(def, context)).enabled, true);
    assert.equal(
      (await provider.evaluate(def, { ...context, environment: 'staging' })).enabled,
      false
    );
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      accountIdOverride: accountA as never,
      enabled: false
    });
    assert.equal((await provider.evaluate(def, context)).enabled, false);
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      userId: actor,
      enabled: true
    });
    assert.equal((await provider.evaluate(def, { ...context, userId: actor })).enabled, true);
    assert.equal(
      (await provider.evaluate(def, { ...context, environment: 'staging', userId: actor })).enabled,
      true
    );
    assert.equal((await provider.evaluate(def, context)).enabled, false);
    assert.equal((await provider.evaluate(def, { ...context, userId: otherUser })).enabled, false);

    // Higher-specificity rows with a different target account or environment
    // must be removed by the SQL predicate before precedence is evaluated.
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      accountIdOverride: accountB as never,
      environment: 'test',
      userId: actor,
      enabled: false
    });
    await repository.createOverride({
      accountId: accountA as never,
      flagId: flag.id,
      environment: 'production',
      userId: actor,
      enabled: false
    });
    assert.equal((await provider.evaluate(def, { ...context, userId: actor })).enabled, true);
    assert.equal(
      (await provider.evaluate(def, { ...context, environment: 'production', userId: actor }))
        .enabled,
      false
    );

    // Canonical 0016 has independent account/flag foreign keys, not a composite
    // ownership constraint. Raw fixture insertion tests the provider's defense
    // against a malformed stored row; the repository remains strict.
    await getTestPool().query(
      `INSERT INTO feature_flag_overrides (account_id, flag_id, environment, account_id_override, user_id, enabled)
       VALUES ($1, $2, 'test', $3, $4, 'true'::jsonb)`,
      [accountB, flag.id, accountA, otherUser]
    );
    assert.equal((await provider.evaluate(def, { ...context, userId: otherUser })).enabled, false);
    assert.equal((await provider.evaluate(def, context)).enabled, false);
  }));
