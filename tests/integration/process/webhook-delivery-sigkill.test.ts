import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const fixturePath = resolve(ROOT, 'apps/worker/test-fixtures/webhook-delivery-process.ts');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const apiRole = `webhook_process_api_${suffix}`;
const workerRole = `webhook_process_worker_${suffix}`;
const rolePassword = `webhook-process-${suffix}`;
const tenantId = randomUUID();
const accountId = randomUUID();
const webhookId = `webhook-process-${randomUUID()}`;
const deliveryId = `webhook-delivery-process-${randomUUID()}`;
const leaseMs = 1_500;

interface ProcessEvent {
  readonly event: string;
  readonly payload: Record<string, unknown>;
}

interface WorkerProcess {
  readonly child: ChildProcess;
  readonly output: () => string;
  waitFor(event: string, timeoutMs?: number): Promise<ProcessEvent>;
  kill(signal: NodeJS.Signals): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
  close(): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
}

interface WebhookReceiver {
  readonly url: string;
  snapshot(): {
    readonly requests: number;
    readonly effectiveAcceptances: number;
    readonly duplicates: number;
    readonly idempotencyKeys: readonly string[];
    readonly bodies: readonly string[];
  };
  close(): Promise<void>;
}

const activeProcesses = new Set<WorkerProcess>();

async function startWebhookReceiver(): Promise<WebhookReceiver> {
  const acceptedKeys = new Set<string>();
  const idempotencyKeys: string[] = [];
  const bodies: string[] = [];
  let requests = 0;
  let effectiveAcceptances = 0;
  let duplicates = 0;

  const server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on('data', (chunk: Buffer) => chunks.push(chunk));
    request.on('end', () => {
      const key = request.headers['idempotency-key'];
      const idempotencyKey = typeof key === 'string' ? key : '';
      const body = Buffer.concat(chunks).toString('utf8');
      requests += 1;
      idempotencyKeys.push(idempotencyKey);
      bodies.push(body);

      if (!idempotencyKey) {
        response.statusCode = 400;
        response.end('missing idempotency key');
        return;
      }

      if (acceptedKeys.has(idempotencyKey)) {
        duplicates += 1;
        response.statusCode = 200;
        response.setHeader('X-Idempotency-Replayed', 'true');
        response.end('replayed');
        return;
      }

      acceptedKeys.add(idempotencyKey);
      effectiveAcceptances += 1;
      response.statusCode = 204;
      response.end();
    });
  });

  await new Promise<void>((resolveServer, rejectServer) => {
    server.once('error', rejectServer);
    server.listen(0, '127.0.0.1', () => resolveServer());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('webhook receiver did not expose a TCP address');
  }

  return {
    url: `http://127.0.0.1:${address.port}/webhook`,
    snapshot: () => ({
      requests,
      effectiveAcceptances,
      duplicates,
      idempotencyKeys: [...idempotencyKeys],
      bodies: [...bodies]
    }),
    close: () => new Promise<void>((resolveClose, rejectClose) => {
      server.close((error) => (error ? rejectClose(error) : resolveClose()));
    })
  };
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function databaseUrlFor(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = rolePassword;
  return url.toString();
}

async function createLoginRole(pool: Pool, role: string): Promise<void> {
  const result = await pool.query<{ readonly sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
       $1::text,
       $2::text
     ) AS sql`,
    [role, rolePassword]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create role ${role}`);
  await pool.query(sql);
}

