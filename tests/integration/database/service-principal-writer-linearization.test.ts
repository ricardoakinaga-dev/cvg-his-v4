import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_IS_EPHEMERAL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

type MappingWriterTarget =
  | 'service mapping update'
  | 'service mapping insert'
  | 'service mapping delete';

async function createFixture(label: string) {
  const pool = getTestPool();
  const tenantId = TENANT_ID;
  const accountId = randomUUID();
  const humanUserId = randomUUID();
  const serviceUserId = randomUUID();
  const suffix = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [accountId, tenantId, `writer-${suffix}`, `Writer lock ${label}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Writer human')`,
    [humanUserId, accountId, `writer-human-${suffix}`, `writer-human-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name,
       principal_kind, interactive_login_enabled
     ) VALUES ($1, $2, $3, $4, 'hash', 'Writer service', 'service', false)`,
    [serviceUserId, accountId, `writer-service-${suffix}`, `writer-service-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO account_service_principals (account_id, purpose, user_id)
     VALUES ($1, 'pix-settlement', $2)`,
    [accountId, serviceUserId]
  );

  return { accountId, humanUserId, serviceUserId };
}

async function waitForAdvisoryBlock(client: PoolClient, accountId: string): Promise<boolean> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await client.query<{ readonly waiting: number }>(
      `SELECT COUNT(*)::int AS waiting
         FROM pg_locks
        WHERE locktype = 'advisory'
          AND granted = false
          AND classid = ((hashtextextended($1, 0) >> 32) & 4294967295)::oid
          AND objid = (hashtextextended($1, 0) & 4294967295)::oid`,
      [accountId]
    );
    if ((result.rows[0]?.waiting ?? 0) > 0) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
}

async function beginAccountLock(client: PoolClient, accountId: string): Promise<void> {
  await client.query('BEGIN');
  await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [accountId]);
}

