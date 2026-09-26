import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

import {
  REQUIRED_TARGET_PACK_FILES,
  validateTargetPack
} from './validate-remediation-target-pack.mjs';

const root = resolve(import.meta.dirname, '..');

function copyPackFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-remediation-target-pack-'));
  for (const relativePath of [...REQUIRED_TARGET_PACK_FILES, 'package.json']) {
    const destination = join(fixtureRoot, relativePath);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(join(root, relativePath), destination);
  }
  return fixtureRoot;
}

test('target pack validator accepts the current local preparation', () => {
  const result = validateTargetPack(root);
  assert.equal(result.status, 'PASS', result.failures.join('\n'));
});

test('target pack validator rejects a checklist with a missing target card', () => {
  const fixtureRoot = copyPackFixture();
  try {
    const runbookPath = join(fixtureRoot, 'docs/operations/REM_TARGET_CERTIFICATION_RUNBOOK.md');
    const runbook = readFileSync(runbookPath, 'utf8');
    writeFileSync(runbookPath, runbook.replaceAll('REM-025', 'REM-TARGET-REMOVED'));
    const result = validateTargetPack(fixtureRoot);
    assert.equal(result.status, 'FAIL');
    assert.match(result.failures.join('\n'), /REM-025/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});