function startWorker(options: {
  readonly workerId: string;
  readonly receiverUrl: string;
  readonly waitForRelease: boolean;
  readonly waitBeforeComplete?: boolean;
}): WorkerProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', fixturePath], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrlFor(workerRole),
      WEBHOOK_PROCESS_ACCOUNT_ID: accountId,
      WEBHOOK_PROCESS_WORKER_ID: options.workerId,
      WEBHOOK_PROCESS_LEASE_MS: String(leaseMs),
      WEBHOOK_PROCESS_RECEIVER_URL: options.receiverUrl,
      WEBHOOK_PROCESS_WAIT_FOR_RELEASE: options.waitForRelease ? '1' : '0',
      WEBHOOK_PROCESS_WAIT_BEFORE_COMPLETE: options.waitBeforeComplete ? '1' : '0'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  const events: ProcessEvent[] = [];
  const waiters = new Map<
    string,
    Array<{ resolve: (event: ProcessEvent) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }>
  >();
  const lines = createInterface({ input: child.stdout! });
  lines.on('line', (line) => {
    const separator = line.indexOf(' ');
    if (separator <= 0) return;
    try {
      const event = { event: line.slice(0, separator), payload: JSON.parse(line.slice(separator + 1)) } as ProcessEvent;
      events.push(event);
      const pending = waiters.get(event.event) ?? [];
      waiters.delete(event.event);
      pending.forEach((waiter) => {
        clearTimeout(waiter.timer);
        waiter.resolve(event);
      });
    } catch {
      // Keep non-protocol child output available in the diagnostic buffer.
    }
  });

  let closeResult: { readonly code: number | null; readonly signal: NodeJS.Signals | null } | null = null;
  let resolveClose: ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void) | null = null;
  const closePromise = new Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>((resolveClosePromise) => {
    resolveClose = resolveClosePromise;
  });
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
    for (const [eventName, pending] of waiters) {
      pending.forEach((waiter) => {
        clearTimeout(waiter.timer);
        waiter.reject(new Error(`child closed before ${eventName}; events=${JSON.stringify(events)}; output=${output}`));
      });
    }
    waiters.clear();
  });

  const processHandle: WorkerProcess = {
    child,
    output: () => output,
    waitFor(event, timeoutMs = 10_000) {
      const existing = events.find((candidate) => candidate.event === event);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolveEvent, rejectEvent) => {
        const timer = setTimeout(() => {
          const pending = waiters.get(event) ?? [];
          waiters.set(event, pending.filter((waiter) => waiter.resolve !== resolveEvent));
          rejectEvent(new Error(`timed out waiting for ${event}; events=${JSON.stringify(events)}; output=${output}`));
        }, timeoutMs);
        waiters.set(event, [...(waiters.get(event) ?? []), { resolve: resolveEvent, reject: rejectEvent, timer }]);
      });
    },
    kill(signal) {
      if (closeResult) return Promise.resolve(closeResult);
      if (!child.kill(signal)) throw new Error(`failed to send ${signal} to webhook worker`);
      return closePromise;
    },
    close() {
      return closeResult ? Promise.resolve(closeResult) : closePromise;
    }
  };
  activeProcesses.add(processHandle);
  void processHandle.close().finally(() => activeProcesses.delete(processHandle));
  return processHandle;
}

async function waitForExpiredLease(): Promise<void> {
  const pool = getTestPool();
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ readonly status: string; readonly expired: boolean }>(
      `SELECT status, lease_expires_at <= clock_timestamp() AS expired
         FROM webhook_deliveries
        WHERE account_id = $1 AND id = $2`,
      [accountId, deliveryId]
    );
    if (result.rows[0]?.status === 'processing' && result.rows[0]?.expired) return;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error('webhook delivery lease did not expire after SIGKILL');
}

