import { spawn, type ChildProcess } from 'node:child_process';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

const ROOT = resolve(import.meta.dirname, '../../..');
const API_ENTRYPOINT = resolve(ROOT, 'apps/api/src/index.ts');
const WORKER_ENTRYPOINT = resolve(ROOT, 'apps/worker/src/index.ts');
const activeChildren = new Set<ChildProcess>();

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address() as AddressInfo | null;
  if (!address) throw new Error('runtime lifecycle test could not reserve a port');
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

interface ProcessResult {
  readonly code: number | null;
  readonly signal: NodeJS.Signals | null;
}

interface RuntimeProcess {
  readonly child: ChildProcess;
  readonly output: () => string;
  readonly close: () => Promise<ProcessResult>;
}

function startRuntime(entrypoint: string, environment: NodeJS.ProcessEnv): RuntimeProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', entrypoint], {
    cwd: ROOT,
    env: { ...process.env, ...environment },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  activeChildren.add(child);

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  let result: ProcessResult | undefined;
  let resolveClose: ((value: ProcessResult) => void) | undefined;
  const closed = new Promise<ProcessResult>((resolvePromise) => {
    resolveClose = resolvePromise;
  });
  child.once('close', (code, signal) => {
    result = { code, signal };
    activeChildren.delete(child);
    resolveClose?.(result);
  });

  return {
    child,
    output: () => output,
    close: () => (result ? Promise.resolve(result) : closed)
  };
}

async function waitForHttp(
  port: number,
  path: string,
  predicate: (response: Response, payload: Record<string, unknown>) => boolean,
  timeoutMs = 20_000
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        signal: AbortSignal.timeout(500)
      });
      const payload = (await response.json()) as Record<string, unknown>;
      if (predicate(response, payload)) return payload;
      lastError = `${response.status} ${JSON.stringify(payload)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 50));
  }
  throw new Error(`runtime endpoint ${path} did not satisfy its contract: ${lastError}`);
}

async function closeWithTimeout(runtime: RuntimeProcess): Promise<ProcessResult> {
  return await Promise.race([
    runtime.close(),
    new Promise<ProcessResult>((_, reject) =>
      setTimeout(
        () => reject(new Error(`runtime did not close:\n${runtime.output().slice(-3000)}`)),
        20_000
      )
    )
  ]);
}

afterEach(() => {
  for (const child of activeChildren) {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  }
  activeChildren.clear();
});

describe('canonical runtime process lifecycle', () => {
  it('drains the API and exits successfully after repeated SIGTERM', async () => {
    const port = await reservePort();
    const runtime = startRuntime(API_ENTRYPOINT, {
      NODE_ENV: 'development',
      HOST: '127.0.0.1',
      PORT: String(port),
      AUTH_SECRET: 'a'.repeat(64),
      OTEL_ENABLED: 'false',
      DATABASE_URL: ''
    });

    try {
      await waitForHttp(
        port,
        '/live',
        (response, payload) =>
          response.status === 200 && (payload.liveness as Record<string, unknown>)?.live === true
      );
      expect(runtime.child.kill('SIGTERM')).toBe(true);
      setTimeout(() => runtime.child.kill('SIGTERM'), 100);
      expect(await closeWithTimeout(runtime)).toEqual({ code: 0, signal: null });
      expect(runtime.output().match(/api server shutdown complete/g)).toHaveLength(1);
      expect(runtime.output().match(/Database connection closed/g)).toHaveLength(1);
    } finally {
      if (runtime.child.exitCode === null && runtime.child.signalCode === null) {
        runtime.child.kill('SIGKILL');
      }
    }
  }, 30_000);

  it('removes worker readiness immediately while the current tick drains', async () => {
    const port = await reservePort();
    const runtime = startRuntime(WORKER_ENTRYPOINT, {
      NODE_ENV: 'development',
      WORKER_ACCOUNT_ID: '00000000-0000-4000-8000-000000000001',
      WORKER_REPORTS_USER_ID: '11111111-1111-4111-8111-111111111111',
      WORKER_HEALTH_PORT: String(port),
      WORKER_INTERVAL_MS: '1000',
      OTEL_ENABLED: 'false',
      DATABASE_URL: ''
    });

    try {
      await waitForHttp(
        port,
        '/live',
        (response, payload) =>
          response.status === 200 && (payload.liveness as Record<string, unknown>)?.live === true
      );
      expect(runtime.child.kill('SIGTERM')).toBe(true);
      await waitForHttp(
        port,
        '/ready',
        (response, payload) =>
          response.status === 503 &&
          (payload.dependencies as Record<string, unknown>)?.worker &&
          String(
            ((payload.dependencies as Record<string, unknown>).worker as Record<string, unknown>)
              .detail
          ).includes('draining')
      );
      setTimeout(() => runtime.child.kill('SIGTERM'), 100);
      expect(await closeWithTimeout(runtime)).toEqual({ code: 0, signal: null });
      expect(runtime.output().match(/worker runtime shutdown complete/g)).toHaveLength(1);
    } finally {
      if (runtime.child.exitCode === null && runtime.child.signalCode === null) {
        runtime.child.kill('SIGKILL');
      }
    }
  }, 30_000);
});
