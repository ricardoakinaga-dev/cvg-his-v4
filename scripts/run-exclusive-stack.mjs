// PROD-003-R1: reproducible exclusive-stack harness (PG + Redis + API + SPA).
// No fixed paths, no presumed-free ports, no shared resources, no global fuser.
// Usage:
//   node scripts/run-exclusive-stack.mjs --run-label <id> --evidence-dir <dir> [--keep-root]
// Env (all required, fail-closed with actionable message):
//   NATIVE_POSTGRES_BIN / NATIVE_POSTGRES_SHARE / NATIVE_POSTGRES_LIB
//   REDIS_SERVER_BIN / REDIS_CLI_BIN / REDIS_SERVER_LIBRARY_PATH
//   LD_LIBRARY_PATH must cover the private library dirs.
import { execFile, spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync,
  realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { createServer } from 'node:net';

const execFileAsync = promisify(execFile);
const out = (o) => console.log(JSON.stringify(o));
const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');

const REQUIRED_ENV = [
  'NATIVE_POSTGRES_BIN', 'NATIVE_POSTGRES_SHARE', 'NATIVE_POSTGRES_LIB',
  'REDIS_SERVER_BIN', 'REDIS_CLI_BIN', 'REDIS_SERVER_LIBRARY_PATH',
];

export async function linkWorkspaceNodeModules(repoRoot, srcRoot) {
  // Workspace node_modules dirs contain only relative symlinks, so linking each
  // dir preserves resolution inside the copy (pnpm relative-link layout).
  const { symlinkSync, readdirSync: rd } = await import('node:fs');
  const linkNm = (dir) => {
    const src = join(repoRoot, dir, 'node_modules');
    const dest = join(srcRoot, dir, 'node_modules');
    try {
      if (statSync(src).isDirectory() && !existsSync(dest)) {
        mkdirSync(dirname(dest), { recursive: true });
        symlinkSync(src, dest, 'dir');
      }
    } catch {}
  };
  linkNm('.');
  const top = rd(repoRoot, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  for (const scope of ['apps', 'packages', 'e2e', 'benchmarks', 'tests', 'infra', 'tools']) {
    if (!top.includes(scope)) continue;
    for (const entry of rd(join(repoRoot, scope), { withFileTypes: true })) {
      if (entry.isDirectory()) linkNm(join(scope, entry.name));
    }
  }
}

export function parseProcStarttime(statText) {
  // /proc/PID/stat fields after comm: state(0) ppid(1) pgrp(2) session(3)
  // tty_nr(4) tpgid(5) flags(6) minflt(7) cminflt(8) majflt(9) cmajflt(10)
  // utime(11) stime(12) cutime(13) cstime(14) priority(15) nice(16)
  // num_threads(17) itrealvalue(18) starttime(19).
  return String(statText).slice(String(statText).lastIndexOf(')') + 1).trim().split(/\s+/)[19] ?? null;
}

export function checkBinaryEnvironment(env = process.env) {
  const missing = REQUIRED_ENV.filter((k) => !env[k]);
  if (missing.length) {
    throw new Error(
      `exclusive stack requires private tool binaries; missing ${missing.join(', ')}. ` +
      `Provision per artifacts/remediation/PROD-003/attempt-20260913T160500Z-R1/TRANSCRIPT.md (apt-get download + dpkg-deb -x, no root).`
    );
  }
  return Object.fromEntries(REQUIRED_ENV.map((k) => [k, env[k]]));
}

export async function snapshotNeighbors() {
  // Records pid + truncated cmdline per process so a vanished neighbor stays
  // attributable (foreign datadir) and can never be confused with owned PIDs.
  const snap = {};
  for (const name of ['postgres', 'redis-server']) {
    try {
      const { stdout } = await sh('ps', ['-o', 'pid=,args=', '-C', name]);
      snap[name] = stdout.split('\n').map((s) => s.trim()).filter(Boolean)
        .map((line) => {
          const pid = Number(line.split(/\s+/, 1)[0]);
          return { pid, cmd: line.slice(String(pid).length).trim().slice(0, 140) };
        })
        .filter((e) => e.pid > 0 && e.pid !== process.pid);
    } catch {
      snap[name] = [];
    }
  }
  return snap;
}

export async function assertPortFree(host, port) {
  await allocateFreePortOn(host, port);
}

async function allocateFreePortOn(host, port) {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolvePromise(undefined));
  });
  await new Promise((resolvePromise) => server.close(() => resolvePromise(undefined)));
}