describe.skipIf(!TEST_DB_IS_EPHEMERAL)('service-principal writer linearization', () => {
  beforeEach(async () => {
    await getTestPool().query('TRUNCATE TABLE accounts CASCADE');
  });

  it.each([
    [
      'service mapping update' as const,
      'account_service_principals',
      'is_active',
      'serviceMappingUpdate'
    ],
    [
      'service mapping insert' as const,
      'account_service_principals',
      'is_active',
      'serviceMappingInsert'
    ],
    [
      'service mapping delete' as const,
      'account_service_principals',
      'is_active',
      'serviceMappingDelete'
    ]
  ])(
    'blocks a direct %s writer while a settlement-style transaction owns the account lock',
    async (target: MappingWriterTarget, table: string, column: string, suffix: string) => {
      const fixture = await createFixture(suffix);
      const pool = getTestPool();
      const holder = await pool.connect();
      const writer = await pool.connect();
      let writePromise: Promise<unknown> | undefined;

      try {
        if (target === 'service mapping insert') {
          await pool.query(
            `DELETE FROM account_service_principals
              WHERE account_id = $1 AND purpose = 'pix-settlement'`,
            [fixture.accountId]
          );
        }
        await beginAccountLock(holder, fixture.accountId);
        const writeSql =
          target === 'service mapping update'
            ? `UPDATE ${table} SET ${column} = false
               WHERE account_id = $1 AND purpose = 'pix-settlement'`
            : target === 'service mapping insert'
              ? `INSERT INTO ${table} (account_id, purpose, user_id)
                 VALUES ($1, 'pix-settlement', $2)`
              : target === 'service mapping delete'
                ? `DELETE FROM ${table}
                   WHERE account_id = $1 AND purpose = 'pix-settlement'`
                : (() => {
                    throw new Error(`Unexpected mapping writer target: ${target}`);
                  })();
        const writeParams =
          target === 'service mapping update' || target === 'service mapping delete'
            ? [fixture.accountId]
            : target === 'service mapping insert'
              ? [fixture.accountId, fixture.serviceUserId]
              : (() => {
                  throw new Error(`Unexpected mapping writer target: ${target}`);
                })();

        writePromise = writer.query(writeSql, writeParams);
        expect(await waitForAdvisoryBlock(holder, fixture.accountId)).toBe(true);
        await holder.query('COMMIT');
        await writePromise;

        const mapping = await pool.query<{ readonly is_active: boolean }>(
          `SELECT is_active
             FROM account_service_principals
            WHERE account_id = $1 AND purpose = 'pix-settlement'`,
          [fixture.accountId]
        );
        if (target === 'service mapping delete') {
          expect(mapping.rows).toHaveLength(0);
        } else if (target === 'service mapping insert') {
          expect(mapping.rows[0]?.is_active).toBe(true);
        } else if (target === 'service mapping update') {
          expect(mapping.rows[0]?.is_active).toBe(false);
        }
      } finally {
        await holder.query('ROLLBACK').catch(() => undefined);
        await writePromise?.catch(() => undefined);
        writer.release();
        holder.release();
      }
    }
  );

  it.each(['account_id', 'principal_kind', 'interactive_login_enabled', 'is_active'] as const)(
    'blocks a direct users.%s identity writer while a settlement-style transaction owns the account lock',
    async (column) => {
      const fixture = await createFixture(`user-${column}`);
      const pool = getTestPool();
      const holder = await pool.connect();
      const writer = await pool.connect();
      let writePromise: Promise<unknown> | undefined;

      try {
        await beginAccountLock(holder, fixture.accountId);
        const writeSql = {
          account_id: 'UPDATE users SET account_id = $1 WHERE id = $2 AND account_id = $1',
          principal_kind:
            'UPDATE users SET principal_kind = principal_kind WHERE id = $1 AND account_id = $2',
          interactive_login_enabled:
            'UPDATE users SET interactive_login_enabled = false WHERE id = $1 AND account_id = $2',
          is_active: 'UPDATE users SET is_active = false WHERE id = $1 AND account_id = $2'
        }[column];
        const writeParams =
          column === 'account_id'
            ? [fixture.accountId, fixture.humanUserId]
            : [fixture.humanUserId, fixture.accountId];

        writePromise = writer.query(writeSql, writeParams);
        expect(await waitForAdvisoryBlock(holder, fixture.accountId)).toBe(true);
        await holder.query('COMMIT');
        await writePromise;
      } finally {
        await holder.query('ROLLBACK').catch(() => undefined);
        await writePromise?.catch(() => undefined);
        writer.release();
        holder.release();
      }
    }
  );

  it('does not serialize a writer for a different account', async () => {
    const first = await createFixture('first');
    const second = await createFixture('second');
    const pool = getTestPool();
    const holder = await pool.connect();
    const writer = await pool.connect();

    try {
      await beginAccountLock(holder, first.accountId);
      await writer.query(
        `UPDATE account_service_principals
            SET is_active = false
          WHERE account_id = $1 AND purpose = 'pix-settlement'`,
        [second.accountId]
      );
      const result = await pool.query<{ readonly is_active: boolean }>(
        `SELECT is_active
           FROM account_service_principals
          WHERE account_id = $1 AND purpose = 'pix-settlement'`,
        [second.accountId]
      );
      expect(result.rows[0]?.is_active).toBe(false);
    } finally {
      await holder.query('ROLLBACK').catch(() => undefined);
      writer.release();
      holder.release();
    }
  });

  it('allows independent direct writers for different accounts', async () => {
    const first = await createFixture('independent-first');
    const second = await createFixture('independent-second');
    const pool = getTestPool();
    const firstWriter = await pool.connect();
    const secondWriter = await pool.connect();

    try {
      await firstWriter.query('BEGIN');
      await firstWriter.query(
        `UPDATE account_service_principals
            SET is_active = false
          WHERE account_id = $1 AND purpose = 'pix-settlement'`,
        [first.accountId]
      );
      await expect(
        secondWriter.query(
          `UPDATE account_service_principals
              SET is_active = false
            WHERE account_id = $1 AND purpose = 'pix-settlement'`,
          [second.accountId]
        )
      ).resolves.toMatchObject({ rowCount: 1 });
    } finally {
      await firstWriter.query('ROLLBACK').catch(() => undefined);
      await secondWriter.query('ROLLBACK').catch(() => undefined);
      firstWriter.release();
      secondWriter.release();
    }
  });

  it('makes a settlement-style lock wait behind a direct writer and rolls back cleanly', async () => {
    const fixture = await createFixture('writer-first');
    const pool = getTestPool();
    const writer = await pool.connect();
    const holder = await pool.connect();
    const observer = await pool.connect();
    let holderLockPromise: Promise<void> | undefined;

    try {
      await writer.query('BEGIN');
      await writer.query("SELECT set_config('app.current_account_id', $1, true)", [
        fixture.accountId
      ]);
      await writer.query(
        `UPDATE account_service_principals
            SET is_active = false
          WHERE account_id = $1 AND purpose = 'pix-settlement'`,
        [fixture.accountId]
      );

      holderLockPromise = beginAccountLock(holder, fixture.accountId);
      expect(await waitForAdvisoryBlock(observer, fixture.accountId)).toBe(true);

      await writer.query('ROLLBACK');
      await holderLockPromise;

      const result = await pool.query<{ readonly is_active: boolean }>(
        `SELECT is_active
           FROM account_service_principals
          WHERE account_id = $1 AND purpose = 'pix-settlement'`,
        [fixture.accountId]
      );
      expect(result.rows[0]?.is_active).toBe(true);
      await holder.query('ROLLBACK');
    } finally {
      await writer.query('ROLLBACK').catch(() => undefined);
      await holder.query('ROLLBACK').catch(() => undefined);
      await holderLockPromise?.catch(() => undefined);
      observer.release();
      holder.release();
      writer.release();
    }
  });

  it('fails cross-account identity lock acquisition fast instead of deadlocking writers', async () => {
    const first = await createFixture('cross-account-first');
    const second = await createFixture('cross-account-second');
    const pool = getTestPool();
    const firstWriter = await pool.connect();
    const secondWriter = await pool.connect();
    const startedAt = Date.now();

    try {
      await firstWriter.query('BEGIN');
      await secondWriter.query('BEGIN');

      const outcomes = await Promise.allSettled([
        firstWriter.query(
          `UPDATE users
              SET account_id = $1
            WHERE id = $2 AND account_id = $3`,
          [second.accountId, first.humanUserId, first.accountId]
        ),
        secondWriter.query(
          `UPDATE users
              SET account_id = $1
            WHERE id = $2 AND account_id = $3`,
          [first.accountId, second.humanUserId, second.accountId]
        )
      ]);

      expect(Date.now() - startedAt).toBeLessThan(2_000);
      const rejected = outcomes.filter(
        (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected'
      );
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({ code: '40001' });
      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    } finally {
      await firstWriter.query('ROLLBACK').catch(() => undefined);
      await secondWriter.query('ROLLBACK').catch(() => undefined);
      firstWriter.release();
      secondWriter.release();
    }
  });

  it('replays the migration without changing the installed trigger contract', async () => {
    const migration = readFileSync(
      resolve(
        import.meta.dirname,
        '../../../packages/db/migrations/0155_service_principal_writer_linearization.sql'
      ),
      'utf8'
    );
    const pool = getTestPool();

    await pool.query(migration);

    const result = await pool.query<{
      readonly trigger_name: string;
      readonly function_security_definer: boolean;
      readonly function_search_path: readonly string[] | null;
    }>(
      `SELECT trigger_row.tgname AS trigger_name,
              function_row.prosecdef AS function_security_definer,
              function_row.proconfig AS function_search_path
         FROM pg_trigger AS trigger_row
         JOIN pg_class AS relation_row ON relation_row.oid = trigger_row.tgrelid
         JOIN pg_proc AS function_row ON function_row.oid = trigger_row.tgfoid
        WHERE NOT trigger_row.tgisinternal
          AND relation_row.relname IN ('users', 'account_service_principals')
          AND trigger_row.tgname IN (
            'users_authorization_write_lock',
            'account_service_principals_authorization_write_lock'
          )
        ORDER BY trigger_row.tgname`
    );

    expect(result.rows).toEqual([
      {
        trigger_name: 'account_service_principals_authorization_write_lock',
        function_security_definer: true,
        function_search_path: ['search_path=pg_catalog, pg_temp']
      },
      {
        trigger_name: 'users_authorization_write_lock',
        function_security_definer: true,
        function_search_path: ['search_path=pg_catalog, pg_temp']
      }
    ]);
  });

  it('does not resolve advisory helpers through a hostile temporary schema', async () => {
    const fixture = await createFixture('temporary-schema-shadow');
    const writer = await getTestPool().connect();

    try {
      await writer.query(`
        CREATE FUNCTION pg_temp.hashtextextended(text, bigint)
        RETURNS bigint
        LANGUAGE plpgsql
        AS $function$
        BEGIN
          RAISE EXCEPTION 'temporary hash helper was resolved';
        END;
        $function$
      `);
      await writer.query(`
        CREATE FUNCTION pg_temp.pg_try_advisory_xact_lock(bigint)
        RETURNS boolean
        LANGUAGE plpgsql
        AS $function$
        BEGIN
          RAISE EXCEPTION 'temporary try-lock helper was resolved';
        END;
        $function$
      `);
      await writer.query(`
        CREATE FUNCTION pg_temp.pg_advisory_xact_lock(bigint)
        RETURNS void
        LANGUAGE plpgsql
        AS $function$
        BEGIN
          RAISE EXCEPTION 'temporary lock helper was resolved';
        END;
        $function$
      `);

      await expect(
        writer.query(
          `UPDATE account_service_principals
              SET is_active = false
            WHERE account_id = $1 AND purpose = 'pix-settlement'`,
          [fixture.accountId]
        )
      ).resolves.toMatchObject({ rowCount: 1 });
    } finally {
      await writer.query('ROLLBACK').catch(() => undefined);
      writer.release();
    }
  });
});
