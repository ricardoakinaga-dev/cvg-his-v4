import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
import { spawnSync } from 'node:child_process';
import { snapshotGeneratedArtifacts } from './lib/generated-artifact-snapshot.mjs';

function fixture(t) {
  const root = fs.mkdtempSync(join(tmpdir(), 'cvg generated ç-'));
  fs.mkdirSync(join(root, 'apps'));
  fs.mkdirSync(join(root, 'packages'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('rejects undecodable directory names rather than merging distinct byte identities', (t) => {
  const root = fixture(t);
  const prefix = Buffer.from(join(root, 'apps') + '/');
  fs.writeFileSync(
    Buffer.concat([prefix, Buffer.from('ff2e6a73', 'hex')]),
    'export const hidden=1;'
  );
  fs.writeFileSync(
    Buffer.concat([prefix, Buffer.from('efbfbd2e6a73', 'hex')]),
    'export const visible=1;'
  );
  assert.throws(() => snapshotGeneratedArtifacts(root), /encoded data/);
});

test('closes the root descriptor when its initial fstat fails', (t) => {
  const root = fixture(t);
  const original = fs.fstatSync;
  let injected = false;
  let failedFd;
  fs.fstatSync = (...args) => {
    if (!injected) {
      injected = true;
      failedFd = args[0];
      throw Object.assign(new Error('injected stat failure'), { code: 'EIO' });
    }
    return original(...args);
  };
  syncBuiltinESMExports();
  try {
    assert.throws(() => snapshotGeneratedArtifacts(root), /injected stat failure/);
  } finally {
    fs.fstatSync = original;
    syncBuiltinESMExports();
  }
  let leaked = false;
  try {
    original(failedFd);
    leaked = true;
  } catch (error) {
    assert.equal(error.code, 'EBADF');
  }
  // Keep the RED reproduction from leaving its exact resource behind.
  if (leaked) fs.closeSync(failedFd);
  assert.equal(leaked, false);
});

test('captures deterministic exact UTF8 bytes and hashes; immutable snapshots detect drift', (t) => {
  const root = fixture(t);
  fs.mkdirSync(join(root, 'packages/dist'));
  const contents = {
    'packages/dist/a space ç.js': '\uFEFFexport const a = "ação";\n',
    'packages/dist/a space ç.js.map': '{"version":3}',
    'apps/b.mjs': 'export {};',
    'apps/c.cjs': '',
    'apps/not-generated.ts': 'ignored'
  };
  for (const [name, code] of Object.entries(contents)) fs.writeFileSync(join(root, name), code);
  fs.mkdirSync(join(root, 'packages/node_modules'));
  fs.symlinkSync('/nonexistent', join(root, 'packages/node_modules/ignored.js'));
  const before = snapshotGeneratedArtifacts(root);
  assert.deepEqual(snapshotGeneratedArtifacts(root), before);
  assert.equal(Object.keys(before.files).length, 4);
  for (const [name, code] of Object.entries(contents).filter(([name]) => !name.endsWith('.ts'))) {
    const path = join(root, name),
      url = pathToFileURL(path).href;
    assert.equal(before.files[url], code);
    assert.equal(before.frozenHashes[url], createHash('sha256').update(code).digest('hex'));
    assert.equal(before.pathHashes[path], before.frozenHashes[url]);
  }
  assert.throws(() => {
    before.files.fake = 'changed';
  }, TypeError);
  fs.writeFileSync(join(root, 'apps/b.mjs'), 'export const changed=1;');
  assert.notDeepEqual(snapshotGeneratedArtifacts(root), before);
  fs.writeFileSync(join(root, 'apps/new.js'), '');
  assert.equal(Object.keys(snapshotGeneratedArtifacts(root).files).length, 5);
  fs.unlinkSync(join(root, 'apps/new.js'));
  assert.equal(Object.keys(snapshotGeneratedArtifacts(root).files).length, 4);
});

for (const mode of ['file', 'directory', 'top-directory']) {
  test(`rejects ${mode} symlink without reading its target`, (t) => {
    const root = fixture(t);
    fs.writeFileSync(join(root, 'sentinel.js'), 'outside generated scope');
    const target = mode === 'file' ? join(root, 'sentinel.js') : root;
    const link = mode === 'top-directory' ? join(root, 'apps') : join(root, 'apps/link.js');
    if (mode === 'top-directory') fs.rmdirSync(link);
    fs.symlinkSync(target, link);
    assert.throws(() => snapshotGeneratedArtifacts(root), /contains symlink/);
  });
}

test('bounds bytes, entries, depth and rejects invalid UTF8 and special files', (t) => {
  const root = fixture(t);
  fs.writeFileSync(join(root, 'apps/a.js'), '1234');
  fs.writeFileSync(join(root, 'apps/b.js'), '5678');
  assert.throws(() => snapshotGeneratedArtifacts(root, { maxFileBytes: 3 }), /byte limit/);
  assert.throws(() => snapshotGeneratedArtifacts(root, { maxTotalBytes: 7 }), /byte limit/);
  assert.throws(() => snapshotGeneratedArtifacts(root, { maxEntries: 1 }), /entry limit/);
  fs.mkdirSync(join(root, 'packages/deep'));
  assert.throws(() => snapshotGeneratedArtifacts(root, { maxDepth: 1 }), /depth limit/);
  fs.writeFileSync(join(root, 'apps/a.js'), Buffer.from([0xff]));
  assert.throws(() => snapshotGeneratedArtifacts(root), /encoded data/);
  fs.unlinkSync(join(root, 'apps/a.js'));
  const fifo = spawnSync('mkfifo', [join(root, 'apps/a.js')], { encoding: 'utf8', timeout: 1000 });
  assert.equal(fifo.status, 0, fifo.stderr);
  assert.throws(() => snapshotGeneratedArtifacts(root), /not a regular file/);
  for (const value of [0, -1, Infinity, NaN, 0.5]) {
    assert.throws(
      () => snapshotGeneratedArtifacts(root, { maxEntries: value }),
      /invalid snapshot limit/
    );
  }
});

for (const mode of ['grow', 'replace', 'replace-directory']) {
  test(`rejects ${mode} during real descriptor reading and releases descriptors`, (t) => {
    const root = fixture(t);
    const path = join(root, 'apps/a.js');
    fs.writeFileSync(path, 'export {};');
    const initialFds = fs.readdirSync('/proc/self/fd').length;
    const read = fs.readSync;
    let changed = false;
    fs.readSync = (...args) => {
      const result = read(...args);
      if (!changed) {
        changed = true;
        if (mode === 'grow') fs.appendFileSync(path, ' ');
        if (mode === 'replace') {
          fs.renameSync(path, `${path}.old`);
          fs.writeFileSync(path, 'export {};');
        }
        if (mode === 'replace-directory') {
          fs.renameSync(join(root, 'apps'), join(root, 'apps.old'));
          fs.mkdirSync(join(root, 'apps'));
        }
      }
      return result;
    };
    syncBuiltinESMExports();
    try {
      assert.throws(() => snapshotGeneratedArtifacts(root), /changed during capture/);
      assert.equal(changed, true);
    } finally {
      fs.readSync = read;
      syncBuiltinESMExports();
    }
    assert.equal(fs.readdirSync('/proc/self/fd').length, initialFds);
  });
}
