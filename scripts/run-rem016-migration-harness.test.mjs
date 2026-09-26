import assert from 'node:assert/strict';
import test from 'node:test';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  isPinnedPostgresImage,
  writeOutput
} from './run-rem016-migration-harness.mjs';

test('migration harness accepts only full immutable sha256 image references', () => {
  assert.equal(isPinnedPostgresImage(`postgres@sha256:${'a'.repeat(64)}`), true);
  assert.equal(isPinnedPostgresImage('postgres:16'), false);
  assert.equal(isPinnedPostgresImage('postgres@sha256:deadbeef'), false);
  assert.equal(isPinnedPostgresImage(`postgres@sha256:${'g'.repeat(64)}`), false);
  assert.equal(isPinnedPostgresImage(`attacker/postgres@sha256:${'a'.repeat(64)}`), false);
  assert.equal(isPinnedPostgresImage(`docker.io/attacker/postgres@sha256:${'a'.repeat(64)}`), false);
  assert.equal(isPinnedPostgresImage(`docker.io/library/postgres@sha256:${'a'.repeat(64)}`), true);
});

test('harness report output stays in the repository and refuses traversal or overwrite', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-rem016-output-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const report = { task: 'REM-016', status: 'PASS' };

  assert.throws(() => writeOutput(root, '../outside/report.json', report), /invalid segment/);
  assert.throws(() => writeOutput(root, resolve(root, 'absolute.json'), report), /repository-relative/);

  const relativePath = writeOutput(root, 'artifacts/run.json', report);
  assert.equal(relativePath, 'artifacts/run.json');
  assert.deepEqual(JSON.parse(readFileSync(join(root, relativePath), 'utf8')), report);
  assert.throws(() => writeOutput(root, relativePath, { task: 'overwrite' }), /overwrite/);
  assert.deepEqual(JSON.parse(readFileSync(join(root, relativePath), 'utf8')), report);
});

test('harness report output refuses a symlinked directory', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-rem016-symlink-root-'));
  const outside = mkdtempSync(join(tmpdir(), 'cvg-rem016-symlink-outside-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  symlinkSync(outside, join(root, 'artifacts'), 'dir');

  assert.throws(
    () => writeOutput(root, 'artifacts/run.json', { task: 'REM-016' }),
    /symbolic link/
  );
  assert.equal(existsSync(join(outside, 'run.json')), false);
});
