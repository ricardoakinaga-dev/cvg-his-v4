import { createInterface } from 'node:readline';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';

import { Pool, type PoolClient } from 'pg';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_IS_EPHEMERAL, TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';
import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import {
  createPixSettlementProcessFixture,
  makePixSettlementProcessFixtureReady,
  type PixSettlementProcessFixture
} from '../../helpers/pix-settlement-process-fixture.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const processFixturePath = resolve(
  __dirname,
  '../../../apps/worker/test-fixtures/pix-provider-settlement-process.ts'
);
const CHECKPOINTS = [
  'after_claim_commit',
  'before_b1',
  'after_b1_before_cas',
  'after_applied_cas'
] as const;
type Checkpoint = (typeof CHECKPOINTS)[number];
const B1_CHECKPOINTS = [
  'after_inbox_claim',
  'after_financial_account_insert',
  'after_receivable_insert',
  'after_receivable_settlement',
  'after_receivable_payment_insert',
  'after_financial_account_settlement',
  'after_billing_settlement',
  'after_pix_settlement',
  'after_pix_staging',
  'after_attempt_confirmed_pending_apply',
  'after_attempt_settlement',
  'after_journal_entry_insert',
  'after_journal_lines_insert',
  'after_proof_insert',
  'after_audit_append',
  'after_outbox_append'
] as const;
type B1Checkpoint = (typeof B1_CHECKPOINTS)[number];

const suffix = randomUUID().replaceAll('-', '');
const apiRole = `pix_settlement_process_api_${suffix}`;
const workerRole = `pix_settlement_process_worker_${suffix}`;
const rolePassword = `pix-settlement-process-${suffix}`;

interface ProcessEvent {
  readonly event: string;
  readonly payload: Record<string, unknown>;
}

interface WorkerProcess {
  readonly child: ChildProcess;
  readonly pid: number;
  readonly stderr: () => string;
  readonly events: () => readonly ProcessEvent[];
  release(): void;
  waitFor(event: string, timeoutMs?: number): Promise<ProcessEvent>;
  waitForClose(): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
  kill(
    signal: NodeJS.Signals
  ): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null }>;
}

const activeProcesses = new Set<WorkerProcess>();

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function databaseUrlFor(role: string): string {
  const url = new URL(TEST_DB_URL);
  url.username = role;
  url.password = rolePassword;
  return url.toString();
}

function parseEvent(line: string): ProcessEvent | null {
  const separator = line.indexOf(' ');
  if (separator <= 0) return null;
  const event = line.slice(0, separator);
  try {
    const payload = JSON.parse(line.slice(separator + 1)) as Record<string, unknown>;
    return { event, payload };
  } catch {
    return null;
  }
}

