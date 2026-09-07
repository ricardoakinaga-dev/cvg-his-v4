import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import test from 'node:test';
import { assertCleanCheckout, cleanCheckoutEvidence } from './assert-clean-checkout.mjs';

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cvg-clean-checkout-'));
  execFileSync('git', ['init', '--quiet', root]);
  execFileSync('git', ['-C', root, 'config', 'user.email', 'test@example.invalid']);
  execFileSync('git', ['-C', root, 'config', 'user.name', 'Clean Checkout Test']);
  writeFileSync(join(root, 'tracked.txt'), 'initial\n');
  writeFileSync(join(root, '.gitignore'), 'ignored.txt\n');
  execFileSync('git', ['-C', root, 'add', 'tracked.txt', '.gitignore']);
  execFileSync('git', ['-C', root, 'commit', '--quiet', '-m', 'fixture']);
  return root;
}

test('accepts a clean checkout and returns its HEAD evidence', () => {
  const root = fixture();
  const evidence = assertCleanCheckout(root);
  assert.equal(evidence.clean, true);
  assert.match(evidence.head, /^[0-9a-f]{40}$/);
  assert.deepEqual(evidence.status, []);
});

test('rejects tracked modifications and reports their porcelain status', () => {
  const root = fixture();
  writeFileSync(join(root, 'tracked.txt'), 'changed\n');
  const evidence = cleanCheckoutEvidence(root);
  assert.equal(evidence.clean, false);
  assert.match(evidence.status.join('\n'), /tracked\.txt/);
  assert.throws(() => assertCleanCheckout(root), /checkout is not clean/);
});

test('rejects staged and untracked files while allowing ignored files', () => {
  const root = fixture();
  writeFileSync(join(root, 'staged.txt'), 'staged\n');
  writeFileSync(join(root, 'untracked.txt'), 'untracked\n');
  writeFileSync(join(root, 'ignored.txt'), 'ignored\n');
  execFileSync('git', ['-C', root, 'add', 'staged.txt']);
  const evidence = cleanCheckoutEvidence(root);
  assert.equal(evidence.clean, false);
  assert.deepEqual(evidence.status, ['A  staged.txt', '?? untracked.txt']);
});
