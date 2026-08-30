import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { getTestPool } from '../../db/db-admin.js';
import { uuid } from '../../helpers/db-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

interface LoginResponse {
  readonly accessToken: string;
  readonly principal: {
    readonly session: {
      readonly sessionId: string;
      readonly expiresAt: string;
      readonly refreshExpiresAt: string;
    };
  };
}

interface SessionListResponse {
  readonly items: ReadonlyArray<{
    readonly sessionId: string;
    readonly userId: string;
    readonly accountId: string;
    readonly active: boolean;
    readonly createdAt: string;
    readonly authTime: string;
    readonly expiresAt: string;
    readonly refreshExpiresAt: string;
  }>;
}

const TENANT_ID = uuid();
const ACCOUNT_ID = uuid();
const USER_ID = uuid();
const USERNAME = `session-list-${USER_ID.slice(0, 8)}`;
const EMAIL = `${USERNAME}@example.test`;
const PASSWORD = 'seed_admin';
const PUBLIC_SESSION_KEYS = [
  'accountId',
  'active',
  'authTime',
  'createdAt',
  'expiresAt',
  'refreshExpiresAt',
  'sessionId',
  'userId'
];

let serverA: ApiServer | undefined;
let serverB: ApiServer | undefined;
let baseUrlA = '';
let baseUrlB = '';

async function seedAuthenticatedUser(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, $2, 'Authoritative Session Tenant', 'active')
    `,
    [TENANT_ID, `session-list-${TENANT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $2, $3, 'Authoritative Session Account')
    `,
    [ACCOUNT_ID, TENANT_ID, `session-list-${ACCOUNT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `
      INSERT INTO users (id, account_id, username, email, password_hash, full_name)
      VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Authoritative Session User')
    `,
    [USER_ID, ACCOUNT_ID, USERNAME, EMAIL]
  );

  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) {
    throw new Error('The canonical admin role is required for the session-list integration test');
  }
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    USER_ID,
    role.rows[0].id
  ]);
}

async function cleanupFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM audit_events WHERE account_id = $1 OR actor_user_id = $2', [
    ACCOUNT_ID,
    USER_ID
  ]);
  await pool.query('DELETE FROM sessions WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM user_roles WHERE user_id = $1', [USER_ID]);
  await pool.query('DELETE FROM users WHERE id = $1', [USER_ID]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
}