function startWorkerProcess(options: {
  readonly accountId: string;
  readonly workerId: string;
  readonly checkpoint?: Checkpoint;
  readonly b1Checkpoint?: B1Checkpoint;
  readonly leaseMs: number;
  readonly waitForRelease?: boolean;
  readonly exitAfterResult?: boolean;
}): WorkerProcess {
  // Launch Node directly so the PID returned by spawn is the worker PID we
  // later SIGKILL. The package-level tsx shim can exec a second Node process,
  // leaving the actual fixture orphaned when only the shim is killed.
  const child = spawn(process.execPath, ['--import', 'tsx/esm', processFixturePath], {
    cwd: resolve(__dirname, '../../..'),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PIX_SETTLEMENT_SYNTHETIC_FIXTURE: '1',
      DATABASE_URL: databaseUrlFor(workerRole),
      PIX_SETTLEMENT_ACCOUNT_ID: options.accountId,
      PIX_SETTLEMENT_WORKER_ID: options.workerId,
      PIX_SETTLEMENT_LEASE_MS: String(options.leaseMs),
      PIX_SETTLEMENT_CHECKPOINT: options.checkpoint ?? '',
      PIX_SETTLEMENT_B1_CHECKPOINT: options.b1Checkpoint ?? '',
      PIX_SETTLEMENT_HEALTH_PORT: '0',
      PIX_SETTLEMENT_WAIT_FOR_RELEASE: options.waitForRelease ? '1' : '0',
      PIX_SETTLEMENT_EXIT_AFTER_RESULT: options.exitAfterResult ? '1' : '0'
    },
    stdio: ['pipe', 'ignore', 'pipe', 'pipe']
  });
  if (!child.pid) throw new Error('settlement process did not expose a PID');
  const controlChannel = child.stdio[3];
  if (!controlChannel || typeof controlChannel === 'number') {
    throw new Error('settlement process did not expose the control channel');
  }

  let stderr = '';
  if (!child.stderr) throw new Error('settlement process did not expose stderr');
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });

  const events: ProcessEvent[] = [];
  const waiters = new Map<
    string,
    Array<{
      resolve: (event: ProcessEvent) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }>
  >();
  const lines = createInterface({ input: controlChannel });
  lines.on('line', (line) => {
    const parsed = parseEvent(line);
    if (!parsed) return;
    events.push(parsed);
    const pending = waiters.get(parsed.event);
    if (!pending?.length) return;
    waiters.delete(parsed.event);
    for (const waiter of pending) {
      clearTimeout(waiter.timer);
      waiter.resolve(parsed);
    }
  });

  let closeResult: { readonly code: number | null; readonly signal: NodeJS.Signals | null } | null =
    null;
  let closePromiseResolve:
    | ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | null = null;
  const closePromise = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClose) => {
    closePromiseResolve = resolveClose;
  });
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    closePromiseResolve?.(closeResult);
    for (const [eventName, pending] of waiters) {
      for (const waiter of pending) {
        clearTimeout(waiter.timer);
        waiter.reject(
          new Error(
            `child closed before event ${eventName}; events=${JSON.stringify(events)}; stderr=${stderr}`
          )
        );
      }
    }
    waiters.clear();
  });

  const processHandle: WorkerProcess = {
    child,
    pid: child.pid,
    stderr: () => stderr,
    events() {
      return Object.freeze([...events]);
    },
    release() {
      if (!child.stdin || child.stdin.destroyed)
        throw new Error(`stdin is closed for PID ${child.pid}`);
      child.stdin.write('PIX_RELEASE\n');
    },
    waitFor(event, timeoutMs = 10_000) {
      const existing = events.find((candidate) => candidate.event === event);
      if (existing) return Promise.resolve(existing);
      return new Promise<ProcessEvent>((resolveEvent, rejectEvent) => {
        const timer = setTimeout(() => {
          const list = waiters.get(event) ?? [];
          waiters.set(
            event,
            list.filter((item) => item.resolve !== resolveEvent)
          );
          rejectEvent(
            new Error(
              `timed out waiting for ${event}; events=${JSON.stringify(events)}; stderr=${stderr}`
            )
          );
        }, timeoutMs);
        const list = waiters.get(event) ?? [];
        list.push({ resolve: resolveEvent, reject: rejectEvent, timer });
        waiters.set(event, list);
      });
    },
    waitForClose() {
      return closeResult ? Promise.resolve(closeResult) : closePromise;
    },
    async kill(signal) {
      if (closeResult) return closeResult;
      if (!child.kill(signal)) throw new Error(`failed to send ${signal} to PID ${child.pid}`);
      return closePromise;
    }
  };
  activeProcesses.add(processHandle);
  void processHandle.waitForClose().finally(() => activeProcesses.delete(processHandle));
  return processHandle;
}

async function waitForHttp(port: number, path: string): Promise<Response> {
  const deadline = Date.now() + 10_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        signal: AbortSignal.timeout(500)
      });
      if (response.status === 200) return response;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${path}: ${String(lastError)}`);
}

async function waitForLeaseExpiry(fixture: PixSettlementProcessFixture): Promise<void> {
  const pool = getTestPool();
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ readonly expired: boolean; readonly state: string }>(
      `SELECT state, lease_expires_at <= clock_timestamp() AS expired
         FROM pix_provider_event_deliveries
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.deliveryId]
    );
    if (result.rows[0]?.state === 'processing' && result.rows[0]?.expired) return;
    await sleep(50);
  }
  throw new Error('settlement lease did not expire after process kill');
}