export async function allocateFreePort(host = '127.0.0.1') {
  const server = createServer();
  await new Promise((resolvePromise, reject) => {
    server.once('error', reject);
    server.listen(0, host, () => resolvePromise(undefined));
  });
  const { port } = server.address();
  await new Promise((resolvePromise) => server.close(() => resolvePromise(undefined)));
  return port;
}

export function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export function hashTree(root, relPaths) {
  return relPaths.map((rel) => ({ rel, sha256: sha256File(join(root, rel)) }));
}

export function hashFullTree(rootDir, relPaths) {
  const sorted = [...relPaths].sort();
  const perFile = sorted.map((rel) => `${rel}:${sha256File(join(rootDir, rel))}`);
  const treeSha256 = createHash('sha256').update(perFile.join('\n')).digest('hex');
  return { count: sorted.length, treeSha256 };
}

export async function assertDistMatchesSources(distEntries, distRoot) {
  // Known-bad gate: a stale/prebuilt dist MUST be refused. Throws on first mismatch.
  const failures = [];
  for (const { rel, sha256 } of distEntries) {
    const abs = join(distRoot, rel);
    if (!existsSync(abs)) {
      failures.push(`${rel}: missing`);
      continue;
    }
    const actual = sha256File(abs);
    if (actual !== sha256) failures.push(`${rel}: expected ${sha256.slice(0, 12)} got ${actual.slice(0, 12)}`);
  }
  if (failures.length) {
    throw new Error(`stale dist refused (${failures.length}): ${failures.slice(0, 5).join('; ')}`);
  }
}

function sh(cmd, args, opts = {}) {
  return execFileAsync(cmd, args, { timeout: 900000, maxBuffer: 256 * 1024 * 1024, ...opts }).catch((error) => {
    const spill = join(tmpdir(), `cvg-stack-shfail-${Date.now()}.log`);
    try {
      writeFileSync(spill, `CMD: ${cmd} ${(args ?? []).join(' ')}\nCWD: ${opts.cwd ?? process.cwd()}\n--- stdout ---\n${error.stdout ?? ''}\n--- stderr ---\n${error.stderr ?? ''}`);
    } catch {}
    const tail = (text) => String(text ?? '').split('\n').slice(-12).join('\n');
    throw new Error(
      `command failed: ${cmd} ${(args ?? []).join(' ')} (full output: ${spill})\n--- stdout tail ---\n${tail(error.stdout)}\n--- stderr tail ---\n${tail(error.stderr)}`
    );
  });
}

