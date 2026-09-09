import { createInterface } from 'node:readline';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseWorkflowTaskRepository,
  WorkflowTaskService
} from '@cvg-his-v2/module-workflows';
import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const FIXTURE = resolve(ROOT, 'apps/worker/test-fixtures/workflow-task-process.ts');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const rolePassword = `workflow-process-${suffix}`;
const apiRole = `workflow_process_api_${suffix}`;
const workerRole = `workflow_process_worker_${suffix}`;
const tenantId = randomUUID();
const accountId = randomUUID();
const userId = randomUUID();
const leaseMs = 1_200;

interface ProcessEvent {
  readonly event: string;
  readonly payload: Record<string, unknown>;
}

interface WorkflowProcess {
  readonly child: ChildProcess;
  readonly output: () => string;
  waitFor(event: string, timeoutMs?: number): Promise<ProcessEvent>;
  kill(signal: NodeJS.Signals): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
  resume(): void;
  close(): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
}

const activeProcesses = new Set<WorkflowProcess>();

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function workerDatabaseUrl(): string {
  const url = new URL(TEST_DB_URL);
  url.username = workerRole;
  url.password = rolePassword;
  return url.toString();
}

function startWorkflowProcess(
  taskId: string,
  workerId: string,
  mode: 'claim-and-wait' | 'claim-and-complete'
): WorkflowProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', FIXTURE], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DATABASE_URL: workerDatabaseUrl(),
      WORKFLOW_PROCESS_ACCOUNT_ID: accountId,
      WORKFLOW_PROCESS_TASK_ID: taskId,
      WORKFLOW_PROCESS_WORKER_ID: workerId,
      WORKFLOW_PROCESS_MODE: mode,
      WORKFLOW_PROCESS_LEASE_MS: String(leaseMs)
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => { output += chunk; });
  child.stderr?.on('data', (chunk: string) => { output += chunk; });

  const events: ProcessEvent[] = [];
  const waiters = new Map<string, Array<{
    resolve: (event: ProcessEvent) => void;
    reject: (error: Error) => void;
    timer: NodeJS.Timeout;
  }>>();
  createInterface({ input: child.stdout! }).on('line', (line) => {
    const separator = line.indexOf(' ');
    if (separator <= 0) return;
    try {
      const event = {
        event: line.slice(0, separator),
        payload: JSON.parse(line.slice(separator + 1))
      } as ProcessEvent;
      events.push(event);
      const pending = waiters.get(event.event) ?? [];
      waiters.delete(event.event);
      pending.forEach((waiter) => {
        clearTimeout(waiter.timer);
        waiter.resolve(event);
      });
    } catch {
      // Keep malformed/non-protocol output available in diagnostics.
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

  const processHandle: WorkflowProcess = {
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
      if (!child.kill(signal)) throw new Error(`failed to send ${signal} to workflow process`);
      return closePromise;
    },
    resume() {
      if (!child.kill('SIGUSR2')) throw new Error('failed to resume workflow process');
    },
    close() {
      return closeResult ? Promise.resolve(closeResult) : closePromise;
    }
  };
  activeProcesses.add(processHandle);
  void processHandle.close().finally(() => activeProcesses.delete(processHandle));
  return processHandle;
}

async function createLoginRole(pool: Pool, role: string): Promise<void> {
  const result = await pool.query<{ readonly sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
       $1::text, $2::text
     ) AS sql`,
    [role, rolePassword]
  );
  await pool.query(result.rows[0]!.sql);
  await pool.query(`GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(role)}`);
}

async function createTask(key: string): Promise<string> {
  const service = new WorkflowTaskService({ repository: new DatabaseWorkflowTaskRepository(getTestPool()) });
  const task = await service.create(accountId as never, userId as never, {
    taskType: 'clinical.workflow.process-proof',
    title: 'Process proof task',
    executionMode: 'worker',
    dueAt: new Date(Date.now() - 1_000).toISOString(),
    idempotencyKey: key,
    maxAttempts: 3
  });
  return task.id;
}

async function waitForExpired(taskId: string): Promise<void> {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await getTestPool().query<{ readonly status: string; readonly expired: boolean }>(
      `SELECT status, lease_expires_at <= clock_timestamp() AS expired
         FROM clinical_workflow_tasks WHERE account_id = $1 AND id = $2`,
      [accountId, taskId]
    );
    if (result.rows[0]?.status === 'processing' && result.rows[0]?.expired) return;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error('workflow task lease did not expire');
}

describe('workflow task independent-process crash and fencing proof', () => {
  const adminPool = getAdminPool();

  beforeAll(async () => {
    await createLoginRole(adminPool, apiRole);
    await createLoginRole(adminPool, workerRole);
    const client = await getTestPool().connect();
    try {
      await reconcileRuntimeRoles(client, { apiRole, workerRole });
    } finally {
      client.release();
    }
    await getTestPool().query(
      `INSERT INTO tenants (id, slug, name, status, activated_at) VALUES ($1, $2, 'Workflow process tenant', 'active', now())`,
      [tenantId, `workflow-process-${suffix}`]
    );
    await getTestPool().query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active) VALUES ($1, $2, $3, 'Workflow process account', true)`,
      [accountId, tenantId, `workflow-process-account-${suffix}`]
    );
    await getTestPool().query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name) VALUES ($1, $2, $3, $4, 'workflow-process-test', 'Workflow process user')`,
      [userId, accountId, `workflow-process-user-${suffix}`, `workflow-process-${suffix}@example.test`]
    );
  }, 120_000);

  afterAll(async () => {
    await Promise.all([...activeProcesses].map((processHandle) => processHandle.kill('SIGKILL').catch(() => undefined)));
    await getTestPool().query('DELETE FROM accounts WHERE id = $1', [accountId]).catch(() => undefined);
    await getTestPool().query(`REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO CURRENT_USER`).catch(() => undefined);
    await getTestPool().query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`).catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`).catch(() => undefined);
    await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`).catch(() => undefined);
  }, 30_000);

  it('recovers after SIGKILL, then rejects a stale fencing token after takeover', async () => {
    const crashedTaskId = await createTask('workflow-process-crash');
    const first = startWorkflowProcess(crashedTaskId, `workflow-process-a-${suffix}`, 'claim-and-wait');
    const firstReady = await first.waitFor('WORKFLOW_READY');
    expect(firstReady.payload.databaseUser).toBe(workerRole);
    await first.waitFor('WORKFLOW_CLAIMED');
    const killed = await first.kill('SIGKILL');
    expect(killed.signal).toBe('SIGKILL');
    await waitForExpired(crashedTaskId);

    const second = startWorkflowProcess(crashedTaskId, `workflow-process-b-${suffix}`, 'claim-and-complete');
    await second.waitFor('WORKFLOW_CLAIMED');
    await expect(second.waitFor('WORKFLOW_RESULT')).resolves.toMatchObject({ payload: { completed: true } });
    await expect(second.close()).resolves.toEqual({ code: 0, signal: null });
    await expect(getTestPool().query(
      `SELECT status, attempts FROM clinical_workflow_tasks WHERE id = $1`,
      [crashedTaskId]
    )).resolves.toMatchObject({ rows: [{ status: 'completed', attempts: 2 }] });

    const fencedTaskId = await createTask('workflow-process-fencing');
    const stale = startWorkflowProcess(fencedTaskId, `workflow-process-stale-${suffix}`, 'claim-and-wait');
    await stale.waitFor('WORKFLOW_CLAIMED');
    await waitForExpired(fencedTaskId);
    const current = startWorkflowProcess(fencedTaskId, `workflow-process-current-${suffix}`, 'claim-and-complete');
    await current.waitFor('WORKFLOW_CLAIMED');
    await expect(current.waitFor('WORKFLOW_RESULT')).resolves.toMatchObject({ payload: { completed: true } });
    await expect(current.close()).resolves.toEqual({ code: 0, signal: null });
    stale.resume();
    await expect(stale.waitFor('WORKFLOW_RESULT')).resolves.toMatchObject({ payload: { completed: false } });
    await expect(stale.close()).resolves.toEqual({ code: 0, signal: null });
  }, 60_000);
});