async function startServer(server: ApiServer): Promise<string> {
  await server.ready;
  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', (error?: Error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

async function stopServer(server: ApiServer | undefined): Promise<void> {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function requestJson<T>(
  baseUrl: string,
  pathname: string,
  init: RequestInit = {}
): Promise<{
  readonly status: number;
  readonly body: T;
  readonly text: string;
  readonly headers: Headers;
}> {
  const response = await fetch(`${baseUrl}${pathname}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as T) : (undefined as T),
    text,
    headers: response.headers
  };
}

function cookiePair(setCookie: string | null): string {
  if (!setCookie) {
    throw new Error('Expected the login response to issue the refresh cookie');
  }
  return setCookie.split(';', 1)[0] ?? setCookie;
}

function assertNewestFirst(items: ReadonlyArray<SessionListResponse['items'][number]>): void {
  for (let index = 1; index < items.length; index += 1) {
    const previous = items[index - 1];
    const current = items[index];
    const previousCreatedAt = Date.parse(previous.createdAt);
    const currentCreatedAt = Date.parse(current.createdAt);
    expect(previousCreatedAt).toBeGreaterThanOrEqual(currentCreatedAt);
    if (previousCreatedAt !== currentCreatedAt) continue;

    const previousAuthTime = Date.parse(previous.authTime);
    const currentAuthTime = Date.parse(current.authTime);
    expect(previousAuthTime).toBeGreaterThanOrEqual(currentAuthTime);
    if (previousAuthTime === currentAuthTime) {
      expect(previous.sessionId >= current.sessionId).toBe(true);
    }
  }
}

function assertPublicSessionShape(item: SessionListResponse['items'][number]): void {
  expect(Object.keys(item).sort()).toEqual(PUBLIC_SESSION_KEYS);
}

function bearerHeaders(accessToken: string): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-tenant-id': TENANT_ID,
    'x-account-id': ACCOUNT_ID
  };
}

beforeAll(async () => {
  await seedAuthenticatedUser();
  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-session-list-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });
  expect(bootstrap.databaseHealthy).toBe(true);
  expect(bootstrap.repositories.session?.constructor.name).toBe('DatabaseSessionRepository');

  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Authoritative session-list integration test runtime',
    productionReady: true,
    initialized: true
  });

  const options = {
    environment: 'test',
    version: '0.1.0',
    authSecret: 'authoritative-session-list-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    preserveSeedUsersWithRepository: false,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork
  } as const;
  serverA = createApiServer({ appName: 'session-list-a', ...options });
  serverB = createApiServer({ appName: 'session-list-b', ...options });
  [baseUrlA, baseUrlB] = await Promise.all([startServer(serverA), startServer(serverB)]);
});

afterAll(async () => {
  await Promise.all([stopServer(serverA), stopServer(serverB)]);
  await cleanupFixture();
  await shutdownServices();
});

describe('CVG-001 authoritative session list', () => {
  it('observes creation and revocation performed by another API instance', async () => {
    const firstLogin = await requestJson<LoginResponse>(baseUrlA, '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    expect(firstLogin.status).toBe(200);

    const firstSessionId = firstLogin.body.principal.session.sessionId;
    const secondLogin = await requestJson<LoginResponse>(baseUrlA, '/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: USERNAME, password: PASSWORD })
    });
    expect(secondLogin.status).toBe(200);
    const secondSessionId = secondLogin.body.principal.session.sessionId;
    expect(secondSessionId).not.toBe(firstSessionId);

    const listAfterCreation = await requestJson<SessionListResponse>(baseUrlB, '/auth/sessions', {
      headers: bearerHeaders(firstLogin.body.accessToken)
    });
    expect(listAfterCreation.status).toBe(200);
    expect(listAfterCreation.body.items).toHaveLength(2);
    listAfterCreation.body.items.forEach(assertPublicSessionShape);
    expect(listAfterCreation.body.items.map((session) => session.sessionId)).toEqual(
      expect.arrayContaining([firstSessionId, secondSessionId])
    );
    assertNewestFirst(listAfterCreation.body.items);

    const firstBeforeRefresh = listAfterCreation.body.items.find(
      (session) => session.sessionId === firstSessionId
    );
    expect(firstBeforeRefresh).toBeDefined();

    const refresh = await requestJson<LoginResponse>(baseUrlA, '/auth/refresh', {
      method: 'POST',
      headers: { cookie: cookiePair(firstLogin.headers.get('set-cookie')) }
    });
    expect(refresh.status).toBe(200);
    expect(refresh.body.principal.session.sessionId).toBe(firstSessionId);

    const revoke = await requestJson<{ readonly revoked: boolean }>(
      baseUrlA,
      `/auth/sessions/${firstSessionId}/revoke`,
      {
        method: 'POST',
        headers: bearerHeaders(secondLogin.body.accessToken)
      }
    );
    expect(revoke.status).toBe(200);
    expect(revoke.body).toEqual({ revoked: true, sessionId: firstSessionId });

    const listAfterRevocation = await requestJson<SessionListResponse>(baseUrlB, '/auth/sessions', {
      headers: bearerHeaders(secondLogin.body.accessToken)
    });
    expect(listAfterRevocation.status).toBe(200);
    expect(listAfterRevocation.body.items).toHaveLength(2);
    listAfterRevocation.body.items.forEach(assertPublicSessionShape);
    assertNewestFirst(listAfterRevocation.body.items);
    expect(listAfterRevocation.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sessionId: firstSessionId,
          active: false,
          expiresAt: refresh.body.principal.session.expiresAt,
          refreshExpiresAt: refresh.body.principal.session.refreshExpiresAt
        }),
        expect.objectContaining({ sessionId: secondSessionId, active: true })
      ])
    );
  }, 60_000);
});
