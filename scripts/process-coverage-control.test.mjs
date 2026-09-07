import assert from 'node:assert/strict';
import { fork, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { requestProcessCoverageCheckpoint } from '../tests/helpers/process-coverage-control.mts';

const helper = new URL('../tests/helpers/process-coverage-control.mts', import.meta.url).href;
const root = fileURLToPath(new URL('../', import.meta.url));
const REQUEST = 'cvg:test:coverage-checkpoint';
const RESPONSE = 'cvg:test:coverage-checkpoint-result';
const READY = 'cvg:test:fixture-ready';
const TRACKED_EVENTS = ['message', 'exit', 'disconnect', 'error', 'close'];
const TSX_EXEC_ARGV = ['--import', 'tsx/esm'];

function createSandbox(prefix) {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  const raw = join(directory, 'v8');
  mkdirSync(raw);
  return { directory, raw };
}

function writeFixture(directory, name, source) {
  const script = join(directory, name);
  writeFileSync(script, `${source.trim()}\n`, { encoding: 'utf8', flag: 'wx' });
  return script;
}

function minimalEnvironment(raw, overrides = {}) {
  return {
    PATH: process.env.PATH ?? '',
    NODE_ENV: 'test',
    CVG_CRITICAL_PROCESS_COVERAGE: '1',
    NODE_V8_COVERAGE: raw,
    ...overrides
  };
}

function parentCoverageEnvironment(raw) {
  return {
    CVG_CRITICAL_PROCESS_COVERAGE: '1',
    NODE_ENV: 'test',
    NODE_V8_COVERAGE: raw
  };
}

async function withEnvironment(values, callback) {
  const previous = new Map();
  for (const [key, value] of Object.entries(values)) {
    previous.set(key, process.env[key]);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function forkFixture(script, env) {
  return fork(script, [], {
    cwd: root,
    env,
    execArgv: TSX_EXEC_ARGV,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });
}

function spawnFixture(script, env) {
  return spawn(process.execPath, [...TSX_EXEC_ARGV, script], {
    cwd: root,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function observeChild(child, timeoutMs = 10000) {
  let stdout = '';
  let stderr = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  const onStdout = (chunk) => {
    stdout += chunk;
  };
  const onStderr = (chunk) => {
    stderr += chunk;
  };
  child.stdout?.on('data', onStdout);
  child.stderr?.on('data', onStderr);

  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      child.off('error', onError);
      child.off('close', onClose);
      child.stdout?.off('data', onStdout);
      child.stderr?.off('data', onStderr);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onError = (error) => finish(reject, error);
    const onClose = (code, signal) => finish(resolve, { code, signal, stdout, stderr });
    const timer = setTimeout(() => {
      finish(reject, new Error(`child did not close within ${timeoutMs}ms`));
    }, timeoutMs);
    child.once('error', onError);
    child.once('close', onClose);
  });
}

function waitForReady(child, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer);
      child.off('message', onMessage);
      child.off('close', onClose);
      child.off('error', onError);
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback(value);
    };
    const onMessage = (message) => {
      if (message?.type === READY) finish(resolve);
    };
    const onClose = () => finish(reject, new Error('fixture exited before ready'));
    const onError = (error) => finish(reject, error);
    const timer = setTimeout(() => {
      finish(reject, new Error(`fixture was not ready within ${timeoutMs}ms`));
    }, timeoutMs);
    child.on('message', onMessage);
    child.once('close', onClose);
    child.once('error', onError);
  });
}

function listenerCounts(child) {
  return Object.fromEntries(TRACKED_EVENTS.map((event) => [event, child.listenerCount(event)]));
}

function coverageReports(raw, pid) {
  const pattern = new RegExp(`^coverage-${pid}-[0-9]+-0\\.json$`);
  return readdirSync(raw).filter((name) => pattern.test(name));
}

function scriptFunctions(raw, reports, script) {
  return reports
    .flatMap((name) => JSON.parse(readFileSync(join(raw, name), 'utf8')).result)
    .filter((entry) => entry.url === pathToFileURL(script).href)
    .flatMap((entry) => entry.functions);
}

function functionCount(functions, functionName) {
  return functions
    .filter((entry) => entry.functionName === functionName)
    .reduce((total, entry) => total + (entry.ranges[0]?.count ?? 0), 0);
}

async function stopChild(child, terminal) {
  if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
  await terminal.catch(() => undefined);
}

