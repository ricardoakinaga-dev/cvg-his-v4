import { mkdtempSync, openSync, closeSync, writeFileSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';

async function waitForExit(terminal, timeoutMs) {
  let timer;
  try {
    return await Promise.race([terminal, new Promise((done) => { timer = setTimeout(() => done(null), timeoutMs); })]);
  } finally { clearTimeout(timer); }
}

// Own the server process and its fresh private directory; never connect to or
// delete a database in an existing cluster. Retain stopped data for inspection.
export async function withPrivatePostgres({ binDir, shareDir, libraryDir, run }) {
  if (process.platform !== 'linux' || typeof run !== 'function' || !binDir || !shareDir) throw new Error('private PostgreSQL requires Linux, explicit tool directories and a callback');
  const tools = realpathSync(binDir);
  const share = realpathSync(shareDir);
  const root = mkdtempSync(join(tmpdir(), 'cvg-native-pg-'));
  const data = join(root, 'data');
  const env = { ...process.env };
  if (libraryDir) env.LD_LIBRARY_PATH = realpathSync(libraryDir);
  const initialized = spawnSync(join(tools, 'initdb'), ['-D', data, '-L', share, '--username=cvg_native_admin', '--auth-local=trust', '--auth-host=reject', '--no-locale', '--encoding=UTF8'], { env, encoding: 'utf8', timeout: 30000 });
  writeFileSync(join(root, 'initdb.log'), `${initialized.stdout ?? ''}\n${initialized.stderr ?? ''}`, { flag: 'wx', mode: 0o600 });
  if (initialized.status !== 0 || initialized.signal) throw new Error(`private PostgreSQL initialization failed; retained ${root}`);
  const log = openSync(join(root, 'server.log'), 'wx', 0o600);
  const server = spawn(join(tools, 'postgres'), ['-D', data, '-k', root, '-p', '55439', '-c', 'listen_addresses=', '-c', 'unix_socket_permissions=0700'], { env, stdio: ['ignore', log, log] });
  closeSync(log);
  let exited = false;
  const terminal = new Promise((resolveTerminal) => {
    server.once('error', () => { exited = true; resolveTerminal({ code: null, signal: null, spawnError: true }); });
    server.once('exit', (code, signal) => { exited = true; resolveTerminal({ code, signal }); });
  });
  const connection = { host: root, port: 55439, user: 'cvg_native_admin', database: 'postgres', connectionTimeoutMillis: 500, query_timeout: 5000 };
  let value;
  let failure;
  let stopped;
  try {
    const deadline = Date.now() + 15000;
    let ready = false;
    while (!ready && Date.now() < deadline && !exited) {
      const client = new pg.Client(connection);
      try {
        await client.connect();
        const result = await client.query("SELECT current_setting('data_directory') AS directory, current_setting('listen_addresses') AS listen");
        if (resolve(result.rows[0].directory) !== data || result.rows[0].listen !== '') throw new Error('private PostgreSQL identity mismatch');
        ready = true;
      } catch { if (!exited) await delay(100); }
      finally { await client.end().catch(() => {}); }
    }
    if (!ready) throw new Error('private PostgreSQL did not become ready');
    const admin = new pg.Client(connection);
    try {
      await admin.connect();
      await admin.query('CREATE DATABASE cvg_his_v2_test_native TEMPLATE template0');
    } finally { await admin.end(); }
    const databaseUrl = new URL('postgresql://cvg_native_admin@localhost:55439/cvg_his_v2_test_native');
    databaseUrl.searchParams.set('host', root);
    const environment = { NODE_ENV: 'test', DOTENV_CONFIG_PATH: '/dev/null', DATABASE_URL: databaseUrl.href, DATABASE_URL_TEST: databaseUrl.href, E2E_DATABASE_URL: databaseUrl.href, REQUIRE_TEST_DB: '1', TEST_DB_SUFFIX: '', TEST_DB_EPHEMERAL: '0' };
    value = await run({ environment, databaseUrl: databaseUrl.href, directory: root, pid: server.pid });
  } catch (error) { failure = error; }
  finally {
    if (!exited) server.kill('SIGINT'); // PostgreSQL fast shutdown, owned PID only.
    stopped = await waitForExit(terminal, 10000);
    if (!stopped && !exited) {
      server.kill('SIGQUIT');
      stopped = await waitForExit(terminal, 5000);
    }
    writeFileSync(join(root, 'lifecycle.json'), JSON.stringify({ directory: root, pid: server.pid, stopped, callbackFailed: Boolean(failure) }, null, 2), { flag: 'wx', mode: 0o600 });
  }
  if (!stopped || stopped.spawnError) throw new Error(`private PostgreSQL shutdown/startup not verified; inspect ${root}`);
  if (failure) throw failure;
  return { value, evidence: { directory: root, pid: server.pid, stopped, tcpEnabled: false } };
}
