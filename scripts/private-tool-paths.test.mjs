import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { resolvePrivateToolPaths } from './lib/private-tool-paths.mjs';

test('private tool resolution preserves executable alias argv0 while canonicalizing its parent', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-private-tools-'));
  const directory = join(root, 'actual');
  mkdirSync(directory);
  symlinkSync(directory, join(root, 'parent-link'));
  symlinkSync(process.execPath, join(directory, 'server-alias'));
  const supplied = {
    postgresBin: directory,
    postgresShare: directory,
    redisServer: join(root, 'parent-link', 'server-alias'),
    redisCli: process.execPath
  };
  const result = resolvePrivateToolPaths(supplied);
  assert.equal(result.redisServer, join(directory, 'server-alias'));
  assert.notEqual(result.redisServer, realpathSync(result.redisServer));
  assert.equal(
    execFileSync(result.redisServer, ['-e', 'process.stdout.write(process.argv0)'], {
      encoding: 'utf8'
    }),
    result.redisServer
  );
  assert.equal(supplied.redisServer, join(root, 'parent-link', 'server-alias'));
  writeFileSync(join(directory, 'not-executable'), '{}', { mode: 0o600 });
  assert.throws(() =>
    resolvePrivateToolPaths({ ...supplied, redisServer: join(directory, 'not-executable') })
  );
  assert.throws(() => resolvePrivateToolPaths({ ...supplied, redisServer: directory }));
  assert.throws(() => resolvePrivateToolPaths({ ...supplied, postgresShare: process.execPath }));
  assert.throws(() => resolvePrivateToolPaths({ ...supplied, redisCli: 'node' }));
});
