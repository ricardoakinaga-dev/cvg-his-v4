import type { ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { flushProcessCoverageCheckpoint } from './process-coverage-checkpoint.mjs';
import { isCriticalProcessRuntimeFixture } from '../../infra/scripts/critical-process-coverage.mjs';

const REQUEST = 'cvg:test:coverage-checkpoint';
const RESPONSE = 'cvg:test:coverage-checkpoint-result';
const pending = new WeakSet<ChildProcess>();
let installed = false;

function requireCoverageEnvironment(): void {
  if (
    process.env.CVG_CRITICAL_PROCESS_COVERAGE !== '1' ||
    (process.env.NODE_ENV !== 'test' && !isCriticalProcessRuntimeFixture()) ||
    !process.env.NODE_V8_COVERAGE
  ) {
    throw new Error('coverage control requires enabled test coverage');
  }
}

/** Test launcher only. No HTTP route, OS signal handler or graceful shutdown. */
export function installProcessCoverageControl(): void {
  if (process.env.CVG_PROCESS_COVERAGE_CONTROL !== '1') return;
  requireCoverageEnvironment();
  if (!process.connected || !process.send || !process.channel)
    throw new Error('coverage control requires IPC');
  if (installed) throw new Error('coverage control already installed');
  installed = true;
  process.on('message', (message: unknown) => {
    if (!message || typeof message !== 'object') return;
    const request = message as Record<string, unknown>;
    if (
      request.type !== REQUEST ||
      typeof request.nonce !== 'string' ||
      !/^[0-9a-f-]{36}$/.test(request.nonce)
    )
      return;
    let ok = false;
    try {
      requireCoverageEnvironment();
      flushProcessCoverageCheckpoint();
      ok = true;
    } catch {
      /* Parent must reject the failed checkpoint before its test kill. */
    }
    if (process.connected) {
      process.send?.({ type: RESPONSE, nonce: request.nonce, ok }, () => {});
    }
  });
  // An IPC listener must not keep a failed/finished API launcher alive.
  process.channel.unref();
}

/** Await acknowledgement of the flush only; the caller still performs SIGKILL. */
export async function requestProcessCoverageCheckpoint(
  child: ChildProcess,
  timeoutMs = 5000
): Promise<void> {
  if (process.env.CVG_CRITICAL_PROCESS_COVERAGE !== '1') return;
  requireCoverageEnvironment();
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000)
    throw new Error('invalid coverage checkpoint timeout');
  if (!child.connected || !child.send || child.exitCode !== null || child.signalCode !== null)
    throw new Error('coverage checkpoint child is not connected');
  if (pending.has(child)) throw new Error('coverage checkpoint already pending');
  pending.add(child);
  const nonce = randomUUID();
  try {
    await new Promise<void>((done, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.off('message', onMessage);
        child.off('exit', onExit);
        child.off('disconnect', onDisconnect);
        child.off('error', onError);
        if (error) reject(error);
        else done();
      };
      const onMessage = (message: unknown) => {
        if (!message || typeof message !== 'object') return;
        const response = message as Record<string, unknown>;
        if (response.type !== RESPONSE || response.nonce !== nonce) return;
        finish(response.ok === true ? undefined : new Error('child coverage checkpoint failed'));
      };
      const onExit = () => finish(new Error('child exited before coverage checkpoint'));
      const onDisconnect = () => finish(new Error('child disconnected before coverage checkpoint'));
      const onError = () => finish(new Error('child coverage IPC failed'));
      const timer = setTimeout(() => finish(new Error('coverage checkpoint timed out')), timeoutMs);
      child.on('message', onMessage);
      child.once('exit', onExit);
      child.once('disconnect', onDisconnect);
      child.once('error', onError);
      try {
        child.send({ type: REQUEST, nonce }, (error) => {
          if (error) onError();
        });
      } catch {
        onError();
      }
    });
  } finally {
    pending.delete(child);
  }
}