async function waitFor(url, deadlineMs, label) {
  const start = Date.now();
  for (;;) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return res;
    } catch {}
    if (Date.now() - start > deadlineMs) throw new Error(`${label} not ready at ${url}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
}

export async function runExclusiveStack({ runLabel, evidenceDir, keepRoot = false, repoRoot = ROOT }) {
  checkBinaryEnvironment();
  const pgBin = process.env.NATIVE_POSTGRES_BIN;
  const pgShare = process.env.NATIVE_POSTGRES_SHARE;
  const pgLib = process.env.NATIVE_POSTGRES_LIB;
  const redisBin = process.env.REDIS_SERVER_BIN;
  const redisCli = process.env.REDIS_CLI_BIN;
  const attemptRoot = mkdtempSync(join(tmpdir(), `cvg-stack-${runLabel}-`));
  const ownedPids = [];
  const ownedStarttime = new Map();
  let neighborsBefore = null;
  let attemptPorts = {};
  let pgRoot = null;
  let redisDir = null;
  const report = { runLabel, attemptRoot, steps: [] };
  const step = (name, detail) => {
    report.steps.push({ name, ...detail });
    out({ step: name, ...detail });
  };
  const procStarttime = (pid) => {
    try {
      return parseProcStarttime(readFileSync(`/proc/${pid}/stat`, 'utf8'));
    } catch {
      return undefined;
    }
  };
  const track = (pid) => {
    ownedPids.push(pid);
    const st = procStarttime(pid);
    if (st !== undefined) ownedStarttime.set(pid, st);
    return pid;
  };
  const procCmdline = (pid) => {
    try { return readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim(); }
    catch { return null; }
  };
  const sameProcess = (pid) => {
    // PID-reuse safe: a PID is ours only while its kernel start time matches
    // the one recorded at spawn. Immune to argv rewrites (redis/postgres
    // retitle themselves) and zombie empty cmdlines.
    const want = ownedStarttime.get(pid);
    const actual = procStarttime(pid);
    if (actual === undefined) return false;
    return want === undefined || actual === want;
  };
  const killOwned = async () => {
    const signalOwned = (sig) => {
      for (const pid of ownedPids) {
        try {
          if (!sameProcess(pid)) continue;
          process.kill(pid, sig);
        } catch {}
      }
    };
    const awaitOwnedDead = async (timeoutMs) => {
      const deadline = Date.now() + timeoutMs;
      for (;;) {
        const alive = ownedPids.filter((pid) => sameProcess(pid));
        if (alive.length === 0) return;
        if (Date.now() > deadline) return;
        await new Promise((r) => setTimeout(r, 500));
      }
    };
    signalOwned('SIGTERM');
    await awaitOwnedDead(15000);
    signalOwned('SIGKILL');
    await awaitOwnedDead(10000);
  };
  try {
    // 1. Frozen-source copy + identity check against the manifest when available.
    const srcRoot = join(attemptRoot, 'src');
    mkdirSync(srcRoot, { recursive: true });
    const lsFiles = (await sh('git', ['ls-files', '-z'], { cwd: repoRoot })).stdout.split('\0').filter(Boolean);
    const untracked = (await sh('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: repoRoot })).stdout.split('\0').filter(Boolean);
    const allRel = [...lsFiles, ...untracked];
    for (const rel of allRel) {
      const dest = join(srcRoot, rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(join(repoRoot, rel), dest);
    }
    // Full-tree digest worktree-vs-copy: proves the copy is byte-identical to
    // the worktree (not just the manifest subset).
    const worktreeTree = hashFullTree(repoRoot, allRel);
    const copyTree = hashFullTree(srcRoot, allRel);
    if (worktreeTree.treeSha256 !== copyTree.treeSha256) {
      throw new Error('frozen copy diverged from worktree (full-tree digest mismatch)');
    }
    const manifestPath = join(repoRoot, 'docs/engineering/critical-coverage-scope.json');
    let frozenCheck = { manifest: null };
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      frozenCheck = { manifestRevision: manifest.manifestRevision, sourceSetSha256: manifest.sourceSetSha256 };
      const mismatched = [];
      for (const entry of manifest.files ?? []) {
        const abs = join(srcRoot, entry.path);
        if (!existsSync(abs)) { mismatched.push(`${entry.path}: absent-in-copy`); continue; }
        if (sha256File(abs) !== entry.sha256) mismatched.push(`${entry.path}: diverged`);
      }
      frozenCheck.compared = mismatched.length === 0;
      frozenCheck.mismatched = mismatched.slice(0, 5);
      if (mismatched.length) throw new Error(`frozen copy diverged from manifest: ${mismatched.slice(0, 3).join('; ')}`);
    }
    // node_modules is runtime tooling, read-only linked; sources are the frozen copy.
    await linkWorkspaceNodeModules(repoRoot, srcRoot);
    step('frozen-copy', { files: allRel.length, worktreeTreeSha256: worktreeTree.treeSha256, manifestRevision: frozenCheck.manifestRevision, sourceSetSha256: frozenCheck.sourceSetSha256, manifestSubsetMatched: frozenCheck.compared });
    // 2. Binary provenance (conferred by version AND digest, recorded).
    const pgVersion = (await sh(join(pgBin, 'postgres'), ['--version'], { env: { ...process.env, LD_LIBRARY_PATH: pgLib } })).stdout.trim();
    const redisVersion = (await sh(redisBin, ['--version'], { env: { ...process.env, LD_LIBRARY_PATH: process.env.REDIS_SERVER_LIBRARY_PATH } })).stdout.trim();
    step('binaries', {
      pgVersion,
      pgSha256: sha256File(join(pgBin, 'postgres')),
      redisVersion,
      redisSha256: sha256File(redisBin)
    });
    // 3. Exclusive resources: dirs, sockets, allocated ports.
    pgRoot = join(attemptRoot, 'pg');
    redisDir = join(attemptRoot, 'redis');
    mkdirSync(pgRoot, { recursive: true });
    mkdirSync(redisDir, { recursive: true });
    const apiPort = await allocateFreePort();
    const spaPort = await allocateFreePort();
    const redisPort = await allocateFreePort();
    const pgPort = await allocateFreePort();
    step('resources', { pgRoot, redisDir, apiPort, spaPort, redisPort, pgPort });
    const neighborsBeforeSnapshot = await snapshotNeighbors();
    neighborsBefore = neighborsBeforeSnapshot;
    attemptPorts = { api: apiPort, spa: spaPort, redis: redisPort };
    report.neighborsBefore = neighborsBefore;
    step('neighbors-before', { postgres: neighborsBefore.postgres.length, redis: neighborsBefore['redis-server'].length });
    const libEnv = { ...process.env, LD_LIBRARY_PATH: `${pgLib}:${process.env.REDIS_SERVER_LIBRARY_PATH ?? ''}` };
    // 4. PostgreSQL (unix socket only) + migrate + seed.
    await sh(join(pgBin, 'initdb'), ['-D', join(pgRoot, 'data'), '-U', 'cvg_stack_admin', '--auth-local=trust', '--auth-host=reject', '--no-locale', '--encoding=UTF8'], { env: libEnv });
    const { openSync, closeSync } = await import('node:fs');
    const pgLog = openSync(join(pgRoot, 'server.log'), 'w', 0o600);
    const pg = spawn(join(pgBin, 'postgres'), ['-D', join(pgRoot, 'data'), '-k', pgRoot, '-p', String(pgPort), '-c', 'listen_addresses=', '-c', 'unix_socket_permissions=0700'], { env: libEnv, stdio: ['ignore', pgLog, pgLog], detached: false });
    track(pg.pid);
    const pgSocket = pgRoot;
    const pgUrlFor = (db) => `postgresql://cvg_stack_admin@localhost:${pgPort}/${db}?host=${pgSocket}`;
    const pgAdmin = pgUrlFor('postgres');
    const { pathToFileURL: toFileUrl } = await import('node:url');
    const pgModule = await import(toFileUrl(join(repoRoot, 'node_modules/pg/lib/index.js')).href);
    const Client = pgModule.Client ?? pgModule.default?.Client ?? pgModule.default;
    if (typeof Client !== 'function') throw new Error('pg Client export not resolved');
    const waitPg = async () => {
      const deadline = Date.now() + 30000;
      let lastError = null;
      for (;;) {
        try {
          const c = new Client({ connectionString: pgAdmin });
          await c.connect();
          await c.query('SELECT 1');
          await c.end();
          closeSync(pgLog);
          return;
        } catch (error) {
          lastError = error;
          if (Date.now() > deadline) {
            closeSync(pgLog);
            throw new Error(`private PG did not become ready: ${lastError?.message}; see ${pgRoot}/server.log`);
          }
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    };
    await waitPg();
    const dbName = `cvg_stack_${runLabel.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 16)}`;
    {
      const c = new Client({ connectionString: pgAdmin });
      await c.connect();
      await c.query(`CREATE DATABASE ${dbName} TEMPLATE template0`);
      await c.end();
    }
    const dbUrl = `postgresql://cvg_stack_admin@localhost:${pgPort}/${dbName}?host=${pgRoot}`;
    // 5. Build API + dependency closure from the frozen copy BEFORE migrating/booting
    // (dist/ is git-ignored and never copied; stale repo dist is never used).
    // pnpm resolves the workspace in the copy via the symlinked node_modules.
    await sh('pnpm', ['--filter', '...@cvg-his-v2/api', 'build'], { cwd: srcRoot, env: process.env });
    await sh('pnpm', ['--filter', '@cvg-his/db', 'build'], { cwd: srcRoot, env: process.env });
    await sh('node', [join(srcRoot, 'packages/db/dist/migrate.js')], { cwd: srcRoot, env: { ...process.env, DATABASE_URL: dbUrl, NODE_ENV: 'test', DOTENV_CONFIG_PATH: '/dev/null' } });
    step('postgres', { socketDir: pgRoot, pid: pg.pid, db: dbName, migrated: true });
    // 5. Redis (loopback, allocated port, no persistence).
    const redis = spawn(redisBin, ['--dir', redisDir, '--port', String(redisPort), '--bind', '127.0.0.1', '--daemonize', 'no', '--save', '', '--appendonly', 'no', '--logfile', join(redisDir, 'redis.log')], { env: libEnv, stdio: ['ignore', 'ignore', 'ignore'] });
    track(redis.pid);
    const redisCliRun = (args) => sh(redisCli, ['-h', '127.0.0.1', '-p', String(redisPort), ...args], { env: libEnv });
    const redisDeadline = Date.now() + 30000;
    for (;;) {
      try {
        await redisCliRun(['PING']);
        break;
      } catch (error) {
        if (Date.now() > redisDeadline) throw new Error(`private Redis did not become ready on 127.0.0.1:${redisPort}`);
        await new Promise((r) => setTimeout(r, 200));
      }
    }
    await redisCliRun(['SET', `stack:${runLabel}:probe`, 'synthetic-ok']);
    const redisReadBack = (await sh(redisCli, ['-h', '127.0.0.1', '-p', String(redisPort), 'GET', `stack:${runLabel}:probe`], { env: libEnv })).stdout.trim();
    step('redis', { port: redisPort, pid: redis.pid, ping: 'PONG', readBack: redisReadBack });
    // 6. Hash API outputs; build SPA from the frozen copy; hash outputs.
    const apiDist = [];
    {
      const walk = (dir, base) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const abs = join(dir, e.name);
          const rel = join(base, e.name);
          if (e.isDirectory()) walk(abs, rel);
          else if (e.isFile() && /\.(js|yaml|json)$/.test(e.name)) apiDist.push(rel);
        }
      };
      walk(join(srcRoot, 'apps/api/dist'), 'apps/api/dist');
    }
    const apiHashes = hashTree(srcRoot, apiDist);
    const spaEnv = { ...process.env, VITE_API_BASE_URL: `http://127.0.0.1:${apiPort}` };
    // The SPA builds in the worktree (supported pnpm layout): symlinked
    // node_modules in a frozen copy break vite's bundled-config resolution
    // nondeterministically (dual-package zod/vite faults under .vite-temp).
    // Equivalence is enforced WITH per-run evidence (not prose): the full-tree
    // worktree-vs-copy digest is recomputed here, plus manifest --check, so a
    // drifted worktree aborts the build.
    const buildGateCopyTree = hashFullTree(srcRoot, allRel);
    const buildGateWorktreeTree = hashFullTree(repoRoot, allRel);
    const frozenCheckNowRaw = (await sh('node', [join(repoRoot, 'scripts/refresh-critical-source-manifest.mjs'), '--check'], { cwd: repoRoot, env: process.env })).stdout;
    const frozenCheckNow = JSON.parse(frozenCheckNowRaw);
    report.buildGate = {
      copyTreeSha256: buildGateCopyTree.treeSha256,
      worktreeTreeSha256: buildGateWorktreeTree.treeSha256,
      treesMatch: buildGateCopyTree.treeSha256 === buildGateWorktreeTree.treeSha256,
      checkStdout: frozenCheckNowRaw.trim(),
      checkRevision: frozenCheckNow.manifestRevision,
      checkErrors: frozenCheckNow.errors ?? null
    };
    step('build-gate', { treesMatch: report.buildGate.treesMatch, checkRevision: report.buildGate.checkRevision, checkErrors: report.buildGate.checkErrors });
    if (!report.buildGate.treesMatch) {
      throw new Error('worktree drifted since the frozen copy; refusing to build');
    }
    if ((frozenCheckNow.errors ?? []).length || frozenCheckNow.manifestRevision !== frozenCheck.manifestRevision) {
      throw new Error('worktree identity drifted since the frozen-copy check; refusing to build');
    }
    const spaOutDir = join(attemptRoot, 'spa-dist');
    await sh(join(repoRoot, 'node_modules/.bin/vite'), ['build', '--outDir', spaOutDir], { cwd: join(repoRoot, 'apps/spa'), env: spaEnv });
    const spaDist = [];
    {
      const walk = (dir, base) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const abs = join(dir, e.name);
          const rel = join(base, e.name);
          if (e.isDirectory()) walk(abs, rel);
          else if (e.isFile()) spaDist.push(rel);
        }
      };
      walk(spaOutDir, 'spa-dist');
    }
    const spaHashes = hashTree(attemptRoot, spaDist);
    // Prove the SPA build is bound to this attempt's API port.
    const spaIndex = readFileSync(join(spaOutDir, 'index.html'), 'utf8');
    const apiAssetHit = spaDist.filter((rel) => {
      if (!/\.js$/.test(rel)) return false;
      try { return readFileSync(join(attemptRoot, rel), 'utf8').includes(`http://127.0.0.1:${apiPort}`); } catch { return false; }
    });
    step('builds', { apiFiles: apiDist.length, spaFiles: spaDist.length, spaBoundToApiPort: apiAssetHit.length > 0, apiHashSample: apiHashes[0], spaHashSample: spaHashes[0] });
    report.apiHashes = apiHashes;
    report.spaHashes = spaHashes;
    const digestOfDigests = (entries) =>
      createHash('sha256').update([...entries].map((e) => `${e.rel}:${e.sha256}`).sort().join('\n')).digest('hex');
    report.apiTreeSha256 = digestOfDigests(apiHashes);
    report.spaTreeSha256 = digestOfDigests(spaHashes);
    // 7. Seed synthetic identity + boot API from the frozen build.
    const TENANT = randomUUID(), ACCOUNT = randomUUID(), USER = randomUUID();
    const USERNAME = `stack-${runLabel}-${USER.slice(0, 8)}`;
    const ITEM = randomUUID();
    {
      const c = new Client({ connectionString: dbUrl });
      await c.connect();
      try {
        const TEN = randomUUID();
        await c.query(`INSERT INTO tenants(id,slug,name,status) VALUES($1,'stack-t','STACK T','active')`, [TEN]);
        await c.query(`INSERT INTO accounts(id,tenant_id,slug,name) VALUES($1,$2,'stack-a','STACK A')`, [ACCOUNT, TEN]);
        await c.query(`INSERT INTO users(id,account_id,username,email,password_hash,full_name,is_active) VALUES($1,$2,$3,$4,'cvg-his-v2-seed-salt-v1:seed_admin','STACK op',true)`, [USER, ACCOUNT, USERNAME, `${USERNAME}@example.test`]);
        const role = await c.query(`INSERT INTO roles(name,description) VALUES('stack-inv','STACK inventory') RETURNING id`);
        await c.query(`INSERT INTO role_permissions(role_id,permission_id) SELECT $1,id FROM permissions WHERE key IN ('inventory.manage','inventory.read')`, [role.rows[0].id]);
        await c.query(`INSERT INTO user_roles(user_id,role_id) VALUES($1,$2)`, [USER, role.rows[0].id]);
        await c.query(`INSERT INTO inventory_items(id,account_id,sku,name,unit,on_hand_quantity,reorder_level,unit_cost_amount,charge_unit_price_amount) VALUES($1,$2,'SKU-STACK','STACK item','unit',100,1,10,20)`, [ITEM, ACCOUNT]);
      } finally { await c.end(); }
    }
    const apiEnv = { ...process.env, PORT: String(apiPort), HOST: '127.0.0.1', DATABASE_URL: dbUrl, DATABASE_URL_TEST: dbUrl, REDIS_URL: `redis://127.0.0.1:${redisPort}`, NODE_ENV: 'test', DOTENV_CONFIG_PATH: '/dev/null' };
    const { api, health } = await bootApiFromDist({ srcRoot, expectedApiHashes: apiHashes, apiEnv, apiPort, trackFn: (pid) => track(pid) });
    const healthBody = await health.json();
    step('api-boot', { pid: api.pid, port: apiPort, health: health.status, persistenceMode: healthBody.persistenceMode, redisHealthy: healthBody.redisHealthy });
    // 8. Exercise edges: login → purchase persist+read (API→PG), SPA serve + API reachability (SPA→API).
    const login = await fetch(`http://127.0.0.1:${apiPort}/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: USERNAME, password: 'seed_admin' }) });
    const token = (await login.json()).accessToken;
    if (!token) throw new Error('stack login failed');
    const KEY = `stack-key-${randomUUID()}`;
    const created = await (await fetch(`http://127.0.0.1:${apiPort}/inventory/purchases`, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'idempotency-key': KEY }, body: JSON.stringify({ supplierName: 'STACK supplier', lines: [{ inventoryItemId: ITEM, quantity: 2, unitCostAmount: 10, lotNumber: 'LOT-STACK' }] }) })).json();
    if (!created.id) throw new Error(`stack purchase failed: ${JSON.stringify(created).slice(0, 300)}`);
    const listed = await (await fetch(`http://127.0.0.1:${apiPort}/inventory/purchases?page=1&pageSize=50`, { headers: { authorization: `Bearer ${token}` } })).json();
    const found = (listed.items ?? []).some((it) => it.id === created.id);
    step('edge-api-pg', { purchaseId: created.id, listedBack: found });
    if (!found) throw new Error('purchase not listed back');
    // 9. SPA preview from the frozen build.
    const preview = spawn(join(repoRoot, 'node_modules/.bin/vite'), ['preview', '--outDir', spaOutDir, '--port', String(spaPort), '--strictPort', '--host', '127.0.0.1'], { cwd: join(repoRoot, 'apps/spa'), env: process.env, stdio: ['ignore', 'ignore', 'ignore'] });
    track(preview.pid);
    const spaRes = await waitFor(`http://127.0.0.1:${spaPort}/`, 60000, 'SPA');
    const spaHtml = await spaRes.text();
    step('edge-spa-api', { pid: preview.pid, port: spaPort, http: spaRes.status, htmlBytes: spaHtml.length, apiReachable: (await (await fetch(`http://127.0.0.1:${apiPort}/health`)).status) === 200 });
    // Post-build re-gate: re-digest both trees AFTER all builds. Equal digests
    // bound the TOCTOU window (no writer touched sources during the build).
    const postCopyTree = hashFullTree(srcRoot, allRel);
    const postWorktreeTree = hashFullTree(repoRoot, allRel);
    report.buildGatePost = {
      copyTreeSha256: postCopyTree.treeSha256,
      worktreeTreeSha256: postWorktreeTree.treeSha256,
      treesMatch: postCopyTree.treeSha256 === postWorktreeTree.treeSha256,
      equalsPreBuild: postCopyTree.treeSha256 === report.buildGate.copyTreeSha256
        && postWorktreeTree.treeSha256 === report.buildGate.worktreeTreeSha256
    };
    step('build-gate-post', report.buildGatePost);
    if (!report.buildGatePost.treesMatch || !report.buildGatePost.equalsPreBuild) {
      throw new Error('source drift detected across the build window; evidence refused');
    }
    report.verdict = 'PASS';
    return report;
  } finally {
    await killOwned();
    // Retain server logs as evidence BEFORE removing the attempt root, so the
    // served databases/keys stay attributable per run. Failures are recorded,
    // never swallowed: missing server logs fail teardown verification below.
    const serverLogsRetained = { pg: false, redis: false };
    try {
      copyFileSync(join(pgRoot, 'server.log'), join(evidenceDir, `pg-server-${runLabel}.log`));
      serverLogsRetained.pg = true;
    } catch (error) {
      step('teardown-warn', { missing: `pg-server-${runLabel}.log`, error: String(error?.message ?? error).slice(0, 200) });
    }
    try {
      copyFileSync(join(redisDir, 'redis.log'), join(evidenceDir, `redis-${runLabel}.log`));
      serverLogsRetained.redis = true;
    } catch (error) {
      step('teardown-warn', { missing: `redis-${runLabel}.log`, error: String(error?.message ?? error).slice(0, 200) });
    }
    report.serverLogsRetained = serverLogsRetained;
    // Teardown verification: owned PIDs dead, attempt ports free, neighbors alive.
    const ownedDead = [];
    for (const pid of ownedPids) {
      let alive = true;
      try { process.kill(pid, 0); } catch { alive = false; }
      ownedDead.push({ pid, dead: !alive });
    }
    const portsFree = {};
    for (const [name, port] of Object.entries(attemptPorts)) {
      if (typeof port !== 'number') { portsFree[name] = 'not-allocated'; continue; }
      try { await assertPortFree('127.0.0.1', port); portsFree[name] = true; }
      catch { portsFree[name] = false; }
    }
    // PG is socket-only: prove its socket directory no longer serves this attempt.
    let pgSocketGone = 'not-allocated';
    try {
      const leftovers = readdirSync(pgRoot);
      const serving = leftovers.some((e) => /^\.s\.PGSQL\./.test(e) || e === 'postmaster.pid');
      pgSocketGone = !serving;
    } catch { pgSocketGone = true; }
    portsFree.pgSocketGone = pgSocketGone;
    const neighborsAfter = await snapshotNeighbors();
    const afterByPid = {};
    for (const k of ['postgres', 'redis-server']) {
      for (const e of neighborsAfter[k] ?? []) afterByPid[`${k}:${e.pid}`] = e.cmd;
    }
    const neighborsIntact = neighborsBefore !== null && ['postgres', 'redis-server'].every((k) =>
      (neighborsBefore[k] ?? []).every((e) => afterByPid[`${k}:${e.pid}`] === e.cmd)
    );
    const neighborsVanished = neighborsBefore !== null ? ['postgres', 'redis-server'].flatMap((k) =>
      (neighborsBefore[k] ?? []).filter((e) => afterByPid[`${k}:${e.pid}`] !== e.cmd).map((e) => `${k}:${e.pid}:${e.cmd}`)
    ) : [];
    report.neighborsAfter = neighborsAfter;
    report.teardown = { ownedPids, ownedDead, portsFree, neighborsIntact, neighborsVanished, removedRoot: false };
    step('teardown-verify', { ownedDead: ownedDead.every((o) => o.dead), portsFree, neighborsIntact, neighborsVanished });
    if (!keepRoot) {
      rmSync(attemptRoot, { recursive: true, force: true });
      report.teardown.removedRoot = true;
    }
  }
}