describe('webhook delivery independent-process SIGKILL/restart matrix', () => {
  const adminPool = getAdminPool();
  let receiver: WebhookReceiver;

  beforeAll(async () => {
    receiver = await startWebhookReceiver();
    await createLoginRole(adminPool, apiRole);
    await createLoginRole(adminPool, workerRole);
    await adminPool.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
    );
    const testPool = getTestPool();
    const client = await testPool.connect();
    try {
      await reconcileRuntimeRoles(client, { apiRole, workerRole });
    } finally {
      client.release();
    }

    await testPool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Webhook process tenant', 'active', now())`,
      [tenantId, `webhook-process-tenant-${suffix}`]
    );
    await testPool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Webhook process account', true)`,
      [accountId, tenantId, `webhook-process-account-${suffix}`]
    );
    await testPool.query(
      `INSERT INTO webhooks (id, account_id, url, events, is_active, created_at, updated_at)
       VALUES ($1, $2, 'https://example.test/webhook', '["webhook.test"]'::jsonb, true, now(), now())`,
      [webhookId, accountId]
    );
    await testPool.query(
      `INSERT INTO webhook_deliveries (
         id, account_id, webhook_id, event, payload, status, attempts, max_attempts, created_at
       ) VALUES ($1, $2, $3, 'webhook.test', $4::jsonb, 'pending', 0, 2, now())`,
      [deliveryId, accountId, webhookId, JSON.stringify({ accountId, deliveryId })]
    );
  }, 120_000);

  afterAll(async () => {
    await Promise.all([...activeProcesses].map((worker) => worker.kill('SIGKILL').catch(() => undefined)));
    await receiver?.close().catch(() => undefined);
    await getTestPool().query('DELETE FROM accounts WHERE id = $1', [accountId]).catch(() => undefined);
    await getTestPool().query(`REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO CURRENT_USER`).catch(() => undefined);
    await getTestPool().query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`).catch(() => undefined);
    await adminPool.query(`REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`).catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`).catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`).catch(() => undefined);
  }, 30_000);

  it('takes over after SIGKILL between provider acceptance and durable completion', async () => {
    const first = startWorker({
      workerId: `webhook-process-a-${suffix}`,
      receiverUrl: receiver.url,
      waitForRelease: false,
      waitBeforeComplete: true
    });
    const ready = await first.waitFor('WEBHOOK_READY');
    expect(ready.payload.databaseUser).toBe(workerRole);
    await first.waitFor('WEBHOOK_ATTEMPT');
    const firstAccepted = await first.waitFor('WEBHOOK_PROVIDER_ACCEPTED');
    expect(firstAccepted.payload.idempotencyKey).toBe(deliveryId);
    expect(receiver.snapshot()).toMatchObject({
      requests: 1,
      effectiveAcceptances: 1,
      duplicates: 0,
      idempotencyKeys: [deliveryId]
    });
    await first.waitFor('WEBHOOK_BEFORE_COMPLETE');

    const processing = await getTestPool().query(
      `SELECT status, attempts, lease_owner, lease_version
         FROM webhook_deliveries WHERE account_id = $1 AND id = $2`,
      [accountId, deliveryId]
    );
    expect(processing.rows).toMatchObject([
      { status: 'processing', attempts: 1, lease_owner: `webhook-process-a-${suffix}`, lease_version: '1' }
    ]);

    const killed = await first.kill('SIGKILL');
    expect(killed.signal).toBe('SIGKILL');
    await waitForExpiredLease();

    const second = startWorker({
      workerId: `webhook-process-b-${suffix}`,
      receiverUrl: receiver.url,
      waitForRelease: false
    });
    const secondReady = await second.waitFor('WEBHOOK_READY');
    expect(secondReady.payload.databaseUser).toBe(workerRole);
    const secondAccepted = await second.waitFor('WEBHOOK_PROVIDER_ACCEPTED');
    expect(secondAccepted.payload.idempotencyKey).toBe(firstAccepted.payload.idempotencyKey);
    const result = (await second.waitFor('WEBHOOK_RESULT')).payload.result as Record<string, number>;
    expect(result).toMatchObject({ claimed: 1, delivered: 1, retried: 0, failed: 0, leaseLost: 0 });
    await expect(second.close()).resolves.toEqual({ code: 0, signal: null });

    const delivered = await getTestPool().query(
      `SELECT status, attempts, lease_owner, lease_token, lease_version, dead_lettered_at
         FROM webhook_deliveries WHERE account_id = $1 AND id = $2`,
      [accountId, deliveryId]
    );
    expect(delivered.rows).toEqual([
      { status: 'delivered', attempts: 2, lease_owner: null, lease_token: null, lease_version: '2', dead_lettered_at: null }
    ]);
    expect(receiver.snapshot()).toMatchObject({
      requests: 2,
      effectiveAcceptances: 1,
      duplicates: 1,
      idempotencyKeys: [deliveryId, deliveryId]
    });
    expect(receiver.snapshot().bodies[1]).toBe(receiver.snapshot().bodies[0]);
  }, 60_000);
});
