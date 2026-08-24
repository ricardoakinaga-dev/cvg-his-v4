import { randomUUID } from 'node:crypto';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import {
  DatabaseReportRepository,
  ReportsService
} from '../../../packages/modules/reports/src/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const FOREIGN_ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;
const FOREIGN_USER_ID = randomUUID() as UserId;

describe('reports delivery persistence on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(
    accountId: AccountId,
    userId: UserId,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const correlationId = `reports-delivery-${randomUUID()}`;
    return runWithTenantContext({ tenantId: TENANT_ID, accountId, correlationId }, () =>
      runInTenantTransactionContext(
        getPool(),
        { accountId, actorUserId: userId, correlationId },
        operation
      )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Reports delivery tenant', 'active', now())`,
      [TENANT_ID, `reports-delivery-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Reports delivery account', true),
              ($4, $2, $5, 'Foreign reports delivery account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `reports-delivery-${ACCOUNT_ID.slice(0, 12)}`,
        FOREIGN_ACCOUNT_ID,
        `reports-delivery-f-${FOREIGN_ACCOUNT_ID.slice(0, 10)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Reports delivery operator'),
              ($5, $6, $7, $8, 'test-hash', 'Foreign reports delivery operator')`,
      [
        USER_ID,
        ACCOUNT_ID,
        `reports-delivery-${USER_ID}`,
        `reports-delivery-${USER_ID}@example.test`,
        FOREIGN_USER_ID,
        FOREIGN_ACCOUNT_ID,
        `reports-delivery-${FOREIGN_USER_ID}`,
        `reports-delivery-${FOREIGN_USER_ID}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('persists execution to export to failed delivery and retries the same row', async () => {
    let shouldFail = true;
    const calls: Array<{ deliveryId: string; idempotencyKey: string; exportId: string }> = [];
    const repository = new DatabaseReportRepository();
    const provider = {
      deliver: async (input: {
        readonly deliveryId: string;
        readonly idempotencyKey: string;
        readonly exported: { readonly id: string };
      }) => {
        calls.push({
          deliveryId: input.deliveryId,
          idempotencyKey: input.idempotencyKey,
          exportId: input.exported.id
        });
        if (shouldFail) throw new Error('transport unavailable');
      }
    };
    const service = new ReportsService({ repository, deliveryProvider: provider });

    const schedule = await command(ACCOUNT_ID, USER_ID, () =>
      service.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Persisted delivery retry',
        frequency: 'daily',
        format: 'csv',
        recipients: ['financeiro@cvg.local']
      })
    );
    const claimed = await command(ACCOUNT_ID, USER_ID, () =>
      service.claimDueSchedules(ACCOUNT_ID, schedule.nextRunAt, 'reports-worker-a')
    );
    expect(claimed.map((item) => item.id)).toEqual([schedule.id]);

    const competingService = new ReportsService({ repository });
    await command(ACCOUNT_ID, USER_ID, () => competingService.hydrateFromDatabase(ACCOUNT_ID));
    const competingClaim = await command(ACCOUNT_ID, USER_ID, () =>
      competingService.claimDueSchedules(ACCOUNT_ID, schedule.nextRunAt, 'reports-worker-b')
    );
    expect(competingClaim).toEqual([]);

    const foreignSchedule = await command(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, () =>
      new ReportsService({ repository }).createSchedule(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, {
        reportId: 'administrative-executive',
        name: 'Foreign schedule for FK isolation',
        frequency: 'daily',
        format: 'csv'
      })
    );
    const execution = await command(ACCOUNT_ID, USER_ID, () =>
      service.execute(ACCOUNT_ID, USER_ID, {
        reportId: schedule.reportId,
        rows: [{ domain: 'financial', metric: 'Receita', value: 100, status: 'tracked' }]
      })
    );
    const exported = await command(ACCOUNT_ID, USER_ID, () =>
      service.exportExecution(ACCOUNT_ID, USER_ID, execution.id, 'csv')
    );
    const firstAttempt = await command(ACCOUNT_ID, USER_ID, () =>
      service.deliverExport(ACCOUNT_ID, schedule.id, execution.id, exported, schedule.recipients)
    );
    const failedDelivery = firstAttempt.deliveries[0];

    expect(failedDelivery).toBeDefined();
    expect(failedDelivery?.status).toBe('failed');
    expect(calls).toHaveLength(1);

    const persistedAfterFailure = await pool.query(
      `SELECT d.id, d.status, d.execution_id, d.export_id, e.id AS persisted_execution_id,
              x.id AS persisted_export_id
         FROM report_schedule_deliveries d
         JOIN report_executions e ON e.id = d.execution_id
         JOIN report_exports x ON x.id = d.export_id
        WHERE d.account_id = $1 AND d.schedule_id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    expect(persistedAfterFailure.rows).toHaveLength(1);
    expect(persistedAfterFailure.rows[0]).toMatchObject({
      id: failedDelivery?.id,
      status: 'failed',
      execution_id: execution.id,
      export_id: exported.id,
      persisted_execution_id: execution.id,
      persisted_export_id: exported.id
    });

    const rehydrated = new ReportsService({ repository, deliveryProvider: provider });
    await command(ACCOUNT_ID, USER_ID, () => rehydrated.hydrateFromDatabase(ACCOUNT_ID));
    shouldFail = false;
    const retried = await command(ACCOUNT_ID, USER_ID, () =>
      rehydrated.retryScheduleDelivery(ACCOUNT_ID, USER_ID, schedule.id, failedDelivery!.id)
    );

    expect(retried.id).toBe(failedDelivery?.id);
    expect(retried.status).toBe('sent');
    expect(retried.exportId).toBe(exported.id);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual(calls[0]);

    const persistedAfterRetry = await pool.query(
      `SELECT COUNT(*)::int AS count,
              MAX(status) AS status,
              MAX(execution_id) AS execution_id,
              MAX(export_id) AS export_id,
              (SELECT COUNT(*)::int FROM report_exports WHERE account_id = $1 AND execution_id = $2) AS export_count
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $3`,
      [ACCOUNT_ID, execution.id, schedule.id]
    );
    expect(persistedAfterRetry.rows[0]).toEqual({
      count: 1,
      status: 'sent',
      execution_id: execution.id,
      export_id: exported.id,
      export_count: 1
    });

    await expect(
      pool.query(
        `INSERT INTO report_schedule_deliveries (
           id, account_id, schedule_id, execution_id, export_id, recipient, status, format,
           delivered_at, error, created_at
         ) VALUES ($1, $2, $3, NULL, NULL, 'cross-tenant@example.test', 'failed', 'csv', now(), 'invalid', now())`,
        [randomUUID(), ACCOUNT_ID, foreignSchedule.id]
      )
    ).rejects.toThrow(/report_deliveries_account_schedule_fk|foreign key/i);

    await expect(
      command(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, () =>
        rehydrated.retryScheduleDelivery(
          FOREIGN_ACCOUNT_ID,
          FOREIGN_USER_ID,
          schedule.id,
          failedDelivery!.id
        )
      )
    ).rejects.toThrow(/not found/i);
    const foreignDeliveries = await command(FOREIGN_ACCOUNT_ID, FOREIGN_USER_ID, () =>
      repository.findDeliveries(FOREIGN_ACCOUNT_ID)
    );
    expect(foreignDeliveries).toHaveLength(0);
  });

  it('claims failed deliveries once and fences an expired worker lease', async () => {
    let shouldFail = true;
    const calls: string[] = [];
    const repository = new DatabaseReportRepository();
    const provider = {
      deliver: async (input: { readonly deliveryId: string }) => {
        calls.push(input.deliveryId);
        if (shouldFail) throw new Error('controlled retry failure');
      }
    };
    const service = new ReportsService({ repository, deliveryProvider: provider });
    const schedule = await command(ACCOUNT_ID, USER_ID, () =>
      service.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Concurrent delivery lease',
        frequency: 'daily',
        format: 'csv',
        recipients: ['lease@cvg.local']
      })
    );
    const due = await command(ACCOUNT_ID, USER_ID, () =>
      service.claimDueSchedules(ACCOUNT_ID, schedule.nextRunAt, 'reports-lease-seed')
    );
    expect(due).toHaveLength(1);
    const execution = await command(ACCOUNT_ID, USER_ID, () =>
      service.execute(ACCOUNT_ID, USER_ID, {
        reportId: schedule.reportId,
        rows: [{ domain: 'reports', metric: 'Lease', value: 1, status: 'tracked' }]
      })
    );
    const exported = await command(ACCOUNT_ID, USER_ID, () =>
      service.exportExecution(ACCOUNT_ID, USER_ID, execution.id, 'csv')
    );
    const firstAttempt = await command(ACCOUNT_ID, USER_ID, () =>
      service.deliverExport(ACCOUNT_ID, schedule.id, execution.id, exported, schedule.recipients)
    );
    const failedDelivery = firstAttempt.deliveries[0];
    expect(failedDelivery?.status).toBe('failed');
    if (!failedDelivery) throw new Error('failed delivery fixture was not created');

    const workerA = new ReportsService({ repository, deliveryProvider: provider });
    const workerB = new ReportsService({ repository, deliveryProvider: provider });
    await command(ACCOUNT_ID, USER_ID, () => workerA.hydrateFromDatabase(ACCOUNT_ID));
    await command(ACCOUNT_ID, USER_ID, () => workerB.hydrateFromDatabase(ACCOUNT_ID));
    const claimAsOf = new Date().toISOString();
    const [claimsA, claimsB] = await Promise.all([
      command(ACCOUNT_ID, USER_ID, () =>
        workerA.claimFailedScheduleDeliveries(ACCOUNT_ID, 'reports-lease-a', claimAsOf, 1, 60_000)
      ),
      command(ACCOUNT_ID, USER_ID, () =>
        workerB.claimFailedScheduleDeliveries(ACCOUNT_ID, 'reports-lease-b', claimAsOf, 1, 60_000)
      )
    ]);
    expect([claimsA.length, claimsB.length].sort()).toEqual([0, 1]);
    const firstClaim = claimsA[0] ?? claimsB[0];
    expect(firstClaim?.delivery.id).toBe(failedDelivery.id);
    expect(firstClaim?.claimToken).toContain(failedDelivery.id);

    await pool.query(
      `UPDATE report_schedule_deliveries
          SET claim_until = now() - interval '1 second'
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, failedDelivery.id]
    );
    const takeover = await command(ACCOUNT_ID, USER_ID, () =>
      workerB.claimFailedScheduleDeliveries(
        ACCOUNT_ID,
        'reports-lease-takeover',
        new Date().toISOString(),
        1,
        60_000
      )
    );
    expect(takeover).toHaveLength(1);
    expect(takeover[0]?.claimToken).not.toBe(firstClaim?.claimToken);

    const staleWrite = await command(ACCOUNT_ID, USER_ID, () =>
      repository.saveClaimedDelivery(failedDelivery, firstClaim!.claimToken)
    );
    expect(staleWrite).toBe(false);

    shouldFail = false;
    const retried = await command(ACCOUNT_ID, USER_ID, () =>
      workerB.retryScheduleDelivery(
        ACCOUNT_ID,
        USER_ID,
        schedule.id,
        failedDelivery.id,
        takeover[0]!.claimToken
      )
    );
    expect(retried.status).toBe('sent');
    expect(calls).toEqual([failedDelivery.id, failedDelivery.id]);
  });
});
