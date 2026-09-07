import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  openSync,
  closeSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
  renameSync,
  readdirSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readPinnedProcessRecords } from './lib/pinned-process-records.mjs';

test('pinned records stream exact UTF8 with caller-owned descriptor and strict budgets', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-pinned-records-'));
  writeFileSync(join(directory, 'coverage-1-1-0.json'), '{"emoji":"😀"}');
  writeFileSync(join(directory, 'executed-script-1-0-1.json'), '{"code":"x();"}');
  const descriptor = openSync(directory, 'r');
  try {
    const before = readdirSync('/proc/self/fd').length;
    assert.deepEqual(
      [...readPinnedProcessRecords(descriptor, 'reports')],
      [{ name: 'coverage-1-1-0.json', text: '{"emoji":"😀"}' }]
    );
    assert.equal([...readPinnedProcessRecords(descriptor, 'observations')].length, 1);
    assert.throws(
      () => [...readPinnedProcessRecords(descriptor, 'reports', { maxBytes: 1 })],
      /byte budget/
    );
    assert.throws(
      () => [...readPinnedProcessRecords(descriptor, 'reports', { maxRecords: 1 })],
      /record budget/
    );
    assert.equal(readdirSync('/proc/self/fd').length, before);
  } finally {
    closeSync(descriptor);
  }
});

const snapshotName = 'instrumented-42-3-12345678-1234-1234-1234-123456789abc-0.json';

test('instrumented snapshots use a separate namespace and retain the original directory descriptor', () => {
  const parent = mkdtempSync(join(tmpdir(), 'cvg-pinned-instrumented-'));
  const directory = join(parent, 'records');
  mkdirSync(directory);
  writeFileSync(join(directory, snapshotName), '{"counter":1}');
  const descriptor = openSync(directory, 'r');
  try {
    renameSync(directory, join(parent, 'original'));
    mkdirSync(directory);
    writeFileSync(join(directory, snapshotName), '{"counter":999}');
    assert.deepEqual(
      [...readPinnedProcessRecords(descriptor, 'instrumented')],
      [{ name: snapshotName, text: '{"counter":1}' }]
    );
    assert.throws(() => [...readPinnedProcessRecords(descriptor, 'reports')], /unexpected/);
    writeFileSync(join(parent, 'original', 'coverage-42-1-3.json'), '{}');
    assert.throws(() => [...readPinnedProcessRecords(descriptor, 'instrumented')], /unexpected/);
  } finally {
    closeSync(descriptor);
  }
});

for (const mode of ['symlink', 'directory', 'utf8', 'partial', 'invalid-generation', 'budget'])
  test(`instrumented pinned records reject ${mode}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'cvg-pinned-snapshot-invalid-'));
    const path = join(directory, snapshotName);
    if (mode === 'symlink') symlinkSync('/dev/null', path);
    else if (mode === 'directory') mkdirSync(path);
    else if (mode === 'utf8') writeFileSync(path, Buffer.from([0xff]));
    else if (mode === 'partial') writeFileSync(`${path}.tmp`, '{}');
    else if (mode === 'invalid-generation')
      writeFileSync(join(directory, 'instrumented-42-3-invalid-0.json'), '{}');
    else writeFileSync(path, '{"counter":1}');
    const descriptor = openSync(directory, 'r');
    try {
      const before = readdirSync('/proc/self/fd').length;
      const expected =
        mode === 'symlink' || mode === 'directory'
          ? /regular file/
          : mode === 'utf8'
            ? /encoded data/
            : mode === 'budget'
              ? /byte budget/
              : /unexpected/;
      assert.throws(
        () => [...readPinnedProcessRecords(descriptor, 'instrumented', { maxFileBytes: 2 })],
        expected
      );
      assert.equal(readdirSync('/proc/self/fd').length, before);
    } finally {
      closeSync(descriptor);
    }
  });

for (const mode of ['symlink', 'directory', 'utf8', 'unexpected'])
  test(`pinned raw records reject ${mode}`, () => {
    const directory = mkdtempSync(join(tmpdir(), 'cvg-pinned-records-invalid-'));
    const file = join(directory, 'coverage-1-1-0.json');
    if (mode === 'symlink') symlinkSync('/dev/null', file);
    else if (mode === 'directory') mkdirSync(file);
    else if (mode === 'utf8') writeFileSync(file, Buffer.from([0xff]));
    else writeFileSync(join(directory, 'unknown.json'), '{}');
    const descriptor = openSync(directory, 'r');
    try {
      assert.throws(() => [...readPinnedProcessRecords(descriptor, 'reports')]);
    } finally {
      closeSync(descriptor);
    }
  });
