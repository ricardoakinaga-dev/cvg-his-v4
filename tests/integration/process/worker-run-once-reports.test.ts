import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import { resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const runOncePath = resolve(ROOT, 'apps/worker/src/run-once.ts');
const tenantId = randomUUID();
const accountId = randomUUID();
const userId = randomUUID();
const scheduleId = `report-run-once-${randomUUID()}`;
const deliveryScheduleId = `report-run-once-delivery-${randomUUID()}`;
const failedDeliveryScheduleId = `report-run-once-failed-${randomUUID()}`;
const sigkillDeliveryScheduleId = `report-run-once-sigkill-${randomUUID()}`;
const leaseDeliveryScheduleId = `report-run-once-lease-${randomUUID()}`;

async function runOnce(
  overrides: Readonly<Record<string, string>>,
  onSpawn?: (child: ChildProcess) => void
): Promise<{
  readonly result: { readonly code: number | null; readonly signal: NodeJS.Signals | null };
  readonly output: string;
}> {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', runOncePath], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB_URL,
      WORKER_ACCOUNT_ID: accountId,
      WORKER_REPORTS_USER_ID: userId,
      OTEL_ENABLED: 'false',
      ...overrides
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  onSpawn?.(child);

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  const result = await new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClose) => {
    child.once('close', (code, signal) => resolveClose({ code, signal }));
  });
  return { result, output };
}

