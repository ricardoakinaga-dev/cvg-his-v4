import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createServer, type AddressInfo } from 'node:net';
import { resolve } from 'node:path';

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import { SETUP_MAX_BODY_BYTES } from '../../../apps/api/src/routes/setup-routes.js';
import { ADMIN_DB_URL, TEST_DB_IS_EPHEMERAL } from '../../setup/env.js';

const ROOT = resolve(import.meta.dirname, '../../..');
const API_PROCESS_FIXTURE = resolve(ROOT, 'apps/api/test-fixtures/api-process.ts');
const suffix = randomUUID().replaceAll('-', '');
const redisContainerName = `cvg_his_setup_session_redis_${suffix}`;
const redisContainerLabel = 'cvg-his-test=setup-installation-to-session';
const scratchDatabase = `cvg_his_v2_test_setup_http_${suffix}`;
const apiRole = `cvg_test_setup_http_api_${suffix}`;
const workerRole = `cvg_test_setup_http_worker_${suffix}`;
const rolePassword = `setup-http-${suffix}`;
const authSecret = `setup-http-auth-${suffix}-shared-secret-with-strong-entropy`;
const bootstrapToken = `setup-http-bootstrap-${suffix}-secret-with-strong-entropy`;
const adminUsername = `setup_admin_${suffix.slice(0, 12)}`;
const adminEmail = `${adminUsername}@example.test`;
const adminPassword = `S3tup-${suffix.slice(0, 18)}!Admin`;
const clinicName = `Setup HTTP Clinic ${suffix.slice(0, 8)}`;

function isDockerAvailable(): boolean {
  try {
    execFileSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
      cwd: ROOT,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
}

const canRunDisposableDistributedFixture = TEST_DB_IS_EPHEMERAL && isDockerAvailable();
const requireDisposableDistributedFixture = process.env.REQUIRE_TEST_DB === '1';

interface ApiProcess {
  readonly child: ChildProcess;
  readonly baseUrl: string;
  readonly output: () => string;
  readonly close: () => Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
  readonly headers: Headers;
}

interface SetupStatusResponse {
  readonly setupRequired: boolean;
  readonly setupAvailable: boolean;
}

interface SetupCompletedResponse {
  readonly setupCompleted: boolean;
  readonly requiresLogin: boolean;
}

interface HealthDependency {
  readonly state?: string;
  readonly detail?: string;
}

interface HealthResponse {
  readonly ok?: boolean;
  readonly redisHealthy?: boolean;
  readonly rateLimiterMode?: string;
  readonly readiness?: {
    readonly ready?: boolean;
    readonly productionReady?: boolean;
    readonly persistenceMode?: string;
  };
  readonly liveness?: {
    readonly live?: boolean;
    readonly initialized?: boolean;
  };
  readonly dependencies?: {
    readonly redis?: HealthDependency;
    readonly database?: HealthDependency;
  };
}

interface BrowserSessionResponse {
  readonly accessToken: string;
  readonly tokenType: string;
  readonly principal: {
    readonly user: {
      readonly username: string;
    };
    readonly session: {
      readonly sessionId: string;
    };
  };
}

interface AuthSessionResponse {
  readonly session: {
    readonly sessionId: string;
  };
  readonly principal: {
    readonly user: {
      readonly username: string;
    };
  };
}

interface SessionListResponse {
  readonly items: ReadonlyArray<{
    readonly sessionId: string;
    readonly active: boolean;
  }>;
}

let clusterAdmin: Pool | undefined;
let scratchAdmin: Pool | undefined;
let scratchDatabaseUrl: string;
let redisUrl: string;
let redisContainerCreated = false;
let apiA: ApiProcess | undefined;
let apiB: ApiProcess | undefined;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function dockerOutput(args: readonly string[]): string {
  return execFileSync('docker', [...args], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function dockerCommand(args: readonly string[]): void {
  execFileSync('docker', [...args], {
    cwd: ROOT,
    stdio: 'ignore'
  });
}

async function waitForRedisPing(timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError = 'no response';

  while (Date.now() < deadline) {
    try {
      if (dockerOutput(['exec', redisContainerName, 'redis-cli', 'PING']) === 'PONG') {
        return;
      }
      lastError = 'redis-cli did not return PONG';
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
  }

  throw new Error(`Disposable Redis did not become ready: ${lastError}`);
}

async function startRedisContainer(): Promise<void> {
  // Reserve the host port ourselves. Docker's ephemeral dual-stack mapping
  // can expose different IPv4/IPv6 ports, which would make a URL parsed from
  // `docker port` nondeterministic for the API child processes.
  const publishedPort = await reservePort();
  const containerId = dockerOutput([
    'run',
    '-d',
    '--name',
    redisContainerName,
    '--label',
    redisContainerLabel,
    '-p',
    `127.0.0.1:${publishedPort}:6379`,
    'redis:7-alpine'
  ]);
  if (containerId.length === 0) {
    throw new Error(`Docker did not return an ID for ${redisContainerName}.`);
  }
  redisContainerCreated = true;
  try {
    const actualPort = dockerOutput(['port', redisContainerName, '6379/tcp']);
    if (actualPort !== `127.0.0.1:${publishedPort}`) {
      throw new Error(
        `Disposable Redis published an unexpected port: expected 127.0.0.1:${publishedPort}, got ${actualPort}`
      );
    }
    redisUrl = `redis://127.0.0.1:${publishedPort}/0`;
  } catch (error) {
    try {
      removeRedisContainer();
    } catch {
      // Preserve the original startup error; afterAll also attempts cleanup.
    }
    throw error;
  }
}

function stopRedisContainer(): void {
  if (!redisContainerCreated) return;
  dockerCommand(['stop', redisContainerName]);
}

async function restoreRedisContainer(): Promise<void> {
  if (!redisContainerCreated) {
    throw new Error('The disposable Redis container was not created.');
  }
  dockerCommand(['start', redisContainerName]);
  await waitForRedisPing();
}

function removeRedisContainer(): void {
  if (!redisContainerCreated) return;
  try {
    dockerCommand(['rm', '-f', redisContainerName]);
  } finally {
    redisContainerCreated = false;
  }
}

function buildScratchDatabaseUrl(): string {
  const url = new URL(ADMIN_DB_URL);
  url.pathname = `/${scratchDatabase}`;
  return url.toString();
}

function buildRuntimeDatabaseUrl(): string {
  const url = new URL(scratchDatabaseUrl);
  url.username = apiRole;
  url.password = rolePassword;
  return url.toString();
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolveListen());
  });
  const address = server.address() as AddressInfo | null;
  if (!address) {
    throw new Error('Could not reserve a port for the API process fixture.');
  }
  const port = address.port;
  await new Promise<void>((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose()))
  );
  return port;
}

