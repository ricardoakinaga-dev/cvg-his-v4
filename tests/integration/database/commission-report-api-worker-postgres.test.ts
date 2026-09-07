import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { it } from 'vitest';
import { Pool } from 'pg';
import {
  CommissionsService,
  DatabaseCommissionCalculationsReportSource
} from '../../../packages/modules/commissions/src/index.js';
import { ReportsService } from '../../../packages/modules/reports/src/index.js';
import { handleReportsRoutes } from '../../../apps/api/src/routes/reports-routes.js';
import { resolveScheduledReportRows } from '../../../apps/worker/src/runner.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

// Exercises actual handlers and the worker adapter, not a listening HTTP server.
it('API and scheduled commissions read committed projection facts across replicas', async () => {
  const writer = getTestPool();
  const reader = new Pool({ connectionString: TEST_DB_URL });
  const tenantId = randomUUID();
  const accountId = randomUUID() as never;
  const otherAccount = randomUUID();
  const user = { id: randomUUID() as never };
  const otherUser = randomUUID();
  const calculationIds = Array.from({ length: 4 }, () => randomUUID());
  try {
    await writer.query(
      "INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, 'Commission report tenant', 'active')",
      [tenantId, `commission-report-${tenantId}`]
    );
    await writer.query(
      "INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $3, $4, 'Commission account A'), ($2, $3, $5, 'Commission account B')",
      [
        accountId,
        otherAccount,
        tenantId,
        `commission-a-${accountId}`,
        `commission-b-${otherAccount}`
      ]
    );
    await writer.query(
      "INSERT INTO users (id, account_id, username, email, password_hash, full_name) VALUES ($1, $2, $3, $4, 'hash', 'Commission user A'), ($5, $6, $7, $8, 'hash', 'Commission user B')",
      [
        user.id,
        accountId,
        `commission-${user.id}`,
        `${user.id}@example.test`,
        otherUser,
        otherAccount,
        `commission-${otherUser}`,
        `${otherUser}@example.test`
      ]
    );
    const commissions = new CommissionsService();
    const reports = new ReportsService();
    const source = new DatabaseCommissionCalculationsReportSource(reader);
    const permissions: string[] = [];
    const auditActions: string[] = [];
    const handlers = {
      reports,
      commissions,
      commissionCalculations: source,
      requirePrincipal(_request: unknown, permission: string) {
        permissions.push(permission);
        return {
          user: { id: user.id, accountId },
          access: { permissionCodes: ['staff.read', 'billing.read'] }
        };
      },
      audit: {
        write(event: { action: string }) {
          auditActions.push(event.action);
        }
      }
    };
    assert.equal(commissions.listCalculations(accountId).length, 0);
    assert.deepEqual(await source.list(accountId), []);
    // Writer commits after the API dependencies and independent reader pool exist.
    await writer.query(
      `INSERT INTO commission_calculations
(id, account_id, calculation_number, period_start, period_end, status, total_base_amount, total_commission_amount, created_by_user_id)
VALUES ($5, $1, 'COM-VISIBLE', '2026-05-01', '2026-05-31', 'reviewed', 250.25, 25.03, $3),
       ($6, $2, 'COM-OTHER', '2026-05-01', '2026-05-31', 'reviewed', 999, 99, $4),
       ($7, $1, 'COM-OUTSIDE', '2026-06-01', '2026-06-30', 'reviewed', 999, 99, $3),
       ($8, $1, 'COM-DRAFT', '2026-05-01', '2026-05-31', 'draft', 999, 99, $3)`,
      [accountId, otherAccount, user.id, otherUser, ...calculationIds]
    );
    const filters = { status: 'reviewed', dateFrom: '2026-05-31', dateTo: '2026-05-31' };
    const call = async (path: string, body: unknown) => {
      let payload = '';
      const response = {
        statusCode: 200,
        setHeader() {},
        end(chunk: string) {
          payload += chunk;
        }
      };
      const request = {
        method: 'POST',
        url: path,
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from(JSON.stringify(body));
        }
      };
      await handleReportsRoutes(
        path,
        request as never,
        response as never,
        'commission-postgres',
        handlers as never
      );
      return { statusCode: response.statusCode, body: JSON.parse(payload) };
    };
    const execution = await call('/reports/executions', {
      reportId: 'commission-calculations',
      filters
    });
    assert.equal(execution.statusCode, 201);
    assert.deepEqual(execution.body.rows, [
      {
        number: 'COM-VISIBLE',
        period: '2026-05-01..2026-05-31',
        status: 'reviewed',
        totalBaseAmount: 250.25,
        totalCommissionAmount: 25.03,
        lineCount: 0
      }
    ]);
    const workerRows = await resolveScheduledReportRows(
      { accountId, reportId: 'commission-calculations', filters } as never,
      { commissions: new DatabaseCommissionCalculationsReportSource(reader) }
    );
    assert.deepEqual(execution.body.rows, workerRows);
    const workerExecution = await reports.execute(accountId, user.id, {
      reportId: 'commission-calculations',
      filters,
      rows: workerRows
    });
    const workerCsv = await reports.exportExecution(accountId, user.id, workerExecution.id, 'csv');
    const apiCsv = await call(`/reports/executions/${execution.body.id}/export`, {
      format: 'csv'
    });
    assert.equal(apiCsv.statusCode, 200);
    assert.equal(apiCsv.body.content, workerCsv.content);
    assert.match(apiCsv.body.content, /COM-VISIBLE/);
    assert.doesNotMatch(apiCsv.body.content, /COM-OTHER|COM-OUTSIDE|COM-DRAFT/);
    assert.equal(commissions.listCalculations(accountId).length, 0);
    assert.deepEqual(permissions, ['billing.read', 'staff.read', 'billing.read', 'staff.read']);
    assert.deepEqual(auditActions, ['execute_report', 'export_report']);
    return { rows: execution.body.rowCount, csvParity: true, staleReplicaMemoryRows: 0 };
  } finally {
    try {
      await writer.query('DELETE FROM commission_calculations WHERE account_id IN ($1, $2)', [
        accountId,
        otherAccount
      ]);
      await writer.query('DELETE FROM users WHERE account_id IN ($1, $2)', [
        accountId,
        otherAccount
      ]);
      await writer.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountId, otherAccount]);
      await writer.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
      const remaining = await writer.query(
        'SELECT count(*)::int AS count FROM tenants WHERE id = $1',
        [tenantId]
      );
      assert.equal(remaining.rows[0].count, 0);
    } finally {
      await reader.end();
    }
  }
});
