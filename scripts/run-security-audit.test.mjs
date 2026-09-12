import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';

import { inspectModerateAuditResult, runSecurityAudit } from './run-security-audit.mjs';

const root = resolve(import.meta.dirname, '..');

test('moderate audit command errors fail closed without treating empty output as no findings', () => {
  const result = inspectModerateAuditResult({
    status: 17,
    stdout: '',
    stderr: 'registry unavailable: token=must-not-be-echoed'
  });

  assert.equal(result.ok, false);
  assert.match(result.reason, /moderate dependency audit command/);
  assert.match(result.reason, /failing|exited with code 17|usable exit status/);
  assert.doesNotMatch(result.reason, /token=must-not-be-echoed/);
});

test('invalid moderate audit JSON is rejected without echoing registry-controlled payload', () => {
  const result = inspectModerateAuditResult({
    status: 0,
    stdout: '{"advisories":["registry-controlled-secret"]'
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'moderate dependency audit returned invalid JSON');
  assert.doesNotMatch(result.reason, /registry-controlled-secret/);
});

test('moderate advisories remain tracked debt when audit returns a valid advisory payload', () => {
  const result = inspectModerateAuditResult({
    status: 1,
    stdout: JSON.stringify({
      metadata: { vulnerabilities: { critical: 0, high: 0, moderate: 1 } },
      advisories: {
        'CVE-TEST-1': {
          module_name: 'example-package',
          severity: 'moderate',
          title: 'Tracked moderate advisory'
        }
      }
    })
  });

  assert.equal(result.ok, true);
  assert.equal(result.moderateAdvisories.length, 1);
  assert.equal(result.moderateAdvisories[0].module_name, 'example-package');
});

test('runSecurityAudit propagates a moderate command error as a failing exit status', () => {
  const errors = [];
  const result = runSecurityAudit({
    runCommand: (_command, args) => {
      if (args[0] === 'security:secrets') return { status: 0 };
      if (args[0] === 'audit' && args.includes('--audit-level=high')) return { status: 0 };
      return { status: 23, stdout: '', stderr: 'network failure' };
    },
    log: () => {},
    error: (message) => errors.push(message)
  });

  assert.equal(result, 1);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /failing closed/);
  assert.doesNotMatch(errors[0], /network failure/);
});

test('security evidence marks the delegated audit failure without persisting command output', () => {
  const bin = mkdtempSync(join(tmpdir(), 'cvg-security-audit-bin-'));
  const outputDir = mkdtempSync(join(tmpdir(), 'cvg-security-audit-evidence-'));
  const pnpmPath = join(bin, 'pnpm');
  const generator = resolve(root, 'scripts/generate-security-evidence.mjs');

  try {
    writeFileSync(
      pnpmPath,
      `#!/usr/bin/env node
if (process.argv[2] === 'security:enterprise') {
  console.error('audit payload contains registry-controlled-secret');
  process.exit(1);
}
process.exit(0);
`
    );
    chmodSync(pnpmPath, 0o755);

    const result = spawnSync(process.execPath, [generator], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env.PATH ?? ''}`,
        SECURITY_EVIDENCE_DIR: outputDir
      }
    });

    assert.notEqual(result.status, 0, result.stderr);
    const evidence = JSON.parse(readFileSync(join(outputDir, 'security-evidence.json'), 'utf8'));
    assert.equal(evidence.status, 'FAIL');
    assert.equal(evidence.securityAudit, 'FAIL');
    assert.equal(evidence.securityAuditExitCode, 1);
    assert.doesNotMatch(JSON.stringify(evidence), /registry-controlled-secret/);
  } finally {
    rmSync(bin, { recursive: true, force: true });
    rmSync(outputDir, { recursive: true, force: true });
  }
});