function startApi(port: number, instance: 'a' | 'b'): ApiProcess {
  const child = spawn(process.execPath, ['--import', 'tsx/esm', API_PROCESS_FIXTURE], {
    cwd: ROOT,
    env: {
      ...process.env,
      API_PROCESS_FIXTURE: '1',
      NODE_ENV: 'test',
      APP_NAME: `setup-installation-session-${instance}`,
      HOST: '127.0.0.1',
      PORT: String(port),
      DATABASE_URL: buildRuntimeDatabaseUrl(),
      POSTGRES_API_USER: apiRole,
      POSTGRES_WORKER_USER: workerRole,
      AUTH_SECRET: authSecret,
      SETUP_BOOTSTRAP_TOKEN: bootstrapToken,
      REDIS_URL: redisUrl,
      RUNTIME_DISTRIBUTED_STATE_ENABLED: 'true',
      TRUSTED_PROXY_CIDRS: '127.0.0.1/32',
      CORS_ALLOWED_ORIGINS: 'http://127.0.0.1:3000',
      OTEL_ENABLED: 'false',
      PIX_MOCK_MODE: 'true',
      EMAIL_MOCK_MODE: 'true',
      SMS_MOCK_MODE: 'true',
      GOOGLE_CALENDAR_MOCK_MODE: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  if (child.pid === undefined) {
    throw new Error(`API process ${instance} did not expose a PID.`);
  }

  let output = '';
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    output += chunk;
  });
  child.stderr?.on('data', (chunk: string) => {
    output += chunk;
  });

  let closeResult:
    | { readonly code: number | null; readonly signal: NodeJS.Signals | null }
    | undefined;
  let resolveClose:
    | ((result: { readonly code: number | null; readonly signal: NodeJS.Signals | null }) => void)
    | undefined;
  const closed = new Promise<{
    readonly code: number | null;
    readonly signal: NodeJS.Signals | null;
  }>((resolveClosed) => {
    resolveClose = resolveClosed;
  });
  child.once('close', (code, signal) => {
    closeResult = { code, signal };
    resolveClose?.(closeResult);
  });

  return {
    child,
    baseUrl: `http://127.0.0.1:${port}`,
    output: () => output,
    close: () => (closeResult ? Promise.resolve(closeResult) : closed)
  };
}

async function waitForApi(processHandle: ApiProcess): Promise<void> {
  const deadline = Date.now() + 45_000;
  let lastError = 'no response';

  while (Date.now() < deadline) {
    try {
      const response = await requestJson<HealthResponse>(processHandle, '/ready');
      if (
        response.status === 200 &&
        response.body?.readiness?.ready === true &&
        response.body.readiness.persistenceMode === 'database'
      ) {
        return;
      }
      lastError = `${response.status} ${response.text}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
  }

  throw new Error(
    `API process did not become database-ready: ${lastError}\n${processHandle.output().slice(-6000)}`
  );
}

async function requestJson<T>(
  processHandle: ApiProcess,
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(`${processHandle.baseUrl}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(10_000)
  });
  const text = await response.text();
  let body: T | undefined;
  if (text.length > 0) {
    try {
      body = JSON.parse(text) as T;
    } catch {
      body = undefined;
    }
  }
  return { status: response.status, body, text, headers: response.headers };
}

async function waitForHttpStatus<T>(
  processHandle: ApiProcess,
  path: string,
  expectedStatus: number,
  timeoutMs = 5_000
): Promise<JsonResponse<T>> {
  const deadline = Date.now() + timeoutMs;
  let lastResponse: JsonResponse<T> | undefined;
  let lastError = 'no response';

  while (Date.now() < deadline) {
    try {
      lastResponse = await requestJson<T>(processHandle, path);
      if (lastResponse.status === expectedStatus) return lastResponse;
      lastError = `${lastResponse.status} ${lastResponse.text}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 100));
  }

  return (
    lastResponse ?? {
      status: 0,
      text: `No response while waiting for HTTP ${expectedStatus}: ${lastError}`,
      headers: new Headers()
    }
  );
}

function getSetCookieHeaders(headers: Headers): readonly string[] {
  const headerWithGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const values = headerWithGetSetCookie.getSetCookie?.() ?? [];
  if (values.length > 0) return values;
  const combined = headers.get('set-cookie');
  return combined ? [combined] : [];
}

function extractRefreshCookie(headers: Headers): string {
  const cookieHeader = getSetCookieHeaders(headers).find((value) =>
    /(?:^|,\s*)cvg_his_refresh=/.test(value)
  );
  if (!cookieHeader) {
    throw new Error('Login did not return the HttpOnly refresh cookie.');
  }

  const match = /(?:^|,\s*)cvg_his_refresh=([^;,\s]+)/.exec(cookieHeader);
  if (!match?.[1]) {
    throw new Error(`Could not parse the refresh cookie: ${cookieHeader}`);
  }
  return decodeURIComponent(match[1]);
}

function bearerHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
    'content-type': 'application/json'
  };
}

function expectRedisDependency(
  response: JsonResponse<HealthResponse>,
  expectedState: 'healthy' | 'unhealthy'
): void {
  expect.soft(response.body?.dependencies?.redis?.state).toBe(expectedState);
  const dependencyText = JSON.stringify(response.body?.dependencies?.redis ?? {});
  expect.soft(dependencyText).not.toContain(redisUrl);
  expect.soft(dependencyText).not.toContain(rolePassword);
}

async function waitForClose(
  processHandle: ApiProcess,
  timeoutMs: number
): Promise<{ readonly code: number | null; readonly signal: NodeJS.Signals | null } | undefined> {
  return new Promise((resolveClose) => {
    const timer = setTimeout(() => resolveClose(undefined), timeoutMs);
    void processHandle.close().then((result) => {
      clearTimeout(timer);
      resolveClose(result);
    });
  });
}

async function stopApi(processHandle: ApiProcess | undefined): Promise<void> {
  if (!processHandle) return;
  if (processHandle.child.exitCode === null && processHandle.child.signalCode === null) {
    processHandle.child.kill('SIGTERM');
  }
  if (await waitForClose(processHandle, 5_000)) return;
  if (processHandle.child.exitCode === null && processHandle.child.signalCode === null) {
    processHandle.child.kill('SIGKILL');
  }
  if (!(await waitForClose(processHandle, 5_000))) {
    throw new Error(`API process ${processHandle.child.pid} did not exit during cleanup.`);
  }
}

async function killApi(processHandle: ApiProcess): Promise<void> {
  if (processHandle.child.exitCode === null && processHandle.child.signalCode === null) {
    if (!processHandle.child.kill('SIGKILL')) {
      throw new Error(`Could not SIGKILL API process ${processHandle.child.pid}.`);
    }
  }
  const result = await waitForClose(processHandle, 10_000);
  if (!result) {
    throw new Error(`API process ${processHandle.child.pid} did not exit after SIGKILL.`);
  }
  if (result.signal !== 'SIGKILL') {
    throw new Error(
      `API process ${processHandle.child.pid} exited unexpectedly: ${JSON.stringify(result)}`
    );
  }
}

async function restartApiA(): Promise<void> {
  if (!apiA) {
    throw new Error('API process A was not initialized.');
  }

  const port = Number(new URL(apiA.baseUrl).port);
  await killApi(apiA);
  apiA = startApi(port, 'a');
  await waitForApi(apiA);
}

async function createScratchDatabase(): Promise<void> {
  clusterAdmin = new Pool({ connectionString: ADMIN_DB_URL, max: 4 });
  scratchDatabaseUrl = buildScratchDatabaseUrl();

  await clusterAdmin.query(`CREATE DATABASE ${quoteIdentifier(scratchDatabase)}`);
  await clusterAdmin.query(
    `CREATE ROLE ${quoteIdentifier(apiRole)} LOGIN PASSWORD ${quoteLiteral(rolePassword)}
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
  );
  await clusterAdmin.query(
    `CREATE ROLE ${quoteIdentifier(workerRole)} LOGIN PASSWORD ${quoteLiteral(rolePassword)}
     NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
  );

  execFileSync('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
    cwd: ROOT,
    env: {
      ...process.env,
      DATABASE_URL: scratchDatabaseUrl,
      DATABASE_URL_TEST: scratchDatabaseUrl,
      POSTGRES_POOL_MIN: '0'
    },
    stdio: 'inherit'
  });

  scratchAdmin = new Pool({ connectionString: scratchDatabaseUrl, max: 4 });
  const client = await scratchAdmin.connect();
  try {
    await reconcileRuntimeRoles(client, { apiRole, workerRole });
  } finally {
    client.release();
  }
}

async function dropScratchDatabase(): Promise<void> {
  await scratchAdmin?.end();
  scratchAdmin = undefined;
  if (!clusterAdmin) return;

  await clusterAdmin.query(
    `SELECT pg_terminate_backend(pid)
       FROM pg_stat_activity
      WHERE datname = $1
        AND pid <> pg_backend_pid()`,
    [scratchDatabase]
  );
  await clusterAdmin.query(
    `DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDatabase)} WITH (FORCE)`
  );
  await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`);
  await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`);
  await clusterAdmin.end();
  clusterAdmin = undefined;
}

describe.skipIf(!canRunDisposableDistributedFixture && !requireDisposableDistributedFixture)(
  'first-run setup to distributed session lifecycle',
  () => {
    beforeAll(async () => {
      if (!canRunDisposableDistributedFixture) {
        throw new Error(
          'Required distributed process fixture unavailable: TEST_DB_EPHEMERAL=1 and Docker are required.'
        );
      }
      await startRedisContainer();
      await waitForRedisPing();
      await createScratchDatabase();
      const [portA, portB] = await Promise.all([reservePort(), reservePort()]);
      apiA = startApi(portA, 'a');
      apiB = startApi(portB, 'b');
      await Promise.all([waitForApi(apiA), waitForApi(apiB)]);
    }, 120_000);

    afterAll(async () => {
      try {
        await Promise.all([stopApi(apiA), stopApi(apiB)]);
      } finally {
        try {
          await dropScratchDatabase();
        } finally {
          removeRedisContainer();
        }
      }
    }, 120_000);

    it('provisions once, authenticates across hot replicas, rotates and revokes the session', async () => {
      if (!apiA || !apiB) {
        throw new Error('API process fixtures were not initialized.');
      }

      const [readyA, readyB, healthA, healthB, readyAliasA, readyAliasB, liveA] = await Promise.all(
        [
          requestJson<HealthResponse>(apiA, '/ready'),
          requestJson<HealthResponse>(apiB, '/ready'),
          requestJson<HealthResponse>(apiA, '/health'),
          requestJson<HealthResponse>(apiB, '/health'),
          requestJson<HealthResponse>(apiA, '/health/ready'),
          requestJson<HealthResponse>(apiB, '/health/ready'),
          requestJson<HealthResponse>(apiA, '/live')
        ]
      );
      expect(readyA.status).toBe(200);
      expect(readyB.status).toBe(200);
      expectRedisDependency(readyA, 'healthy');
      expectRedisDependency(readyB, 'healthy');
      expectRedisDependency(readyAliasA, 'healthy');
      expectRedisDependency(readyAliasB, 'healthy');
      expect(healthA.status).toBe(200);
      expect(healthA.body).toMatchObject({
        ok: true,
        redisHealthy: true,
        rateLimiterMode: 'redis'
      });
      expect(healthB.status).toBe(200);
      expect(healthB.body).toMatchObject({
        ok: true,
        redisHealthy: true,
        rateLimiterMode: 'redis'
      });
      expect(liveA.status).toBe(200);
      expect(liveA.body).toMatchObject({ liveness: { live: true } });

      const statusBeforeA = await requestJson<SetupStatusResponse>(apiA, '/auth/setup/status');
      const statusBeforeB = await requestJson<SetupStatusResponse>(apiB, '/auth/setup/status');
      expect(statusBeforeA.status, `${statusBeforeA.text}\n${apiA.output().slice(-4000)}`).toBe(
        200
      );
      expect(statusBeforeA.body).toEqual({ setupRequired: true, setupAvailable: true });
      expect(statusBeforeB.status, `${statusBeforeB.text}\n${apiB.output().slice(-4000)}`).toBe(
        200
      );
      expect(statusBeforeB.body).toEqual({ setupRequired: true, setupAvailable: true });

      const malformed = await requestJson<{ readonly code: string }>(apiA, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{'
      });
      expect(malformed.status).toBe(400);
      expect(malformed.body).toEqual({
        code: 'INVALID_JSON_BODY',
        message: 'Request body must be valid JSON'
      });

      const nonObject = await requestJson<{ readonly code: string }>(apiA, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([])
      });
      expect(nonObject.status).toBe(400);
      expect(nonObject.body?.code).toBe('INVALID_SETUP_PAYLOAD');

      const invalidToken = `invalid-${suffix}`;
      const rejectedToken = await requestJson<{ readonly code: string }>(apiA, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: invalidToken })
      });
      expect(rejectedToken.status).toBe(401);
      expect(rejectedToken.body?.code).toBe('INVALID_SETUP_TOKEN');
      expect(rejectedToken.text).not.toContain(invalidToken);
      expect(apiA.output()).not.toContain(invalidToken);

      const invalidFields = await requestJson<{ readonly code: string }>(apiA, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: bootstrapToken,
          clinicName: '',
          adminUsername: 'x',
          adminEmail: 'not-an-email',
          adminPassword: 'weak'
        })
      });
      expect(invalidFields.status).toBe(400);
      expect(invalidFields.body?.code).toBe('INVALID_SETUP_PAYLOAD');

      const oversized = await requestJson<{ readonly code: string }>(apiB, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ padding: 'x'.repeat(SETUP_MAX_BODY_BYTES) })
      });
      expect(oversized.status).toBe(413);
      expect(oversized.body?.code).toBe('SETUP_PAYLOAD_TOO_LARGE');

      const statusAfterRejectedInputs = await requestJson<SetupStatusResponse>(
        apiB,
        '/auth/setup/status'
      );
      expect(statusAfterRejectedInputs.body).toEqual({
        setupRequired: true,
        setupAvailable: true
      });

      const setup = await requestJson<SetupCompletedResponse>(apiA, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: bootstrapToken,
          clinicName,
          adminUsername,
          adminEmail,
          adminPassword,
          adminFullName: 'Setup Integration Administrator'
        })
      });
      expect(setup.status).toBe(201);
      expect(setup.body).toEqual({ setupCompleted: true, requiresLogin: true });
      expect(setup.text).not.toContain(bootstrapToken);
      expect(setup.text).not.toContain(adminPassword);
      expect(apiA.output()).not.toContain(bootstrapToken);
      expect(apiA.output()).not.toContain(adminPassword);
      expect(apiB.output()).not.toContain(bootstrapToken);
      expect(apiB.output()).not.toContain(adminPassword);

      const statusAfterB = await requestJson<SetupStatusResponse>(apiB, '/auth/setup/status');
      expect(statusAfterB.status).toBe(200);
      expect(statusAfterB.body).toEqual({ setupRequired: false, setupAvailable: true });

      const login = await requestJson<BrowserSessionResponse>(apiB, '/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      expect(login.status).toBe(200);
      expect(login.body?.accessToken).toEqual(expect.any(String));
      expect(login.body?.principal.user.username).toBe(adminUsername);
      expect(login.body).not.toHaveProperty('refreshToken');
      const refreshCookie = extractRefreshCookie(login.headers);

      const sessionOnA = await requestJson<AuthSessionResponse>(apiA, '/auth/session', {
        headers: { authorization: `Bearer ${login.body?.accessToken ?? ''}` }
      });
      expect(sessionOnA.status).toBe(200);
      expect(sessionOnA.body?.principal.user.username).toBe(adminUsername);
      expect(sessionOnA.body?.session.sessionId).toEqual(expect.any(String));

      const sessionIdBeforeRestart = sessionOnA.body?.session.sessionId;
      expect(sessionIdBeforeRestart).toEqual(expect.any(String));
      await restartApiA();
      if (!apiA) {
        throw new Error('API process A was not restarted.');
      }
      const sessionAfterPhysicalRestart = await requestJson<AuthSessionResponse>(
        apiA,
        '/auth/session',
        {
          headers: { authorization: `Bearer ${login.body?.accessToken ?? ''}` }
        }
      );
      expect(sessionAfterPhysicalRestart.status).toBe(200);
      expect(sessionAfterPhysicalRestart.body?.principal.user.username).toBe(adminUsername);
      expect(sessionAfterPhysicalRestart.body?.session.sessionId).toBe(sessionIdBeforeRestart);

      const refresh = await requestJson<BrowserSessionResponse>(apiA, '/auth/refresh', {
        method: 'POST',
        headers: { cookie: `cvg_his_refresh=${encodeURIComponent(refreshCookie)}` },
        body: '{}'
      });
      expect(refresh.status).toBe(200);
      expect(refresh.body?.accessToken).toEqual(expect.any(String));
      expect(refresh.body).not.toHaveProperty('refreshToken');
      const rotatedRefreshCookie = extractRefreshCookie(refresh.headers);
      expect(rotatedRefreshCookie).not.toBe(refreshCookie);

      const staleRefresh = await requestJson(apiB, '/auth/refresh', {
        method: 'POST',
        headers: { cookie: `cvg_his_refresh=${encodeURIComponent(refreshCookie)}` },
        body: '{}'
      });
      expect(staleRefresh.status).toBe(401);

      const sessionOnB = await requestJson<AuthSessionResponse>(apiB, '/auth/session', {
        headers: { authorization: `Bearer ${refresh.body?.accessToken ?? ''}` }
      });
      expect(sessionOnB.status).toBe(200);
      expect(sessionOnB.body?.principal.user.username).toBe(adminUsername);

      const crossInstanceLogin = await requestJson<BrowserSessionResponse>(apiA, '/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: adminUsername, password: adminPassword })
      });
      expect(crossInstanceLogin.status).toBe(200);
      const crossInstanceSessionId = crossInstanceLogin.body?.principal.session.sessionId;
      expect(crossInstanceSessionId).toEqual(expect.any(String));

      const sessionsAfterCrossInstanceLogin = await requestJson<SessionListResponse>(
        apiB,
        '/auth/sessions',
        { headers: bearerHeaders(refresh.body?.accessToken ?? '') }
      );
      expect(sessionsAfterCrossInstanceLogin.status).toBe(200);
      expect(
        sessionsAfterCrossInstanceLogin.body?.items.map((session) => session.sessionId)
      ).toContain(crossInstanceSessionId);

      const sessionsBeforeRedisOutage = await requestJson<SessionListResponse>(
        apiB,
        '/auth/sessions',
        { headers: bearerHeaders(refresh.body?.accessToken ?? '') }
      );
      expect(sessionsBeforeRedisOutage.status).toBe(200);
      const sessionIdsBeforeRedisOutage =
        sessionsBeforeRedisOutage.body?.items.map((session) => session.sessionId) ?? [];
      expect(sessionIdsBeforeRedisOutage).toContain(sessionIdBeforeRestart);

      const rateLimitProbeUsername = `distributed_probe_${suffix}`;
      const rateLimitProbeIp = '198.51.100.77';
      const rateLimitProbeResponses = await Promise.all(
        Array.from({ length: 11 }, (_, attempt) =>
          requestJson<{ readonly code?: string }>(attempt % 2 === 0 ? apiA : apiB, '/auth/login', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-forwarded-for': rateLimitProbeIp
            },
            body: JSON.stringify({ username: rateLimitProbeUsername, password: 'invalid-probe' })
          })
        )
      );
      expect(rateLimitProbeResponses.filter((response) => response.status === 401)).toHaveLength(
        10
      );
      expect(rateLimitProbeResponses.filter((response) => response.status === 429)).toHaveLength(1);
      expect(rateLimitProbeResponses.find((response) => response.status === 429)?.body).toEqual({
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again later.',
        retryAfterMs: expect.any(Number)
      });

      stopRedisContainer();
      const [outageReadyA, outageReadyB, outageReadyAliasA, outageReadyAliasB] = await Promise.all([
        waitForHttpStatus<HealthResponse>(apiA, '/ready', 503),
        waitForHttpStatus<HealthResponse>(apiB, '/ready', 503),
        waitForHttpStatus<HealthResponse>(apiA, '/health/ready', 503),
        waitForHttpStatus<HealthResponse>(apiB, '/health/ready', 503)
      ]);
      expect.soft(outageReadyA.status).toBe(503);
      expect.soft(outageReadyB.status).toBe(503);
      expect.soft(outageReadyAliasA.status).toBe(503);
      expect.soft(outageReadyAliasB.status).toBe(503);
      expect.soft(outageReadyA.body?.readiness?.ready).toBe(false);
      expect.soft(outageReadyB.body?.readiness?.ready).toBe(false);
      expectRedisDependency(outageReadyA, 'unhealthy');
      expectRedisDependency(outageReadyB, 'unhealthy');
      expectRedisDependency(outageReadyAliasA, 'unhealthy');
      expectRedisDependency(outageReadyAliasB, 'unhealthy');

      const [outageHealthA, outageHealthB, outageLiveA, outageLiveB] = await Promise.all([
        requestJson<HealthResponse>(apiA, '/health'),
        requestJson<HealthResponse>(apiB, '/health'),
        requestJson<HealthResponse>(apiA, '/live'),
        requestJson<HealthResponse>(apiB, '/live')
      ]);
      expect.soft(outageHealthA.body).toMatchObject({
        ok: false,
        redisHealthy: false,
        rateLimiterMode: 'fail-closed'
      });
      expect.soft(outageHealthB.body).toMatchObject({
        ok: false,
        redisHealthy: false,
        rateLimiterMode: 'fail-closed'
      });
      const outageMetrics = await requestJson<unknown>(apiA, '/metrics');
      expect(outageMetrics.status).toBe(200);
      expect(outageMetrics.text).toContain('app_redis_healthy 0');
      expect(outageMetrics.text).toContain('app_rate_limiter_mode{mode="fail-closed"} 1');
      expect(outageLiveA.status).toBe(200);
      expect(outageLiveA.body).toMatchObject({ liveness: { live: true } });
      expect(outageLiveB.status).toBe(200);
      expect(outageLiveB.body).toMatchObject({ liveness: { live: true } });

      const [loginDuringRedisOutageA, loginDuringRedisOutageB] = await Promise.all([
        requestJson<{ readonly code?: string; readonly accessToken?: string }>(
          apiA,
          '/auth/login',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword })
          }
        ),
        requestJson<{ readonly code?: string; readonly accessToken?: string }>(
          apiB,
          '/auth/login',
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ username: adminUsername, password: adminPassword })
          }
        )
      ]);
      for (const failedLogin of [loginDuringRedisOutageA, loginDuringRedisOutageB]) {
        expect.soft(failedLogin.status).toBe(503);
        expect.soft(failedLogin.body?.code).toBe('RATE_LIMIT_UNAVAILABLE');
        expect.soft(failedLogin.body?.accessToken).toBeUndefined();
        expect.soft(getSetCookieHeaders(failedLogin.headers)).toEqual([]);
      }

      const sessionDuringRedisOutage = await requestJson<AuthSessionResponse>(
        apiB,
        '/auth/session',
        { headers: { authorization: `Bearer ${refresh.body?.accessToken ?? ''}` } }
      );
      expect.soft(sessionDuringRedisOutage.status).toBe(200);
      expect.soft(sessionDuringRedisOutage.body?.session.sessionId).toBe(sessionIdBeforeRestart);

      const sessionsAfterFailedLogins = await requestJson<SessionListResponse>(
        apiB,
        '/auth/sessions',
        { headers: bearerHeaders(refresh.body?.accessToken ?? '') }
      );
      expect.soft(sessionsAfterFailedLogins.status).toBe(200);
      expect
        .soft(sessionsAfterFailedLogins.body?.items.map((session) => session.sessionId) ?? [])
        .toEqual(sessionIdsBeforeRedisOutage);

      await restoreRedisContainer();
      await Promise.all([waitForApi(apiA), waitForApi(apiB)]);
      const [restoredReadyA, restoredReadyB, restoredHealthA, restoredHealthB] = await Promise.all([
        requestJson<HealthResponse>(apiA, '/ready'),
        requestJson<HealthResponse>(apiB, '/ready'),
        requestJson<HealthResponse>(apiA, '/health'),
        requestJson<HealthResponse>(apiB, '/health')
      ]);
      expect(restoredReadyA.status).toBe(200);
      expect(restoredReadyB.status).toBe(200);
      expectRedisDependency(restoredReadyA, 'healthy');
      expectRedisDependency(restoredReadyB, 'healthy');
      expect(restoredHealthA.body).toMatchObject({
        ok: true,
        redisHealthy: true,
        rateLimiterMode: 'redis'
      });
      expect(restoredHealthB.body).toMatchObject({
        ok: true,
        redisHealthy: true,
        rateLimiterMode: 'redis'
      });
      const restoredMetrics = await requestJson<unknown>(apiB, '/metrics');
      expect(restoredMetrics.status).toBe(200);
      expect(restoredMetrics.text).toContain('app_redis_healthy 1');
      expect(restoredMetrics.text).toContain('app_rate_limiter_mode{mode="redis"} 1');

      const refreshAfterRedisRestore = await requestJson<BrowserSessionResponse>(
        apiA,
        '/auth/refresh',
        {
          method: 'POST',
          headers: { cookie: `cvg_his_refresh=${encodeURIComponent(rotatedRefreshCookie)}` },
          body: '{}'
        }
      );
      expect(refreshAfterRedisRestore.status).toBe(200);
      expect(refreshAfterRedisRestore.body?.accessToken).toEqual(expect.any(String));
      const restoredRefreshCookie = extractRefreshCookie(refreshAfterRedisRestore.headers);

      const logout = await requestJson<void>(apiB, '/auth/logout', {
        method: 'POST',
        headers: {
          ...bearerHeaders(refreshAfterRedisRestore.body?.accessToken ?? ''),
          cookie: `cvg_his_refresh=${encodeURIComponent(restoredRefreshCookie)}`
        },
        body: '{}'
      });
      expect(logout.status).toBe(204);
      const logoutCookies = getSetCookieHeaders(logout.headers).join('\n');
      expect(logoutCookies).toMatch(/cvg_his_refresh=;.*Max-Age=0/);
      expect(logoutCookies).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/);

      const refreshAfterLogoutA = await requestJson(apiA, '/auth/refresh', {
        method: 'POST',
        headers: { cookie: `cvg_his_refresh=${encodeURIComponent(restoredRefreshCookie)}` },
        body: '{}'
      });
      const refreshAfterLogoutB = await requestJson(apiB, '/auth/refresh', {
        method: 'POST',
        headers: { cookie: `cvg_his_refresh=${encodeURIComponent(restoredRefreshCookie)}` },
        body: '{}'
      });
      expect(refreshAfterLogoutA.status).toBe(401);
      expect(refreshAfterLogoutB.status).toBe(401);

      const revokedOnA = await requestJson(apiA, '/auth/session', {
        headers: { authorization: `Bearer ${refreshAfterRedisRestore.body?.accessToken ?? ''}` }
      });
      const revokedOnB = await requestJson(apiB, '/auth/session', {
        headers: { authorization: `Bearer ${refreshAfterRedisRestore.body?.accessToken ?? ''}` }
      });
      expect(revokedOnA.status).toBe(401);
      expect(revokedOnB.status).toBe(401);

      const setupAgain = await requestJson(apiA, '/auth/setup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token: bootstrapToken,
          clinicName,
          adminUsername,
          adminEmail,
          adminPassword,
          adminFullName: 'Setup Integration Administrator'
        })
      });
      expect(setupAgain.status).toBe(409);
    }, 120_000);
  }
);
