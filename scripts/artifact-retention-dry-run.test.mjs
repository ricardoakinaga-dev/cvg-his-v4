import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, resolve } from 'node:path';
import test from 'node:test';
import { buildDryRunReport, loadPolicy, runCli } from './artifact-retention-dry-run.mjs';

function fixture(t) {
  const root = mkdtempSync(resolve(tmpdir(), 'artifact-retention-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const directory of [
    'artifacts/remediation',
    'artifacts/unclassified',
    'test-results/active-run',
    'test-results/old-run',
    'coverage'
  ])
    mkdirSync(resolve(root, directory), { recursive: true });
  writeFileSync(resolve(root, 'artifacts/remediation/evidence.json'), '{"active":true}\n');
  writeFileSync(resolve(root, 'artifacts/unclassified/unknown.log'), 'unknown\n');
  writeFileSync(resolve(root, 'test-results/active-run/metadata.json'), '{"active":true}\n');
  writeFileSync(resolve(root, 'test-results/old-run/trace.log'), 'old\n');
  writeFileSync(resolve(root, 'coverage/old.json'), '{}\n');
  const old = new Date('2026-01-01T00:00:00Z');
  for (const path of ['test-results/old-run/trace.log', 'coverage/old.json']) {
    const absolute = resolve(root, path);
    const mode = statSync(absolute).mode;
    // Keep the fixture old without relying on the host clock.
    utimesSync(absolute, old, old);
    assert.equal(statSync(absolute).mode, mode);
  }
  return root;
}

test('policy is fail-closed and classifies managed roots', () => {
  const policy = loadPolicy();
  assert.equal(policy.schema_version, 1);
  assert.equal(policy.protection_rules.unknown_class_is_protected, true);
  assert.ok(policy.classes.some((item) => item.id === 'active-evidence' && item.protected));
  assert.ok(
    policy.classes.some((item) => item.id === 'generated-run' && item.retention_days === 14)
  );
});

test('dry-run proposes only expired unprotected files and preserves active or unknown evidence', (t) => {
  const root = fixture(t);
  const report = buildDryRunReport({ rootDir: root, now: new Date('2026-09-22T00:00:00Z') });
  assert.equal(report.mode, 'dry-run');
  assert.equal(report.protection.deletion_applied, false);
  assert.equal(report.protection.protected_files_not_candidates, true);
  assert.deepEqual(
    report.candidates.map((item) => item.path),
    ['coverage/old.json', 'test-results/old-run/trace.log']
  );
  assert.ok(report.totals.protected_files >= 3);
  assert.equal(existsSync(resolve(root, 'artifacts/remediation/evidence.json')), true);
  assert.equal(existsSync(resolve(root, 'test-results/active-run/metadata.json')), true);
  assert.equal(existsSync(resolve(root, 'artifacts/unclassified/unknown.log')), true);
});

test('quota pressure selects oldest unprotected files only until excess is covered', (t) => {
  const root = mkdtempSync(resolve(tmpdir(), 'artifact-retention-quota-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = resolve(root, 'test-results/quota-run');
  mkdirSync(directory, { recursive: true });
  const oldest = resolve(directory, 'oldest.log');
  const newer = resolve(directory, 'newer.log');
  writeFileSync(oldest, 'old!');
  writeFileSync(newer, 'new!');
  const oldMtime = new Date('2026-09-15T00:00:00Z');
  const newerMtime = new Date('2026-09-16T00:00:00Z');
  utimesSync(oldest, oldMtime, oldMtime);
  utimesSync(newer, newerMtime, newerMtime);

  const policy = structuredClone(loadPolicy());
  policy.managed_roots = ['test-results'];
  policy.classes.find((item) => item.id === 'generated-run').quota_bytes = 4;
  const report = buildDryRunReport({
    rootDir: root,
    policy,
    now: new Date('2026-09-22T00:00:00Z')
  });

  assert.deepEqual(
    report.candidates.map(({ path, reasons }) => ({ path, reasons })),
    [{ path: 'test-results/quota-run/oldest.log', reasons: ['quota-excess'] }]
  );
  assert.equal(report.classes.find((item) => item.id === 'generated-run').quota_exceeded, true);
  assert.equal(report.protection.deletion_applied, false);
  assert.equal(existsSync(oldest), true);
  assert.equal(existsSync(newer), true);
});

test('CLI refuses an implicit cleanup mode and can emit a bounded JSON report', (t) => {
  assert.throws(() => runCli([]), /--dry-run/);
  const root = fixture(t);
  const output = resolve(root, 'report.json');
  const report = runCli([
    '--dry-run',
    '--root',
    root,
    '--now',
    '2026-09-22T00:00:00Z',
    '--max-candidates',
    '1',
    '--output',
    output
  ]);
  assert.equal(report.candidates.length, 1);
  assert.equal(JSON.parse(readFileSync(output, 'utf8')).totals.candidates, 2);
  assert.equal(existsSync(resolve(root, 'test-results/old-run/trace.log')), true);
  assert.equal(report.root, '<scan-root>');
  assert.equal(JSON.stringify(report).includes(root), false);
});

test('CLI refuses outputs outside the scan root and refuses to overwrite existing files', (t) => {
  const root = fixture(t);
  const outside = resolve(root, '..', `${basename(root)}-outside.json`);
  assert.throws(
    () => runCli(['--dry-run', '--root', root, '--output', outside]),
    /inside the scan root/
  );
  assert.equal(existsSync(outside), false);

  const existing = resolve(root, 'report-existing.json');
  writeFileSync(existing, 'preserve-this-content\n');
  assert.throws(
    () => runCli(['--dry-run', '--root', root, '--output', existing]),
    /overwrite an existing path/
  );
  assert.equal(readFileSync(existing, 'utf8'), 'preserve-this-content\n');
});

test('managed roots cannot traverse a symlink to an external directory', (t) => {
  const root = fixture(t);
  const outside = mkdtempSync(resolve(tmpdir(), 'artifact-retention-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  writeFileSync(resolve(outside, 'external.log'), 'external evidence\n');
  rmSync(resolve(root, 'artifacts'), { recursive: true, force: true });
  symlinkSync(outside, resolve(root, 'artifacts'), 'dir');

  const policy = { ...loadPolicy(), managed_roots: ['artifacts'] };
  const report = buildDryRunReport({ rootDir: root, policy });

  assert.equal(report.roots[0]?.files, 0);
  assert.ok(report.roots[0]?.errors.includes('managed-root-symlink:artifacts'));
  assert.equal(JSON.stringify(report).includes(outside), false);
});

test('policy paths must stay inside the scan root', (t) => {
  const root = fixture(t);
  const policy = { ...loadPolicy(), managed_roots: ['../'] };

  assert.throws(() => buildDryRunReport({ rootDir: root, policy }), /inside the scan root/);
});
