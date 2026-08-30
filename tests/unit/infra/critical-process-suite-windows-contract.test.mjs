import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

import { resolvePackageManagerInvocation } from '../../../infra/scripts/run-critical-process-suite.mjs';
import { runOwnedProcess } from '../../../infra/scripts/critical-process-suite-runtime.mjs';

const ciArtifactRoot = process.env.CRITICAL_PROCESS_ARTIFACT_DIR
  ? resolve(process.env.CRITICAL_PROCESS_ARTIFACT_DIR)
  : null;

function createContractArtifactDirectory(prefix) {
  if (!ciArtifactRoot) return mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(ciArtifactRoot, { recursive: true });
  return mkdtempSync(join(ciArtifactRoot, prefix));
}

function cleanupContractArtifactDirectory(artifactDirectory, passed) {
  if (!ciArtifactRoot || passed) rmSync(artifactDirectory, { recursive: true, force: true });
}

test(
  'Windows package-manager invocation is executable without shell=true',
  { skip: process.platform !== 'win32' },
  () => {
    const invocation = resolvePackageManagerInvocation(['--version']);
    const result = spawnSync(invocation.command, invocation.args, {
      encoding: 'utf8',
      shell: false,
      windowsHide: true
    });

    assert.equal(result.status, 0, result.stderr || result.error?.message);
    assert.match(result.stdout, /\d+\.\d+\.\d+/);
  }
);

test(
  'Windows owned-process timeout reaps the descendant tree',
  { skip: process.platform !== 'win32' },
  async () => {
    const artifactDirectory = createContractArtifactDirectory('cvg-runner-windows-tree-');
    const readyPath = join(artifactDirectory, 'descendant-ready');
    const markerPath = join(artifactDirectory, 'descendant-alive');
    let running;
    let settled = false;
    let passed = false;
    const descendantScript =
      "const fs = require('node:fs'); fs.writeFileSync(process.env.RUNNER_READY, 'ready'); setTimeout(() => fs.writeFileSync(process.env.RUNNER_MARKER, 'alive'), 2500);";
    const parentScript = [
      "const { spawn } = require('node:child_process');",
      "spawn(process.execPath, ['-e', process.env.RUNNER_DESCENDANT_SCRIPT], { stdio: 'ignore', windowsHide: true });",
      'setInterval(() => {}, 1000);'
    ].join(' ');

    try {
      running = runOwnedProcess({
        command: process.execPath,
        args: ['-e', parentScript],
        env: {
          ...process.env,
          RUNNER_READY: readyPath,
          RUNNER_MARKER: markerPath,
          RUNNER_DESCENDANT_SCRIPT: descendantScript
        },
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'windows-tree-contract'
      });

      const readyDeadline = Date.now() + 500;
      while (!existsSync(readyPath) && Date.now() < readyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(existsSync(readyPath), true);
      const outcome = await running;
      settled = true;
      await new Promise((resolve) => setTimeout(resolve, 2_000));
      assert.equal(outcome.kind, 'timeout');
      assert.equal(outcome.cleanupComplete, true);
      assert.equal(existsSync(markerPath), false);
      passed = true;
    } finally {
      if (running && !settled) await running;
      cleanupContractArtifactDirectory(artifactDirectory, passed);
    }
  }
);

test(
  'Windows owned-process exit remains typed',
  { skip: process.platform !== 'win32' },
  async () => {
    const artifactDirectory = createContractArtifactDirectory('cvg-runner-windows-exit-');
    let passed = false;
    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', 'process.exit(17)'],
        env: {},
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'windows-exit-contract'
      });

      assert.deepEqual(
        { kind: outcome.kind, status: outcome.status, cleanupComplete: outcome.cleanupComplete },
        { kind: 'exit', status: 17, cleanupComplete: true }
      );
      passed = true;
    } finally {
      cleanupContractArtifactDirectory(artifactDirectory, passed);
    }
  }
);

test(
  'Windows owned-process preserves a valid 259 exit code',
  { skip: process.platform !== 'win32' },
  async () => {
    const artifactDirectory = createContractArtifactDirectory('cvg-runner-windows-exit-259-');
    let passed = false;
    try {
      const outcome = await runOwnedProcess({
        command: process.execPath,
        args: ['-e', 'process.exit(259)'],
        env: {},
        timeoutMs: 1_000,
        artifactDirectory,
        label: 'windows-exit-259-contract'
      });

      assert.deepEqual(
        { kind: outcome.kind, status: outcome.status, cleanupComplete: outcome.cleanupComplete },
        { kind: 'exit', status: 259, cleanupComplete: true }
      );
      passed = true;
    } finally {
      cleanupContractArtifactDirectory(artifactDirectory, passed);
    }
  }
);

test(
  'Windows owned-process exit reaps the descendant tree',
  { skip: process.platform !== 'win32' },
  async () => {
    const artifactDirectory = createContractArtifactDirectory('cvg-runner-windows-exit-tree-');
    const readyPath = join(artifactDirectory, 'descendant-ready');
    const markerPath = join(artifactDirectory, 'descendant-alive');
    let running;
    let settled = false;
    let passed = false;
    const descendantScript =
      "const fs = require('node:fs'); fs.writeFileSync(process.env.RUNNER_READY, 'ready'); setTimeout(() => fs.writeFileSync(process.env.RUNNER_MARKER, 'alive'), 2500);";
    const parentScript = [
      "const { spawn } = require('node:child_process');",
      "const fs = require('node:fs');",
      "spawn(process.execPath, ['-e', process.env.RUNNER_DESCENDANT_SCRIPT], { stdio: 'ignore', windowsHide: true });",
      'const waitForReady = () => fs.existsSync(process.env.RUNNER_READY) ? setTimeout(() => process.exit(17), 50) : setTimeout(waitForReady, 10);',
      'waitForReady();'
    ].join(' ');

    try {
      running = runOwnedProcess({
        command: process.execPath,
        args: ['-e', parentScript],
        env: {
          ...process.env,
          RUNNER_READY: readyPath,
          RUNNER_MARKER: markerPath,
          RUNNER_DESCENDANT_SCRIPT: descendantScript
        },
        timeoutMs: 2_000,
        artifactDirectory,
        label: 'windows-exit-tree-contract'
      });

      const readyDeadline = Date.now() + 500;
      while (!existsSync(readyPath) && Date.now() < readyDeadline) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      assert.equal(existsSync(readyPath), true);
      const outcome = await running;
      settled = true;
      await new Promise((resolve) => setTimeout(resolve, 3_000));
      assert.equal(outcome.kind, 'exit');
      assert.equal(outcome.status, 17);
      assert.equal(outcome.cleanupComplete, true);
      assert.equal(existsSync(markerPath), false);
      passed = true;
    } finally {
      if (running && !settled) await running;
      cleanupContractArtifactDirectory(artifactDirectory, passed);
    }
  }
);