async function readSettlementState(fixture: PixSettlementProcessFixture) {
  const pool = getTestPool();
  const result = await pool.query<{
    readonly delivery_state: string;
    readonly attempts: number;
    readonly lease_version: string;
    readonly receipt_count: string;
    readonly billing_status: string;
    readonly attempt_state: string;
    readonly pix_status: string;
    readonly pix_settlement_status: string;
  }>(
    `SELECT delivery.state AS delivery_state,
            delivery.attempts,
            delivery.lease_version::text,
            (SELECT COUNT(*)::text FROM encounter_non_cash_receipts AS receipt
              WHERE receipt.account_id = delivery.account_id
                AND receipt.transaction_id = $2::text) AS receipt_count,
            billing.status AS billing_status,
            attempt.state AS attempt_state,
            pix.status AS pix_status,
            pix.billing_settlement_status AS pix_settlement_status
       FROM pix_provider_event_deliveries AS delivery
       JOIN billing_records AS billing
         ON billing.account_id = delivery.account_id AND billing.id = $3
       JOIN encounter_payment_attempts AS attempt
         ON attempt.account_id = delivery.account_id AND attempt.id = $2
       JOIN pix_transactions AS pix
         ON pix.account_id = delivery.account_id AND pix.transaction_id = $2::text
      WHERE delivery.account_id = $1 AND delivery.id = $4`,
    [fixture.accountId, fixture.attemptId, fixture.billingRecordId, fixture.deliveryId]
  );
  return result.rows[0];
}

async function assertRoleCannotMutateForbiddenPixArtifacts(
  role: string,
  accountId: string,
  verify: (client: PoolClient) => Promise<void>
): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrlFor(role), max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    await verify(client);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
    await pool.end();
  }
}

beforeAll(async () => {
  if (!TEST_DB_IS_EPHEMERAL) return;
  const adminPool = getAdminPool();
  await adminPool.query(
    `CREATE ROLE ${quoteIdentifier(apiRole)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `CREATE ROLE ${quoteIdentifier(workerRole)} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD '${rolePassword}'`
  );
  await adminPool.query(
    `GRANT CONNECT ON DATABASE ${quoteIdentifier(TEST_DB_NAME)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
  );
  const client = await getTestPool().connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole, workerRole });
  } finally {
    client.release();
  }
}, 120_000);

afterEach(async () => {
  if (!TEST_DB_IS_EPHEMERAL) return;
  await Promise.all(
    [...activeProcesses].map((processHandle) =>
      processHandle.kill('SIGKILL').catch(() => undefined)
    )
  );
});