test(
  'real V8 checkpoint is acknowledged before SIGKILL and preserves its report',
  { timeout: 15000, concurrency: false },
  async () => {
    const { directory, raw } = createSandbox('cvg-coverage-control-real-');
    const script = writeFixture(
      directory,
      'fixture.mjs',
      `
    import { installProcessCoverageControl } from ${JSON.stringify(helper)};

    function exercised() { return 42; }
    function untouched() { return 0; }

    installProcessCoverageControl();
    exercised();
    process.send?.({ type: ${JSON.stringify(READY)} });
    setInterval(() => {}, 1000);
  `
    );
    const child = forkFixture(
      script,
      minimalEnvironment(raw, {
        CVG_PROCESS_COVERAGE_CONTROL: '1'
      })
    );
    const terminal = observeChild(child);

    try {
      await waitForReady(child);
      await withEnvironment(parentCoverageEnvironment(raw), () =>
        requestProcessCoverageCheckpoint(child)
      );

      const reportsBeforeKill = coverageReports(raw, child.pid);
      assert.equal(reportsBeforeKill.length, 1, 'the correlated ack must follow one real V8 flush');
      const reportBytesBeforeKill = new Map(
        reportsBeforeKill.map((name) => [name, readFileSync(join(raw, name))])
      );
      const functions = scriptFunctions(raw, reportsBeforeKill, script);
      assert.ok(functions.some((entry) => entry.functionName === 'exercised'));
      assert.ok(functions.some((entry) => entry.functionName === 'untouched'));
      assert.equal(functionCount(functions, 'exercised'), 1);
      assert.equal(functionCount(functions, 'untouched'), 0);

      assert.equal(child.kill('SIGKILL'), true);
      const result = await terminal;
      assert.deepEqual(
        { code: result.code, signal: result.signal },
        { code: null, signal: 'SIGKILL' }
      );
      assert.deepEqual(coverageReports(raw, child.pid), reportsBeforeKill);
      for (const [name, bytes] of reportBytesBeforeKill) {
        assert.deepEqual(readFileSync(join(raw, name)), bytes);
      }
    } finally {
      await stopChild(child, terminal);
    }
  }
);

test(
  'disabled parent mode is a no-op even for invalid children',
  { timeout: 5000, concurrency: false },
  async () => {
    await withEnvironment(
      {
        CVG_CRITICAL_PROCESS_COVERAGE: undefined,
        NODE_ENV: 'production',
        NODE_V8_COVERAGE: undefined
      },
      async () => {
        assert.equal(await requestProcessCoverageCheckpoint(null, -1), undefined);
        assert.equal(await requestProcessCoverageCheckpoint(Object.create(null), 0), undefined);
      }
    );
  }
);

test(
  'installing the child listener does not keep an idle child alive',
  { timeout: 15000 },
  async () => {
    const { directory, raw } = createSandbox('cvg-coverage-control-unref-');
    const script = writeFixture(
      directory,
      'idle.mjs',
      `
    import { installProcessCoverageControl } from ${JSON.stringify(helper)};
    installProcessCoverageControl();
  `
    );
    const child = forkFixture(
      script,
      minimalEnvironment(raw, {
        CVG_PROCESS_COVERAGE_CONTROL: '1'
      })
    );
    const terminal = observeChild(child, 5000);

    try {
      const result = await terminal;
      assert.deepEqual({ code: result.code, signal: result.signal }, { code: 0, signal: null });
    } finally {
      await stopChild(child, terminal);
    }
  }
);

for (const scenario of [
  {
    name: 'missing NODE_V8_COVERAGE',
    launch: 'spawn',
    env: {
      PATH: process.env.PATH ?? '',
      NODE_ENV: 'test',
      CVG_CRITICAL_PROCESS_COVERAGE: '1',
      CVG_PROCESS_COVERAGE_CONTROL: '1'
    },
    expected: /coverage control requires enabled test coverage/
  },
  {
    name: 'non-test NODE_ENV',
    launch: 'spawn',
    env: (raw) => ({
      PATH: process.env.PATH ?? '',
      NODE_ENV: 'production',
      CVG_CRITICAL_PROCESS_COVERAGE: '1',
      NODE_V8_COVERAGE: raw,
      CVG_PROCESS_COVERAGE_CONTROL: '1'
    }),
    expected: /coverage control requires enabled test coverage/
  },
  {
    name: 'missing IPC',
    launch: 'spawn',
    expected: /coverage control requires IPC/
  }
]) {
  test(`child guard rejects ${scenario.name}`, { timeout: 15000 }, async () => {
    const { directory, raw } = createSandbox('cvg-coverage-control-guard-');
    const script = writeFixture(
      directory,
      'guard.mjs',
      `
      import { installProcessCoverageControl } from ${JSON.stringify(helper)};
      installProcessCoverageControl();
    `
    );
    const env =
      typeof scenario.env === 'function'
        ? scenario.env(raw)
        : (scenario.env ?? minimalEnvironment(raw));
    if (!scenario.env) env.CVG_PROCESS_COVERAGE_CONTROL = '1';
    const child =
      scenario.launch === 'spawn' ? spawnFixture(script, env) : forkFixture(script, env);
    const terminal = observeChild(child);

    try {
      const result = await terminal;
      assert.equal(result.status ?? result.code, 1, result.stderr);
      assert.match(result.stderr, scenario.expected);
    } finally {
      await stopChild(child, terminal);
    }
  });
}