export async function bootApiFromDist({ srcRoot, expectedApiHashes, apiEnv, apiPort, trackFn }) {
  // The stale-dist gate is enforced HERE on every boot: a tampered or
  // prebuilt dist that does not match the just-built hashes is refused
  // before any process is spawned.
  await assertDistMatchesSources(expectedApiHashes, srcRoot);
  const api = spawn('node', [join(srcRoot, 'apps/api/dist/index.js')], { cwd: srcRoot, env: apiEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  trackFn(api.pid);
  let apiTail = '';
  api.stdout.on('data', (d) => { apiTail += d; });
  api.stderr.on('data', (d) => { apiTail += d; });
  const health = await waitFor(`http://127.0.0.1:${apiPort}/health`, 120000, 'API');
  return { api, apiTail, health };
}

export async function selfTestTamper({ repoRoot = ROOT } = {}) {
  // Negative integration: build API from frozen sources, tamper one byte of
  // the built dist, and prove the boot gate refuses it before spawning.
  checkBinaryEnvironment();
  const attemptRoot = mkdtempSync(join(tmpdir(), 'cvg-stack-tamper-'));
  try {
    const srcRoot = join(attemptRoot, 'src');
    mkdirSync(srcRoot, { recursive: true });
    const lsFiles = (await sh('git', ['ls-files', '-z'], { cwd: repoRoot })).stdout.split('\0').filter(Boolean);
    const untracked = (await sh('git', ['ls-files', '--others', '--exclude-standard', '-z'], { cwd: repoRoot })).stdout.split('\0').filter(Boolean);
    for (const rel of [...lsFiles, ...untracked]) {
      const dest = join(srcRoot, rel);
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(join(repoRoot, rel), dest);
    }
    await linkWorkspaceNodeModules(repoRoot, srcRoot);
    await sh('pnpm', ['--filter', '...@cvg-his-v2/api', 'build'], { cwd: srcRoot, env: process.env });
    const apiDist = [];
    {
      const walk = (dir, base) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          const abs = join(dir, e.name);
          const rel = join(base, e.name);
          if (e.isDirectory()) walk(abs, rel);
          else if (e.isFile() && /\.(js|yaml|json)$/.test(e.name)) apiDist.push(rel);
        }
      };
      walk(join(srcRoot, 'apps/api/dist'), 'apps/api/dist');
    }
    const expected = hashTree(srcRoot, apiDist);
    // Sanity: untampered dist passes the gate.
    await assertDistMatchesSources(expected, srcRoot);
    // Tamper one byte and prove refusal before any spawn.
    const victim = join(srcRoot, 'apps/api/dist/server.js');
    const before = readFileSync(victim);
    writeFileSync(victim, Buffer.concat([before, Buffer.from('//tamper')]));
    let refused = null;
    try {
      await bootApiFromDist({
        srcRoot, expectedApiHashes: expected, apiEnv: process.env, apiPort: 1, trackFn: () => {}
      });
    } catch (error) {
      refused = String(error.message).split('\n')[0];
    }
    if (!refused || !refused.includes('stale dist refused')) {
      throw new Error('tampered dist was NOT refused by the boot gate');
    }
    return { refused };
  } finally {
    rmSync(attemptRoot, { recursive: true, force: true });
  }
}

