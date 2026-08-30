import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { resolveWorkerReportServicePrincipal } from '../../../apps/worker/src/worker-report-identity.js';
import { getTestPool } from '../../db/db-admin.js';

const accountIds: string[] = [];
const tenantIds: string[] = [];
let principalCases: Readonly<Record<string, string>> | undefined;

async function insertAccount(label: string): Promise<string> {
  const pool = getTestPool();
  const tenantId = randomUUID();
  const accountId = randomUUID();
  tenantIds.push(tenantId);
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [tenantId, `worker-report-${label}-${tenantId.slice(0, 8)}`, `Worker report ${label}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [accountId, tenantId, `worker-report-${label}-${accountId.slice(0, 8)}`, label]
  );
  accountIds.push(accountId);
  return accountId;
}

async function insertUser(
  accountId: string,
  label: string,
  options: Readonly<{
    readonly principalKind?: 'human' | 'service';
    readonly interactiveLoginEnabled?: boolean;
    readonly isActive?: boolean;
  }> = {}
): Promise<string> {
  const pool = getTestPool();
  const userId = randomUUID();
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name,
       principal_kind, interactive_login_enabled, is_active
     ) VALUES ($1, $2, $3, $4, 'worker-report-test-hash', $5, $6, $7, $8)`,
    [
      userId,
      accountId,
      `worker-report-${label}-${userId}`,
      `worker-report-${label}-${userId}@example.test`,
      `Worker report ${label}`,
      options.principalKind ?? 'human',
      options.interactiveLoginEnabled ?? true,
      options.isActive ?? true
    ]
  );
  return userId;
}

async function mapReportPrincipal(
  accountId: string,
  userId: string,
  isActive = true
): Promise<void> {
  await getTestPool().query(
    `INSERT INTO account_service_principals (account_id, purpose, user_id, is_active)
     VALUES ($1, 'report-execution', $2, $3)`,
    [accountId, userId, isActive]
  );
}

async function insertReportExecution(
  client: PoolClient,
  accountId: string,
  userId: string
): Promise<unknown> {
  return client.query(
    `INSERT INTO report_executions (
       id, account_id, report_id, requested_by_user_id, status,
       filters, row_count, generated_at, expires_at, columns, rows
     ) VALUES ($1, $2, 'administrative-executive', $3, 'completed',
       '{}'::jsonb, 0, now(), now() + interval '1 day', '[]'::jsonb, '[]'::jsonb)`,
    [randomUUID(), accountId, userId]
  );
}

describe('worker report service-principal resolution', () => {
  beforeAll(async () => {
    const validAccountId = await insertAccount('valid');
    const validUserId = await insertUser(validAccountId, 'valid', {
      principalKind: 'service',
      interactiveLoginEnabled: false
    });
    await mapReportPrincipal(validAccountId, validUserId);

    const foreignAccountId = await insertAccount('foreign');
    const foreignUserId = await insertUser(foreignAccountId, 'foreign', {
      principalKind: 'service',
      interactiveLoginEnabled: false
    });
    await mapReportPrincipal(foreignAccountId, foreignUserId);

    const humanAccountId = await insertAccount('human');
    const humanUserId = await insertUser(humanAccountId, 'human');
    await mapReportPrincipal(humanAccountId, humanUserId);

    const inactiveAccountId = await insertAccount('inactive');
    const inactiveUserId = await insertUser(inactiveAccountId, 'inactive', {
      principalKind: 'service',
      interactiveLoginEnabled: false
    });
    await mapReportPrincipal(inactiveAccountId, inactiveUserId, false);

    const inactiveUserAccountId = await insertAccount('inactive-user');
    const inactiveUserPrincipalId = await insertUser(inactiveUserAccountId, 'inactive-user', {
      principalKind: 'service',
      interactiveLoginEnabled: false,
      isActive: false
    });
    await mapReportPrincipal(inactiveUserAccountId, inactiveUserPrincipalId);

    const unmappedAccountId = await insertAccount('unmapped');
    const unmappedUserId = await insertUser(unmappedAccountId, 'unmapped', {
      principalKind: 'service',
      interactiveLoginEnabled: false
    });

    principalCases = {
      validAccountId,
      validUserId,
      foreignAccountId,
      foreignUserId,
      humanAccountId,
      humanUserId,
      inactiveAccountId,
      inactiveMappingUserId: inactiveUserId,
      inactiveUserAccountId,
      inactiveUserPrincipalId,
      unmappedAccountId,
      unmappedUserId
    };
  });

  afterAll(async () => {
    await getTestPool().query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [accountIds]);
    await getTestPool().query('DELETE FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
  });

  it('returns the mapped non-interactive service actor for the current account', async () => {
    const cases = principalCases;
    if (!cases) throw new Error('worker report principal fixture was not initialized');
    await expect(
      resolveWorkerReportServicePrincipal(
        cases.validAccountId,
        cases.validUserId as never,
        getTestPool()
      )
    ).resolves.toBe(cases.validUserId);
  });

  it.each([
    ['foreign account', 'validAccountId', 'foreignUserId'],
    ['human principal', 'humanAccountId', 'humanUserId'],
    ['inactive mapping', 'inactiveAccountId', 'inactiveMappingUserId'],
    ['inactive user', 'inactiveUserAccountId', 'inactiveUserPrincipalId'],
    ['unmapped service principal', 'unmappedAccountId', 'unmappedUserId']
  ])('rejects %s before report persistence', async (_label, accountKey, userKey) => {
    const cases = principalCases;
    if (!cases) throw new Error('worker report principal fixture was not initialized');
    await expect(
      resolveWorkerReportServicePrincipal(
        cases[accountKey]!,
        cases[userKey]! as never,
        getTestPool()
      )
    ).rejects.toThrow(/not mapped as an active report service principal/);
  });

  it('rejects a service actor when its report mapping is revoked before persistence', async () => {
    const cases = principalCases;
    if (!cases) throw new Error('worker report principal fixture was not initialized');
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE account_service_principals
            SET is_active = false
          WHERE account_id = $1
            AND purpose = 'report-execution'
            AND user_id = $2`,
        [cases.validAccountId, cases.validUserId]
      );

      await expect(
        insertReportExecution(client, cases.validAccountId, cases.validUserId)
      ).rejects.toThrow(/active report service principal/i);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('rejects an inactive service actor at report persistence time', async () => {
    const cases = principalCases;
    if (!cases) throw new Error('worker report principal fixture was not initialized');
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE users
            SET is_active = false
          WHERE account_id = $1
            AND id = $2`,
        [cases.validAccountId, cases.validUserId]
      );

      await expect(
        insertReportExecution(client, cases.validAccountId, cases.validUserId)
      ).rejects.toThrow(/active report service principal/i);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('rejects an active report mapping attached to a human actor', async () => {
    const cases = principalCases;
    if (!cases) throw new Error('worker report principal fixture was not initialized');
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');

      await expect(
        insertReportExecution(client, cases.humanAccountId, cases.humanUserId)
      ).rejects.toThrow(/active report service principal/i);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});
