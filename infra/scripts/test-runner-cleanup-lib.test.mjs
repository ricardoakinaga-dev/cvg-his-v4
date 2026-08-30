import test from 'node:test';
import assert from 'node:assert/strict';

import {
  collectAncestorPids,
  isTrackedTestProcess,
  parseProcessTable,
  selectOrphanTestProcesses,
  selectStaleTestProcesses
} from './test-runner-cleanup-lib.mjs';

test('parseProcessTable parses ps output into structured rows', () => {
  const processes = parseProcessTable(
    '101 1 300 node /workspace/node_modules/vitest/vitest.mjs run\n102 101 12 bash -lc pnpm test:coverage\n'
  );

  assert.equal(processes.length, 2);
  assert.deepEqual(processes[0], {
    pid: 101,
    ppid: 1,
    elapsedSeconds: 300,
    command: 'node /workspace/node_modules/vitest/vitest.mjs run'
  });
});

test('collectAncestorPids walks parent chain of current process', () => {
  const ancestors = collectAncestorPids(
    [
      { pid: 1, ppid: 0, elapsedSeconds: 1000, command: 'init' },
      { pid: 10, ppid: 1, elapsedSeconds: 100, command: 'bash' },
      { pid: 20, ppid: 10, elapsedSeconds: 10, command: 'node current.mjs' }
    ],
    20
  );

  assert.deepEqual([...ancestors].sort((a, b) => a - b), [1, 10, 20]);
});

test('selectOrphanTestProcesses only returns orphan tracked processes in the same workspace', () => {
  const workspace = '/root/.openclaw/workspace/cvg-his-v2';
  const processes = [
    { pid: 1, ppid: 0, elapsedSeconds: 1000, command: 'init', cwd: '/' },
    { pid: 10, ppid: 1, elapsedSeconds: 200, command: 'bash', cwd: workspace },
    { pid: 20, ppid: 10, elapsedSeconds: 20, command: `node ${workspace}/infra/scripts/cleanup-test-runner.mjs --kill-orphans`, cwd: workspace },
    { pid: 30, ppid: 1, elapsedSeconds: 600, command: `node ${workspace}/node_modules/vitest/vitest.mjs run --coverage --config vitest.config.ts`, cwd: workspace },
    { pid: 31, ppid: 30, elapsedSeconds: 599, command: `node ${workspace}/child-process.js`, cwd: workspace },
    { pid: 40, ppid: 9999, elapsedSeconds: 300, command: `node ${workspace}/infra/scripts/test-critical-bootstrap.mjs`, cwd: workspace },
    { pid: 60, ppid: 9998, elapsedSeconds: 300, command: `node --import tsx/esm ${workspace}/apps/api/test-fixtures/api-process.ts`, cwd: workspace },
    { pid: 50, ppid: 1, elapsedSeconds: 400, command: 'node /tmp/other-project/node_modules/vitest/vitest.mjs run', cwd: '/tmp/other-project' }
  ];

  const orphans = selectOrphanTestProcesses(processes, 20, workspace);

  assert.deepEqual(
    orphans.map(({ pid }) => pid).sort((a, b) => a - b),
    [30, 40, 60]
  );
});

test('isTrackedTestProcess rejects unrelated workspace processes', () => {
  const workspace = '/root/.openclaw/workspace/cvg-his-v2';

  assert.equal(
    isTrackedTestProcess(
      { pid: 77, ppid: 1, elapsedSeconds: 12, command: `node ${workspace}/apps/api/dist/index.js` },
      workspace
    ),
    false
  );
});

test('selectStaleTestProcesses returns tracked long-running abandoned suites', () => {
  const workspace = '/root/.openclaw/workspace/cvg-his-v2';
  const processes = [
    { pid: 1, ppid: 0, elapsedSeconds: 1000, command: 'init', cwd: '/' },
    { pid: 10, ppid: 1, elapsedSeconds: 10, command: 'bash', cwd: workspace },
    { pid: 20, ppid: 10, elapsedSeconds: 5, command: `node ${workspace}/infra/scripts/cleanup-test-runner.mjs`, cwd: workspace },
    { pid: 30, ppid: 10, elapsedSeconds: 1200, command: 'node /usr/bin/pnpm exec vitest run tests/integration/database --config vitest.integration.config.ts', cwd: workspace },
    { pid: 31, ppid: 10, elapsedSeconds: 120, command: 'node /usr/bin/pnpm exec vitest run tests/unit/api/runtime.test.ts --config vitest.config.ts', cwd: workspace }
  ];

  const stale = selectStaleTestProcesses(processes, 20, workspace, 900);

  assert.deepEqual(stale.map(({ pid }) => pid), [30]);
});
