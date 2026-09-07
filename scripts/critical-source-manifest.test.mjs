import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { resolveContainedPath } from './lib/root-contained-path.mjs';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/engineering/critical-coverage-scope.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('every active critical source exists and matches its frozen identity', () => {
  const errors = [];
  for (const file of manifest.files) {
    const path = resolveContainedPath(root, file.path);
    if (!path.ok) errors.push(`${file.path}: ${path.reason}`);
    else if (hash(readFileSync(path.realpath)) !== file.sha256) errors.push(`${file.path}: hash mismatch`);
  }
  assert.deepEqual(errors, []);
  assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
});

test('retired compiler copies retain their canonical source and every component', () => {
  const active = new Map(manifest.files.map(file => [file.path, file]));
  const retiredPaths = new Set();
  for (const entry of manifest.retiredGeneratedArtifacts ?? []) {
    assert.match(entry.path, /^packages\/db\/src\/schema\/[^/]+\.js$/);
    assert.equal(entry.canonicalPath, entry.path.slice(0, -3) + '.ts');
    assert.equal(active.has(entry.path), false, 'compiler output must not be counted as an original source');
    assert.equal(retiredPaths.has(entry.path), false);
    retiredPaths.add(entry.path);
    const canonical = active.get(entry.canonicalPath);
    assert.ok(canonical, `canonical source lost: ${entry.canonicalPath}`);
    assert.ok(entry.components.length > 0);
    for (const component of entry.components) assert.ok(canonical.components.includes(component));
    assert.equal(canonical.applicability, 'javascript-metrics');
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.match(entry.historicalMapSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.historicalHead, /^[a-f0-9]{40}$/);
  }
});