afterAll(async () => {
  if (!TEST_DB_IS_EPHEMERAL) return;
  const pool = getTestPool();
  await pool
    .query(
      `REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO CURRENT_USER`
    )
    .catch(() => undefined);
  await pool
    .query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`)
    .catch(() => undefined);
  const adminPool = getAdminPool();
  await adminPool
    .query(`REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`)
    .catch(() => undefined);
  await adminPool.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`).catch(() => undefined);
  await adminPool
    .query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`)
    .catch(() => undefined);
});

// Every fixture owns a fresh random account and all worker assertions are
// tenant-scoped. Keeping those accounts isolated avoids a schema-wide
// TRUNCATE before every case while preserving the process/role boundaries
// this suite is meant to verify.
describe.skipIf(!TEST_DB_IS_EPHEMERAL)(
  'PIX settlement independent-process SIGKILL/restart matrix',
  () => {
    it('runs the real settlement PID as the reconciled worker role', async () => {
      const fixture = await createPixSettlementProcessFixture();
      await makePixSettlementProcessFixtureReady(fixture);
      const worker = startWorkerProcess({
        accountId: fixture.accountId,
        workerId: 'runtime-role-red',
        leaseMs: 60_000,
        exitAfterResult: true
      });
      const ready = await worker.waitFor('PIX_READY');
      expect(ready.payload.databaseUser).toBe(workerRole);
      const result = (await worker.waitFor('PIX_RESULT')).payload.result as {
        readonly status: string;
        readonly deliveryId?: string;
        readonly failureCode?: string;
        readonly failureClass?: string;
      };
      expect(result.status, JSON.stringify(result)).toBe('applied');
      expect(result).toMatchObject({
        status: 'applied',
        deliveryId: fixture.deliveryId
      });
      expect(await worker.waitForClose()).toEqual({ code: 0, signal: null });
    }, 60_000);

    it('keeps real worker settlement isolated by account under the runtime role', async () => {
      const fixtureA = await createPixSettlementProcessFixture();
      const fixtureB = await createPixSettlementProcessFixture();
      await makePixSettlementProcessFixtureReady(fixtureA);
      await makePixSettlementProcessFixtureReady(fixtureB);

      const workerA = startWorkerProcess({
        accountId: fixtureA.accountId,
        workerId: 'runtime-role-isolation-a',
        leaseMs: 60_000,
        exitAfterResult: true
      });
      const readyA = await workerA.waitFor('PIX_READY');
      expect(readyA.payload.databaseUser).toBe(workerRole);
      expect((await workerA.waitFor('PIX_RESULT')).payload.result).toMatchObject({
        status: 'applied',
        deliveryId: fixtureA.deliveryId
      });
      expect(await workerA.waitForClose()).toEqual({ code: 0, signal: null });
      expect(await readSettlementState(fixtureA)).toMatchObject({
        delivery_state: 'applied',
        receipt_count: '1'
      });
      expect(await readSettlementState(fixtureB)).toMatchObject({
        delivery_state: 'pending',
        receipt_count: '0'
      });

      const workerB = startWorkerProcess({
        accountId: fixtureB.accountId,
        workerId: 'runtime-role-isolation-b',
        leaseMs: 60_000,
        exitAfterResult: true
      });
      expect((await workerB.waitFor('PIX_READY')).payload.databaseUser).toBe(workerRole);
      expect((await workerB.waitFor('PIX_RESULT')).payload.result).toMatchObject({
        status: 'applied',
        deliveryId: fixtureB.deliveryId
      });
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(await readSettlementState(fixtureB)).toMatchObject({
        delivery_state: 'applied',
        receipt_count: '1'
      });
    }, 60_000);

    it('keeps receipt mutation worker-denied and delivery mutation API-denied', async () => {
      const fixture = await createPixSettlementProcessFixture();
      await assertRoleCannotMutateForbiddenPixArtifacts(
        workerRole,
        fixture.accountId,
        async (pool) => {
          const identity = await pool.query<{
            readonly database_user: string;
            readonly bypass_rls: boolean;
          }>(
            `SELECT current_user AS database_user,
                (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypass_rls`
          );
          expect(identity.rows[0]).toEqual({ database_user: workerRole, bypass_rls: false });
          const requiredSettlementFunction = await pool.query<{ readonly allowed: boolean }>(
            `SELECT has_function_privilege(
                  current_user,
                  'app.assert_encounter_non_cash_receipt_consistent(uuid)',
                  'EXECUTE'
                ) AS allowed`
          );
          expect(requiredSettlementFunction.rows[0]).toEqual({ allowed: true });
          await pool.query('SAVEPOINT worker_receipt_update');
          await expect(
            pool.query('UPDATE pix_provider_events SET received_at = received_at WHERE id = $1', [
              randomUUID()
            ])
          ).rejects.toThrow(/permission denied/i);
          await pool.query('ROLLBACK TO SAVEPOINT worker_receipt_update');
          await pool.query('SAVEPOINT worker_receipt_insert');
          await expect(
            pool.query(
              `INSERT INTO pix_provider_events (
             account_id, provider_event_id, event_type, payment_attempt_id,
             provider_transaction_id, amount_cents, currency, confirmed_at,
             body_fingerprint, claims_fingerprint, correlation_id
           ) VALUES ($1, 'worker-forbidden', 'pix.payment.confirmed.v1', $2,
             'worker-forbidden-tx', 1, 'BRL', clock_timestamp(), $3, $4, 'worker-forbidden')`,
              [fixture.accountId, fixture.attemptId, 'a'.repeat(64), 'b'.repeat(64)]
            )
          ).rejects.toThrow(/permission denied/i);
          await pool.query('ROLLBACK TO SAVEPOINT worker_receipt_insert');
        }
      );
      await assertRoleCannotMutateForbiddenPixArtifacts(
        apiRole,
        fixture.accountId,
        async (pool) => {
          await pool.query('SAVEPOINT api_delivery_update');
          await expect(
            pool.query(
              'UPDATE pix_provider_event_deliveries SET attempts = attempts WHERE id = $1',
              [fixture.deliveryId]
            )
          ).rejects.toThrow(/permission denied/i);
          await pool.query('ROLLBACK TO SAVEPOINT api_delivery_update');
        }
      );
    }, 60_000);

    it.each(CHECKPOINTS)(
      'recovers after SIGKILL at %s',
      async (checkpoint) => {
        const fixture = await createPixSettlementProcessFixture();
        await makePixSettlementProcessFixtureReady(fixture);
        // Keep enough headroom for a cold Node/tsx process and PostgreSQL locks;
        // the stale-fence test below still uses the short lease deliberately.
        const leaseMs = 2_000;
        const workerA = startWorkerProcess({
          accountId: fixture.accountId,
          workerId: `sigkill-a-${checkpoint}`,
          checkpoint,
          leaseMs
        });
        const readyA = await workerA.waitFor('PIX_READY');
        expect(workerA.pid).toBe(Number(readyA.payload.pid));
        const healthPort = Number(readyA.payload.port);
        expect((await waitForHttp(healthPort, '/ready')).status).toBe(200);
        expect((await waitForHttp(healthPort, '/metrics')).status).toBe(200);

        const checkpointEvent = await workerA.waitFor('PIX_CHECKPOINT');
        expect(checkpointEvent.payload.checkpoint).toBe(checkpoint);
        expect(Number(checkpointEvent.payload.pid)).toBe(workerA.pid);

        if (checkpoint === 'after_applied_cas') {
          const stateAtCheckpoint = await readSettlementState(fixture);
          expect(stateAtCheckpoint?.receipt_count).toBe('1');
          expect(stateAtCheckpoint?.delivery_state).toBe('applied');
        } else {
          const stateAtCheckpoint = await readSettlementState(fixture);
          expect(stateAtCheckpoint?.delivery_state).toBe('processing');
        }

        const killed = await workerA.kill('SIGKILL');
        expect(killed.signal).toBe('SIGKILL');

        if (checkpoint !== 'after_applied_cas') {
          await waitForLeaseExpiry(fixture);
        }

        const workerB = startWorkerProcess({
          accountId: fixture.accountId,
          workerId: `sigkill-b-${checkpoint}`,
          leaseMs,
          exitAfterResult: true
        });
        const readyB = await workerB.waitFor('PIX_READY');
        expect(Number(readyB.payload.pid)).toBe(workerB.pid);
        expect(workerB.pid).not.toBe(workerA.pid);
        expect((await waitForHttp(Number(readyB.payload.port), '/ready')).status).toBe(200);
        expect((await waitForHttp(Number(readyB.payload.port), '/metrics')).status).toBe(200);
        const resultEvent = await workerB.waitFor('PIX_RESULT');
        const result = resultEvent.payload.result as {
          readonly status: string;
          readonly deliveryId?: string;
        };
        if (checkpoint === 'after_applied_cas') {
          expect(result.status).toBe('idle');
        } else {
          expect(result).toMatchObject({ status: 'applied', deliveryId: fixture.deliveryId });
        }
        const closedB = await workerB.waitForClose();
        expect(closedB).toEqual({ code: 0, signal: null });
        expect(workerB.stderr()).toBe('');

        const workerC = startWorkerProcess({
          accountId: fixture.accountId,
          workerId: `sigkill-c-${checkpoint}`,
          leaseMs,
          exitAfterResult: true
        });
        await workerC.waitFor('PIX_READY');
        const idleAfterRestart = await workerC.waitFor('PIX_RESULT');
        expect(idleAfterRestart.payload.result).toMatchObject({ status: 'idle' });
        expect(await workerC.waitForClose()).toEqual({ code: 0, signal: null });
        expect(workerC.stderr()).toBe('');

        const finalState = await readSettlementState(fixture);
        expect(finalState).toMatchObject({
          delivery_state: 'applied',
          attempts: checkpoint === 'after_applied_cas' ? 1 : 2,
          lease_version: checkpoint === 'after_applied_cas' ? '1' : '2',
          receipt_count: '1',
          billing_status: 'settled',
          attempt_state: 'settled',
          pix_status: 'completed',
          pix_settlement_status: 'applied'
        });
      },
      60_000
    );

    it('observes a live stale process after takeover and fences it before B1', async () => {
      const fixture = await createPixSettlementProcessFixture();
      await makePixSettlementProcessFixtureReady(fixture);
      const workerA = startWorkerProcess({
        accountId: fixture.accountId,
        workerId: 'stale-process-a',
        checkpoint: 'after_claim_commit',
        leaseMs: 300,
        waitForRelease: true,
        exitAfterResult: true
      });
      const readyA = await workerA.waitFor('PIX_READY');
      expect(Number(readyA.payload.pid)).toBe(workerA.pid);
      const checkpointA = await workerA.waitFor('PIX_CHECKPOINT');
      expect(checkpointA.payload).toMatchObject({
        checkpoint: 'after_claim_commit',
        leaseVersion: 1,
        pid: workerA.pid
      });
      await waitForLeaseExpiry(fixture);
      expect(() => process.kill(workerA.pid, 0)).not.toThrow();

      const workerB = startWorkerProcess({
        accountId: fixture.accountId,
        workerId: 'stale-process-b',
        checkpoint: 'after_claim_commit',
        leaseMs: 60_000,
        waitForRelease: true,
        exitAfterResult: true
      });
      const readyB = await workerB.waitFor('PIX_READY');
      expect(Number(readyB.payload.pid)).toBe(workerB.pid);
      expect(workerB.pid).not.toBe(workerA.pid);
      const checkpointB = await workerB.waitFor('PIX_CHECKPOINT');
      expect(checkpointB.payload).toMatchObject({
        checkpoint: 'after_claim_commit',
        leaseVersion: 2,
        pid: workerB.pid
      });
      expect(
        workerB
          .events()
          .filter((event) => event.event === 'PIX_CHECKPOINT_OBSERVED')
          .map((event) => event.payload.checkpoint)
      ).toEqual(['after_claim_commit']);
      expect(await readSettlementState(fixture)).toMatchObject({
        delivery_state: 'processing',
        attempts: 2,
        lease_version: '2',
        receipt_count: '0'
      });

      workerA.release();
      await workerA.waitFor('PIX_RELEASED');
      const staleResult = await workerA.waitFor('PIX_RESULT');
      expect(staleResult.payload.result).toMatchObject({
        status: 'lease_lost',
        deliveryId: fixture.deliveryId
      });
      expect(
        workerA
          .events()
          .filter((event) => event.event === 'PIX_CHECKPOINT_OBSERVED')
          .map((event) => event.payload.checkpoint)
      ).toEqual(['after_claim_commit']);
      expect(await workerA.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerA.stderr()).toBe('');

      workerB.release();
      await workerB.waitFor('PIX_RELEASED');
      const appliedResult = await workerB.waitFor('PIX_RESULT');
      expect(appliedResult.payload.result).toMatchObject({
        status: 'applied',
        deliveryId: fixture.deliveryId
      });
      // Once released, B must still traverse B1 and the final CAS exactly once.
      expect(
        workerB
          .events()
          .filter((event) => event.event === 'PIX_CHECKPOINT_OBSERVED')
          .map((event) => event.payload.checkpoint)
      ).toEqual(['after_claim_commit', 'before_b1', 'after_b1_before_cas', 'after_applied_cas']);
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerB.stderr()).toBe('');

      expect(await readSettlementState(fixture)).toMatchObject({
        delivery_state: 'applied',
        attempts: 2,
        lease_version: '2',
        receipt_count: '1',
        billing_status: 'settled',
        attempt_state: 'settled',
        pix_status: 'completed',
        pix_settlement_status: 'applied'
      });
    }, 60_000);

    it('allows one live worker to claim while a concurrent live worker remains idle', async () => {
      const fixture = await createPixSettlementProcessFixture();
      await makePixSettlementProcessFixtureReady(fixture);

      const workerA = startWorkerProcess({
        accountId: fixture.accountId,
        workerId: 'concurrent-live-a',
        checkpoint: 'after_claim_commit',
        leaseMs: 5_000,
        waitForRelease: true,
        exitAfterResult: true
      });
      const readyA = await workerA.waitFor('PIX_READY');
      const checkpointA = await workerA.waitFor('PIX_CHECKPOINT');
      expect(Number(readyA.payload.pid)).toBe(workerA.pid);
      expect(checkpointA.payload).toMatchObject({
        checkpoint: 'after_claim_commit',
        leaseVersion: 1,
        pid: workerA.pid
      });

      const workerB = startWorkerProcess({
        accountId: fixture.accountId,
        workerId: 'concurrent-live-b',
        leaseMs: 5_000,
        exitAfterResult: true
      });
      const readyB = await workerB.waitFor('PIX_READY');
      expect(Number(readyB.payload.pid)).toBe(workerB.pid);
      expect(workerB.pid).not.toBe(workerA.pid);
      expect((await workerB.waitFor('PIX_RESULT')).payload.result).toMatchObject({
        status: 'idle'
      });
      expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerB.stderr()).toBe('');

      expect(await readSettlementState(fixture)).toMatchObject({
        delivery_state: 'processing',
        attempts: 1,
        lease_version: '1',
        receipt_count: '0'
      });

      workerA.release();
      await workerA.waitFor('PIX_RELEASED');
      expect((await workerA.waitFor('PIX_RESULT')).payload.result).toMatchObject({
        status: 'applied',
        deliveryId: fixture.deliveryId
      });
      expect(await workerA.waitForClose()).toEqual({ code: 0, signal: null });
      expect(workerA.stderr()).toBe('');

      expect(await readSettlementState(fixture)).toMatchObject({
        delivery_state: 'applied',
        attempts: 1,
        lease_version: '1',
        receipt_count: '1',
        billing_status: 'settled',
        attempt_state: 'settled',
        pix_status: 'completed',
        pix_settlement_status: 'applied'
      });
    }, 60_000);

    it.each(B1_CHECKPOINTS)(
      'recovers after SIGKILL at B1 internal checkpoint %s',
      async (checkpoint) => {
        const fixture = await createPixSettlementProcessFixture();
        await makePixSettlementProcessFixtureReady(fixture);
        const leaseMs = 2_000;
        const workerA = startWorkerProcess({
          accountId: fixture.accountId,
          workerId: `b1-sigkill-a-${checkpoint}`,
          b1Checkpoint: checkpoint,
          leaseMs
        });
        const readyA = await workerA.waitFor('PIX_READY');
        expect(Number(readyA.payload.pid)).toBe(workerA.pid);
        const checkpointEvent = await workerA.waitFor('PIX_B1_CHECKPOINT');
        expect(checkpointEvent.payload).toMatchObject({
          checkpoint,
          pid: workerA.pid
        });

        const killed = await workerA.kill('SIGKILL');
        expect(killed.signal).toBe('SIGKILL');
        await waitForLeaseExpiry(fixture);
        expect(await readSettlementState(fixture)).toMatchObject({
          delivery_state: 'processing',
          attempts: 1,
          lease_version: '1',
          receipt_count: '0',
          billing_status: 'open',
          attempt_state: 'awaiting_confirmation',
          pix_status: 'pending',
          pix_settlement_status: 'awaiting_payment'
        });

        const workerB = startWorkerProcess({
          accountId: fixture.accountId,
          workerId: `b1-sigkill-b-${checkpoint}`,
          leaseMs,
          exitAfterResult: true
        });
        await workerB.waitFor('PIX_READY');
        expect((await workerB.waitFor('PIX_RESULT')).payload.result).toMatchObject({
          status: 'applied',
          deliveryId: fixture.deliveryId
        });
        expect(await workerB.waitForClose()).toEqual({ code: 0, signal: null });
        expect(workerB.stderr()).toBe('');

        expect(await readSettlementState(fixture)).toMatchObject({
          delivery_state: 'applied',
          attempts: 2,
          lease_version: '2',
          receipt_count: '1',
          billing_status: 'settled',
          attempt_state: 'settled',
          pix_status: 'completed',
          pix_settlement_status: 'applied'
        });
      },
      60_000
    );
  }
);
