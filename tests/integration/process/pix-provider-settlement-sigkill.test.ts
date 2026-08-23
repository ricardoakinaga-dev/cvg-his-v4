import { createInterface } from 'node:readline';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
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
      DATABASE_URL: TEST_DB_URL,
      PIX_SETTLEMENT_ACCOUNT_ID: options.accountId,
      PIX_SETTLEMENT_WORKER_ID: options.workerId,
      PIX_SETTLEMENT_LEASE_MS: String(options.leaseMs),
      PIX_SETTLEMENT_CHECKPOINT: options.checkpoint ?? '',
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

beforeEach(async () => {
  await getTestPool().query('TRUNCATE TABLE accounts CASCADE');
});

afterEach(async () => {
  await Promise.all(
    [...activeProcesses].map((processHandle) =>
      processHandle.kill('SIGKILL').catch(() => undefined)
    )
  );
});

describe('PIX settlement independent-process SIGKILL/restart matrix', () => {
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
});
