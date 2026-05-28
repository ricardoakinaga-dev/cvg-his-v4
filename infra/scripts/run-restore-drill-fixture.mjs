#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: false,
  });

  if (result.status !== 0) {
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    throw new Error(`${command} ${args.join(' ')} failed${output ? `: ${output}` : ''}`);
  }

  return result;
}

try {
  const fixture = run('node', ['infra/scripts/create-restore-drill-fixture.mjs'], { capture: true });
  const bundleDir = fixture.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .at(-1);

  if (!bundleDir || !existsSync(bundleDir)) {
    throw new Error(`restore drill fixture bundle was not created: ${bundleDir ?? '<empty>'}`);
  }

  const reportDir = process.env.RESTORE_DRILL_REPORT_DIR;
  const args = ['infra/scripts/restore-drill-v2.sh', bundleDir];
  if (reportDir) {
    args.push('--report-dir', reportDir);
  }

  run('bash', args);

  const resolvedReportDir = reportDir || '';
  const reportPath = resolvedReportDir ? join(resolvedReportDir, 'restore-drill-report.json') : '';
  if (reportPath && existsSync(reportPath)) {
    console.log(`RESTORE_DRILL_REPORT=${reportPath}`);
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
