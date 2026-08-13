import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../apps/api/src/server.js';
import { getTestPool } from '../db/db-admin.js';
import { uuid } from '../helpers/db-helpers.js';
import { TEST_DB_URL } from '../setup/env.js';

interface LoginResponse {
  readonly accessToken: string;
}

interface OwnerResponse {
  readonly id: string;
}

interface PatientResponse {
  readonly id: string;
}

interface EncounterResponse {
  readonly id: string;
}

interface BillingRecordResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly status: string;
  readonly subtotalAmount: number;
}

interface BillingItemResponse {
  readonly id: string;
  readonly description: string;
  readonly totalAmount: number;
}

const TENANT_ID = uuid();
const ACCOUNT_ID = uuid();
const ACCOUNT_SLUG = `billing-api-${ACCOUNT_ID.slice(0, 8)}`;
const USER_ID = uuid();
const USERNAME = `billing-api-${USER_ID.slice(0, 8)}`;
const EMAIL = `${USERNAME}@example.com`;
const PASSWORD = 'seed_admin';

let server: ApiServer;
let baseUrl: string;
let accessToken: string;
let ownerId: string;
let patientId: string;
let encounterId: string;

async function seedAuthenticatedBillingUser(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, $2, 'Billing API Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID, `billing-api-${TENANT_ID.slice(0, 8)}`]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $2, $3, 'Billing API Account')
      ON CONFLICT (id) DO NOTHING
    `,
    [ACCOUNT_ID, TENANT_ID, ACCOUNT_SLUG]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES ($1, $2, $3, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Billing API User')
      ON CONFLICT (id) DO NOTHING
    `,
    [USER_ID, ACCOUNT_ID, EMAIL]
  );

  const roleResult = await pool.query<{ id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  let roleId = roleResult.rows[0]?.id;
  if (!roleId) {
    roleId = uuid();
    await pool.query(
      `
        INSERT INTO roles (id, name, description)
        VALUES ($1, 'admin', 'Acesso administrativo completo para testes Billing API')
      `,
      [roleId]
    );
  }

  await pool.query(
    `
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [USER_ID, roleId]
  );
}

async function cleanupFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM billing_items WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM billing_records WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM encounter_timeline WHERE encounter_id = $1', [encounterId ?? null]);
  await pool.query('DELETE FROM encounters WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM patients WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM owners WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM audit_events WHERE account_id = $1 OR actor_user_id = $2', [
    ACCOUNT_ID,
    USER_ID
  ]);
  await pool.query('DELETE FROM user_roles WHERE user_id = $1', [USER_ID]);
  await pool.query('DELETE FROM users WHERE id = $1', [USER_ID]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
}

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-tenant-id': TENANT_ID,
    'x-account-id': ACCOUNT_ID
  };
}

async function requestJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ status: number; body: T; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T) : (undefined as T);
  return { status: response.status, body, text };
}

async function postJson<T>(path: string, body: unknown): Promise<{ status: number; body: T }> {
  const response = await requestJson<T>(path, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return response;
}

beforeAll(async () => {
  await seedAuthenticatedBillingUser();

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-billing-api-db-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });

  expect(bootstrap.databaseHealthy).toBe(true);
  expect(bootstrap.repositories.billing?.constructor.name).toBe('DatabaseBillingRepository');

  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Billing API DB integration test runtime',
    productionReady: true,
    initialized: true
  });

  server = createApiServer({
    appName: 'billing-api-db-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'billing-api-db-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    pixMockMode: true,
    emailMockMode: true,
    smsMockMode: true,
    googleCalendarMockMode: true,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage
  });

  await server.ready;
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const login = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ accountSlug: ACCOUNT_SLUG, username: USERNAME, password: PASSWORD })
  });

  expect(login.status).toBe(200);
  accessToken = login.body.accessToken;

  const owner = await postJson<OwnerResponse>('/owners', {
    fullName: 'Billing API Owner',
    contacts: [
      {
        label: 'Celular',
        value: '+55 11 97777-0001',
        type: 'whatsapp',
        primary: true
      }
    ],
    financialResponsible: true
  });
  expect(owner.status).toBe(201);
  ownerId = owner.body.id;

  const patient = await postJson<PatientResponse>('/patients', {
    primaryOwnerId: ownerId,
    name: 'Billing API Patient',
    species: 'canine'
  });
  expect(patient.status).toBe(201);
  patientId = patient.body.id;

  const encounter = await postJson<EncounterResponse>('/encounters', {
    patientId,
    ownerId,
    visitType: 'walk_in',
    origin: 'reception',
    reason: 'Billing API database flow'
  });
  expect(encounter.status).toBe(201);
  encounterId = encounter.body.id;
});

afterAll(async () => {
  if (server) {
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

  await cleanupFixture();
  await shutdownServices();
});

describe('EP-BILL-1 Billing API with database runtime', () => {
  it('covers estimate, items, record read, item read and status update over HTTP', async () => {
    const estimate = await postJson<BillingRecordResponse>('/billing/estimate', {
      encounterId,
      administrativeNotes: 'Estimativa via API DB'
    });

    expect(estimate.status).toBe(200);
    expect(estimate.body.encounterId).toBe(encounterId);
    expect(estimate.body.status).toBe('estimated');
    expect(estimate.body.subtotalAmount).toBe(0);

    const item = await postJson<BillingItemResponse>('/billing/items', {
      encounterId,
      itemType: 'service',
      description: 'Consulta API DB',
      quantity: 2,
      unitPriceAmount: 90
    });

    expect(item.status).toBe(201);
    expect(item.body.description).toBe('Consulta API DB');
    expect(item.body.totalAmount).toBe(180);

    const record = await requestJson<BillingRecordResponse>(`/billing/${encounterId}`, {
      method: 'GET',
      headers: authHeaders()
    });

    expect(record.status).toBe(200);
    expect(record.body.id).toBe(estimate.body.id);
    expect(record.body.encounterId).toBe(encounterId);
    expect(record.body.subtotalAmount).toBe(180);

    const items = await requestJson<{ items: BillingItemResponse[] }>(
      `/billing/${encounterId}/items`,
      {
        method: 'GET',
        headers: authHeaders()
      }
    );

    expect(items.status).toBe(200);
    expect(items.body.items).toHaveLength(1);
    expect(items.body.items[0]?.description).toBe('Consulta API DB');
    expect(items.body.items[0]?.totalAmount).toBe(180);

    const statusUpdate = await requestJson<BillingRecordResponse>(
      `/billing/${encounterId}/status`,
      {
        method: 'PATCH',
        headers: {
          ...authHeaders(),
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          status: 'open',
          administrativeNotes: 'Aberto via API DB'
        })
      }
    );

    expect(statusUpdate.status).toBe(200);
    expect(statusUpdate.body.id).toBe(estimate.body.id);
    expect(statusUpdate.body.status).toBe('open');
    expect(statusUpdate.body.subtotalAmount).toBe(180);

    const persisted = await getTestPool().query<{
      record_count: number;
      item_count: number;
      status: string;
      subtotal_amount: string;
    }>(
      `
        SELECT
          COUNT(DISTINCT br.id)::int AS record_count,
          COUNT(bi.id)::int AS item_count,
          MAX(br.status) AS status,
          MAX(br.subtotal_amount)::text AS subtotal_amount
        FROM billing_records br
        LEFT JOIN billing_items bi ON bi.billing_record_id = br.id
        WHERE br.account_id = $1 AND br.encounter_id = $2
      `,
      [ACCOUNT_ID, encounterId]
    );

    expect(persisted.rows[0]?.record_count).toBe(1);
    expect(persisted.rows[0]?.item_count).toBe(1);
    expect(persisted.rows[0]?.status).toBe('open');
    expect(Number(persisted.rows[0]?.subtotal_amount)).toBe(180);
  });
});