describe('worker run-once scheduled reports boundary', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Run once reports tenant', 'active', now())`,
      [tenantId, `run-once-reports-${tenantId.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Run once reports account', true)`,
      [accountId, tenantId, `run-once-reports-${accountId.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'run-once-test-hash', 'Run once reports operator')`,
      [userId, accountId, `run-once-${userId}`, `run-once-${userId}@example.test`]
    );
    await pool.query(
      `INSERT INTO report_schedules (
         id, account_id, report_id, name, frequency, format, filters, recipients,
         is_active, next_run_at, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, 'administrative-executive', 'Run once report', 'daily', 'csv',
         '{}'::jsonb, '[]'::jsonb, true, now() - interval '1 minute', $3, now(), now())`,
      [scheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report delivery', 'daily', 'csv',
         '{}'::jsonb, '["finance@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [deliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report failed delivery', 'daily', 'csv',
         '{}'::jsonb, '["retry@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [failedDeliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report SIGKILL', 'daily', 'csv',
         '{}'::jsonb, '["sigkill@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [sigkillDeliveryScheduleId, accountId, userId]
    );
    await pool.query(
      `INSERT INTO report_schedules (
       id, account_id, report_id, name, frequency, format, filters, recipients,
       is_active, next_run_at, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, 'administrative-executive', 'Run once report lease', 'daily', 'csv',
         '{}'::jsonb, '["lease@example.test"]'::jsonb, true, now() + interval '1 day', $3, now(), now())`,
      [leaseDeliveryScheduleId, accountId, userId]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  });

  it('executes a due report schedule before the one-shot worker exits', async () => {
    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-${process.pid}`,
      EMAIL_MOCK_MODE: 'true'
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    const persisted = await pool.query<{
      readonly executions: number;
      readonly last_execution_id: string | null;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM report_executions WHERE account_id = $1 AND report_id = 'administrative-executive') AS executions,
         last_execution_id
         FROM report_schedules
        WHERE account_id = $1 AND id = $2`,
      [accountId, scheduleId]
    );

    expect(persisted.rows).toEqual([{ executions: 1, last_execution_id: expect.any(String) }]);
  }, 30_000);

  it('delivers a scheduled report to a controlled local provider before exit', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [deliveryScheduleId, accountId]
    );
    let requestHeaders: IncomingHttpHeaders | undefined;
    let requestBody = '';
    const receiver = createServer((request, response) => {
      requestHeaders = request.headers;
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)));
      request.on('end', () => {
        requestBody = Buffer.concat(chunks).toString('utf8');
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
      });
    });
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report receiver did not expose a port');
    }

    const { result, output } = await runOnce({
      WORKER_INSTANCE_ID: `run-once-reports-delivery-${process.pid}`,
      RESEND_API_KEY: 're_worker_controlled_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    });
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(result, output).toEqual({ code: 0, signal: null });
    expect(requestHeaders?.['idempotency-key']).toMatch(/^rep_deliv_/);
    const body = JSON.parse(requestBody) as {
      readonly to: readonly string[];
      readonly attachments: readonly [{ readonly content: string }];
      readonly tags: readonly { readonly name: string; readonly value: string }[];
    };
    expect(body.to).toEqual(['finance@example.test']);
    expect(body.attachments[0]?.content).toMatch(/^[A-Za-z0-9+/]+=*$/);
    expect(body.tags).toContainEqual({
      name: 'cvg-delivery-id',
      value: requestHeaders?.['idempotency-key']
    });

    const persisted = await pool.query<{
      readonly status: string;
      readonly recipient: string;
      readonly execution_id: string;
      readonly export_id: string;
    }>(
      `SELECT status, recipient, execution_id, export_id
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, deliveryScheduleId]
    );
    expect(persisted.rows).toEqual([
      {
        status: 'sent',
        recipient: 'finance@example.test',
        execution_id: expect.any(String),
        export_id: expect.any(String)
      }
    ]);
  }, 30_000);

  it('reprocesses the same failed delivery from a second one-shot worker', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [failedDeliveryScheduleId, accountId]
    );
    let requestCount = 0;
    const idempotencyKeys: string[] = [];
    const receiver = createServer((request, response) => {
      requestCount += 1;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey === 'string') idempotencyKeys.push(idempotencyKey);
      request.resume();
      request.on('end', () => {
        response.writeHead(requestCount === 1 ? 503 : 200, { 'content-type': 'application/json' });
        response.end('{}');
      });
    });
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report retry receiver did not expose a port');
    }
    const providerEnvironment = {
      RESEND_API_KEY: 're_worker_controlled_retry_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    };

    const first = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-failure-a-${process.pid}`
    });
    expect(first.result, first.output).toEqual({ code: 0, signal: null });
    const failed = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, failedDeliveryScheduleId]
    );
    expect(failed.rows).toEqual([{ id: expect.any(String), status: 'failed' }]);

    const second = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-failure-b-${process.pid}`,
      WORKER_REPORTS_RETRY_FAILED: '1'
    });
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(second.result, second.output).toEqual({ code: 0, signal: null });
    expect(requestCount).toBe(2);
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    const retried = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, failedDeliveryScheduleId]
    );
    expect(retried.rows).toEqual([{ id: failed.rows[0]?.id, status: 'sent' }]);
  }, 30_000);

  it('recovers a delivery after the first worker is SIGKILLed after provider acceptance', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [sigkillDeliveryScheduleId, accountId]
    );
    let requestCount = 0;
    const idempotencyKeys: string[] = [];
    const receiver = createServer((request, response) => {
      requestCount += 1;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey === 'string') idempotencyKeys.push(idempotencyKey);
      request.resume();
      request.on('end', () => {
        if (requestCount === 1) {
          setTimeout(() => worker?.kill('SIGKILL'), 25);
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{}');
      });
    });
    let worker: ChildProcess | undefined;
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report SIGKILL receiver did not expose a port');
    }
    const providerEnvironment = {
      RESEND_API_KEY: 're_worker_controlled_sigkill_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    };

    const first = await runOnce(
      {
        ...providerEnvironment,
        WORKER_INSTANCE_ID: `run-once-reports-sigkill-a-${process.pid}`
      },
      (child) => {
        worker = child;
      }
    );
    expect(first.result, first.output).toEqual({ code: null, signal: 'SIGKILL' });
    const failed = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, sigkillDeliveryScheduleId]
    );
    expect(failed.rows).toEqual([{ id: expect.any(String), status: 'failed' }]);

    const second = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-sigkill-b-${process.pid}`,
      WORKER_REPORTS_RETRY_FAILED: '1'
    });
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(second.result, second.output).toEqual({ code: 0, signal: null });
    expect(requestCount).toBe(2);
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    const retried = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, sigkillDeliveryScheduleId]
    );
    expect(retried.rows).toEqual([{ id: failed.rows[0]?.id, status: 'sent' }]);
  }, 30_000);

  it('allows only one of two concurrent retry workers to claim a delivery', async () => {
    await pool.query(
      `UPDATE report_schedules
          SET next_run_at = now() - interval '1 minute'
        WHERE id = $1 AND account_id = $2`,
      [leaseDeliveryScheduleId, accountId]
    );
    let requestCount = 0;
    const idempotencyKeys: string[] = [];
    const receiver = createServer((request, response) => {
      requestCount += 1;
      const idempotencyKey = request.headers['idempotency-key'];
      if (typeof idempotencyKey === 'string') idempotencyKeys.push(idempotencyKey);
      request.resume();
      request.on('end', () => {
        if (requestCount === 1) {
          response.writeHead(503, { 'content-type': 'application/json' });
          response.end('{}');
          return;
        }
        response.writeHead(200, { 'content-type': 'application/json' });
        setTimeout(() => response.end('{}'), 200);
      });
    });
    await new Promise<void>((resolveListen, reject) => {
      receiver.once('error', reject);
      receiver.listen(0, '127.0.0.1', () => resolveListen());
    });
    const address = receiver.address();
    if (!address || typeof address === 'string') {
      await new Promise<void>((resolveClose) => receiver.close(() => resolveClose()));
      throw new Error('controlled report lease receiver did not expose a port');
    }
    const providerEnvironment = {
      RESEND_API_KEY: 're_worker_controlled_lease_test_key',
      EMAIL_FROM: 'reports@example.test',
      REPORT_EMAIL_ENDPOINT: `http://127.0.0.1:${address.port}/report-email`,
      EMAIL_MOCK_MODE: 'false'
    };

    const first = await runOnce({
      ...providerEnvironment,
      WORKER_INSTANCE_ID: `run-once-reports-lease-seed-${process.pid}`
    });
    expect(first.result, first.output).toEqual({ code: 0, signal: null });
    const failed = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, leaseDeliveryScheduleId]
    );
    expect(failed.rows).toEqual([{ id: expect.any(String), status: 'failed' }]);

    const [retryA, retryB] = await Promise.all([
      runOnce({
        ...providerEnvironment,
        WORKER_INSTANCE_ID: `run-once-reports-lease-a-${process.pid}`,
        WORKER_REPORTS_RETRY_FAILED: '1'
      }),
      runOnce({
        ...providerEnvironment,
        WORKER_INSTANCE_ID: `run-once-reports-lease-b-${process.pid}`,
        WORKER_REPORTS_RETRY_FAILED: '1'
      })
    ]);
    await new Promise<void>((resolveClose, reject) => {
      receiver.close((error) => (error ? reject(error) : resolveClose()));
    });

    expect(retryA.result, retryA.output).toEqual({ code: 0, signal: null });
    expect(retryB.result, retryB.output).toEqual({ code: 0, signal: null });
    expect(requestCount).toBe(2);
    expect(idempotencyKeys).toHaveLength(2);
    expect(idempotencyKeys[1]).toBe(idempotencyKeys[0]);
    const retried = await pool.query<{ readonly id: string; readonly status: string }>(
      `SELECT id, status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [accountId, leaseDeliveryScheduleId]
    );
    expect(retried.rows).toEqual([{ id: failed.rows[0]?.id, status: 'sent' }]);
  }, 30_000);
});
