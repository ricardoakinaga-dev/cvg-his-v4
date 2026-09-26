#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageName = '@cvg-his-v2/shared-rate-limiter';
const testFile = resolve(root, 'packages/shared/rate-limiter/dist/rate-limiter.test.js');
const packageManager = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: 'utf8',
    ...options
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

if (!process.env.REDIS_RATE_LIMITER_TEST_URL) {
  console.error('REDIS_RATE_LIMITER_TEST_URL is required for the mandatory Redis shard');
  process.exitCode = 1;
} else {
  const build = run(packageManager, ['--filter', packageName, 'run', 'build']);
  if (build.status !== 0) {
    process.exitCode = build.status ?? 1;
  } else {
    const test = run(process.execPath, ['--test', '--test-reporter', 'tap', testFile]);
    const output = `${test.stdout ?? ''}\n${test.stderr ?? ''}`;
    if (test.status !== 0) {
      process.exitCode = test.status ?? 1;
    } else if (!/\n# skipped 0\r?\n/.test(output) || !/\n# todo 0\r?\n/.test(output)) {
      console.error('mandatory Redis shard did not prove zero skipped/todo tests');
      process.exitCode = 1;
    } else {
      console.log('REDIS_RATE_LIMITER_SHARD PASS: zero skipped/todo tests');
    }
  }
}

export { run };