function failureFixture(directory, mode) {
  const behavior = {
    timeout: `
      process.on('message', () => {});
    `,
    'wrong nonce': `
      process.on('message', (message) => {
        if (message?.type !== ${JSON.stringify(REQUEST)}) return;
        process.send?.({
          type: ${JSON.stringify(RESPONSE)},
          nonce: '00000000-0000-4000-8000-000000000000',
          ok: true
        });
      });
    `,
    'negative ack': `
      process.on('message', (message) => {
        if (message?.type !== ${JSON.stringify(REQUEST)}) return;
        process.send?.({ type: ${JSON.stringify(RESPONSE)}, nonce: message.nonce, ok: false });
      });
    `,
    disconnect: `
      process.on('message', (message) => {
        if (message?.type === ${JSON.stringify(REQUEST)}) process.disconnect?.();
      });
    `,
    exit: `
      process.on('message', (message) => {
        if (message?.type === ${JSON.stringify(REQUEST)}) process.exit(0);
      });
    `
  }[mode];
  return writeFixture(
    directory,
    `${mode.replaceAll(' ', '-')}.mjs`,
    `
    ${behavior}
    process.send?.({ type: ${JSON.stringify(READY)} });
    setInterval(() => {}, 1000);
  `
  );
}

test(
  'rejects runtime disabling of child coverage without acknowledging an unperformed flush',
  { timeout: 15000, concurrency: false },
  async () => {
    const { directory, raw } = createSandbox('cvg-coverage-control-runtime-guard-');
    const script = writeFixture(
      directory,
      'runtime-guard.mjs',
      `
    import { installProcessCoverageControl } from ${JSON.stringify(helper)};
    installProcessCoverageControl();
    process.env.CVG_CRITICAL_PROCESS_COVERAGE = '0';
    process.send?.({ type: ${JSON.stringify(READY)} });
    setInterval(() => {}, 1000);
  `
    );
    const child = forkFixture(
      script,
      minimalEnvironment(raw, { CVG_PROCESS_COVERAGE_CONTROL: '1' })
    );
    const terminal = observeChild(child);
    try {
      await waitForReady(child);
      await withEnvironment(parentCoverageEnvironment(raw), () =>
        assert.rejects(
          () => requestProcessCoverageCheckpoint(child),
          /child coverage checkpoint failed/
        )
      );
      assert.equal(coverageReports(raw, child.pid).length, 0);
    } finally {
      await stopChild(child, terminal);
    }
  }
);

for (const mode of ['timeout', 'wrong nonce', 'negative ack', 'disconnect', 'exit']) {
  test(
    `checkpoint request rejects bounded and removes listeners: ${mode}`,
    { timeout: 15000, concurrency: false },
    async () => {
      const { directory, raw } = createSandbox(
        `cvg-coverage-control-${mode.replaceAll(' ', '-')}-`
      );
      const script = failureFixture(directory, mode);
      const child = forkFixture(script, minimalEnvironment(raw));
      const terminal = observeChild(child);
      const expected =
        mode === 'negative ack'
          ? /child coverage checkpoint failed/
          : mode === 'disconnect'
            ? /child disconnected before coverage checkpoint|coverage checkpoint IPC failed/
            : mode === 'exit'
              ? /child (?:exited|disconnected) before coverage checkpoint/
              : /coverage checkpoint timed out/;

      try {
        await waitForReady(child);
        const before = listenerCounts(child);
        const startedAt = performance.now();
        await assert.rejects(
          () =>
            withEnvironment(parentCoverageEnvironment(raw), () =>
              requestProcessCoverageCheckpoint(child, 250)
            ),
          expected
        );
        const elapsedMs = performance.now() - startedAt;
        assert.ok(elapsedMs < 3000, `${mode} rejection was not bounded: ${elapsedMs.toFixed(1)}ms`);
        assert.deepEqual(listenerCounts(child), before);
        if (mode === 'exit') {
          const result = await terminal;
          assert.deepEqual({ code: result.code, signal: result.signal }, { code: 0, signal: null });
        }
      } finally {
        await stopChild(child, terminal);
      }
    }
  );
}
