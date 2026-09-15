import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  allocateFreePort,
  assertDistMatchesSources,
  assertPortFree,
  checkBinaryEnvironment,
  parseProcStarttime,
  snapshotNeighbors,
} from './run-exclusive-stack.mjs';

test('exclusive stack refuses missing private binaries with a provisioning message', async () => {
  await assert.rejects(
    async () => checkBinaryEnvironment({}),
    /apt-get download/
  );
});

test('exclusive stack allocates distinct loopback ports', async () => {
  const ports = new Set();
  for (let i = 0; i < 5; i++) ports.add(await allocateFreePort());
  assert.equal(ports.size, 5);
});

test('exclusive stack refuses a stale or tampered dist (known-bad)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvg-dist-negative-'));
  mkdirSync(join(dir, 'apps/api/dist'), { recursive: true });
  writeFileSync(join(dir, 'apps/api/dist/server.js'), 'tampered-bytes');
  await assert.rejects(
    async () => assertDistMatchesSources(
      [{ rel: 'apps/api/dist/server.js', sha256: '0'.repeat(64) }],
      dir
    ),
    /stale dist refused/
  );
  await assert.rejects(
    async () => assertDistMatchesSources(
      [{ rel: 'apps/api/dist/missing.js', sha256: '0'.repeat(64) }],
      dir
    ),
    /missing/
  );
});

test('exclusive stack accepts a matching dist (known-good)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'cvg-dist-good-'));
  mkdirSync(join(dir, 'apps/api/dist'), { recursive: true });
  writeFileSync(join(dir, 'apps/api/dist/server.js'), 'exact-bytes');
  const { createHash } = await import('node:crypto');
  const sha = createHash('sha256').update('exact-bytes').digest('hex');
  await assertDistMatchesSources([{ rel: 'apps/api/dist/server.js', sha256: sha }], dir);
});

test('exclusive stack snapshots neighbors and probes port freedom honestly', async () => {
  const snap = await snapshotNeighbors();
  assert.ok(Array.isArray(snap.postgres) && Array.isArray(snap['redis-server']));
  for (const e of [...snap.postgres, ...snap['redis-server']]) {
    assert.ok(Number.isInteger(e.pid) && e.pid > 0 && typeof e.cmd === 'string');
  }
  const free = await allocateFreePort();
  await assertPortFree('127.0.0.1', free);
  const { createServer } = await import('node:net');
  const held = createServer();
  await new Promise((resolvePromise) => held.listen(0, '127.0.0.1', () => resolvePromise(undefined)));
  const busy = held.address().port;
  await assert.rejects(async () => assertPortFree('127.0.0.1', busy), /EADDRINUSE/);
  held.close();
});

test('exclusive stack parses PID start time at field 19 (not vsize)', async () => {
  // 'my-cmd) R 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19-START 20-VSIZE ...'
  const fields = ['R', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19-START', '20-VSIZE', '21'];
  assert.equal(parseProcStarttime(`123 (my-cmd) ${fields.join(' ')}`), '19-START');
  const self = parseProcStarttime(
    (await import('node:fs')).readFileSync(`/proc/${process.pid}/stat`, 'utf8')
  );
  assert.match(self ?? '', /^[0-9]+$/);
});