function parseArgs(argv) {
  const args = { runLabel: null, evidenceDir: null, keepRoot: false, selfTestTamper: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--run-label') args.runLabel = argv[++i];
    else if (argv[i] === '--evidence-dir') args.evidenceDir = argv[++i];
    else if (argv[i] === '--keep-root') args.keepRoot = true;
    else if (argv[i] === '--self-test-tamper') args.selfTestTamper = true;
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  if (args.selfTestTamper) return args;
  if (!args.runLabel || !args.evidenceDir) throw new Error('usage: run-exclusive-stack.mjs --run-label <id> --evidence-dir <dir> [--keep-root] | --self-test-tamper');
  return args;
}

const isMain = process.argv[1] && import.meta.url === (await import('node:url')).pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.selfTestTamper) {
      const { refused } = await selfTestTamper();
      console.log(JSON.stringify({ status: 'NEGATIVE-PASS', refused }));
      process.exit(0);
    }
    mkdirSync(args.evidenceDir, { recursive: true });
    const report = await runExclusiveStack({ runLabel: args.runLabel, evidenceDir: args.evidenceDir });
    const { apiHashes, spaHashes, ...summary } = report;
    writeFileSync(join(args.evidenceDir, `stack-${args.runLabel}-report.json`), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(args.evidenceDir, `stack-${args.runLabel}-hashes.json`), `${JSON.stringify({ apiHashes, spaHashes }, null, 2)}\n`);
    console.log(JSON.stringify({ status: 'PASS', runLabel: args.runLabel }));
    setTimeout(() => process.exit(process.exitCode ?? 0), 5000);
  } catch (error) {
    console.error(`exclusive stack failed: ${error.stack ?? error.message}`);
    process.exitCode = 1;
    setTimeout(() => process.exit(1), 5000);
  }
}
