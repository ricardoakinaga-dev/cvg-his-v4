import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const USER_ID = randomUUID();
const LIMITED_USER_ID = randomUUID();
const FOREIGN_TENANT_ID = randomUUID();
const FOREIGN_ACCOUNT_ID = randomUUID();
const FOREIGN_USER_ID = randomUUID();
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const ENCOUNTER_ID = randomUUID();
const CASH_REGISTER_ID = randomUUID();
const BILLING_RECORD_ID = randomUUID();
const BILLING_ITEM_ID = randomUUID();
const USERNAME = `cash-http-${USER_ID.slice(0, 8)}`;
const EMAIL = `${USERNAME}@example.com`;
const LIMITED_USERNAME = `cash-http-limited-${LIMITED_USER_ID.slice(0, 8)}`;
const LIMITED_EMAIL = `${LIMITED_USERNAME}@example.com`;
const FOREIGN_USERNAME = `cash-http-foreign-${FOREIGN_USER_ID.slice(0, 8)}`;
const FOREIGN_EMAIL = `${FOREIGN_USERNAME}@example.com`;
const AMOUNT = 125.5;
const HTTP_OPERATION = 'encounter.cash-receipt.create';

let server: ApiServer | undefined;
let baseUrl = '';
let accessToken = '';
let limitedAccessToken = '';
let foreignAccessToken = '';
let receiptId = '';

interface LoginResponse {
  readonly accessToken: string;
}

interface ReceiptResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly amount: number;
  readonly billingRecordId: string;
  readonly cashMovementId: string;
  readonly journalEntryId: string;
}

interface ReversalResponse {
  readonly id: string;
  readonly receiptId: string;
  readonly encounterId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly reason: string;
}

async function seedFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Cash receipt HTTP tenant', 'active')`,
    [TENANT_ID, `cash-http-tenant-${TENANT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Cash receipt HTTP account')`,
    [ACCOUNT_ID, TENANT_ID, `cash-http-account-${ACCOUNT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Cash HTTP Operator', true)`,
    [USER_ID, ACCOUNT_ID, USERNAME, EMAIL]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Cash HTTP Limited Operator', true)`,
    [LIMITED_USER_ID, ACCOUNT_ID, LIMITED_USERNAME, LIMITED_EMAIL]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    USER_ID,
    role.rows[0].id
  ]);
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Cash HTTP Owner')`,
    [OWNER_ID, ACCOUNT_ID]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Cash HTTP Patient', 'canine')`,
    [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id,
       closed_by_user_id, closed_at
     ) VALUES ($1, $2, $3, $4, 'closed', $5, $5, clock_timestamp())`,
    [ENCOUNTER_ID, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status,
       subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [BILLING_RECORD_ID, ACCOUNT_ID, ENCOUNTER_ID, PATIENT_ID, OWNER_ID, AMOUNT]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type,
       description, quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta HTTP', 1, $5, $5, $6)`,
    [BILLING_ITEM_ID, ACCOUNT_ID, BILLING_RECORD_ID, ENCOUNTER_ID, AMOUNT, USER_ID]
  );
  await pool.query(
    `INSERT INTO cash_registers (
       id, account_id, opened_by_user_id, opening_amount, status
     ) VALUES ($1, $2, $3, 50, 'open')`,
    [CASH_REGISTER_ID, ACCOUNT_ID, USER_ID]
  );
}

async function seedForeignFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Cash receipt foreign tenant', 'active')`,
    [FOREIGN_TENANT_ID, `cash-http-foreign-tenant-${FOREIGN_TENANT_ID.slice(0, 8)}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Cash receipt foreign account')`,
    [
      FOREIGN_ACCOUNT_ID,
      FOREIGN_TENANT_ID,
      `cash-http-foreign-account-${FOREIGN_ACCOUNT_ID.slice(0, 8)}`
    ]
  );
  const poolRole = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!poolRole.rows[0]) throw new Error('admin role is missing from the test seed');
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', 'Cash HTTP Foreign Operator', true)`,
    [FOREIGN_USER_ID, FOREIGN_ACCOUNT_ID, FOREIGN_USERNAME, FOREIGN_EMAIL]
  );
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    FOREIGN_USER_ID,
    poolRole.rows[0].id
  ]);
}

async function requestJson<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as T) : undefined,
    text
  };
}

function authHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${accessToken}`,
    'x-tenant-id': TENANT_ID,
    'x-account-id': ACCOUNT_ID
  };
}

function limitedAuthHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${limitedAccessToken}`,
    'x-tenant-id': TENANT_ID,
    'x-account-id': ACCOUNT_ID
  };
}

function foreignAuthHeaders(): HeadersInit {
  return {
    authorization: `Bearer ${foreignAccessToken}`,
    'x-tenant-id': FOREIGN_TENANT_ID,
    'x-account-id': FOREIGN_ACCOUNT_ID
  };
}

async function postReceipt(
  idempotencyKey: string,
  expectedAmount = AMOUNT
): Promise<{ status: number; body?: ReceiptResponse; text: string }> {
  return postReceiptAs(authHeaders(), idempotencyKey, expectedAmount);
}

async function postReceiptAs(
  headers: HeadersInit,
  idempotencyKey: string,
  expectedAmount = AMOUNT
): Promise<{ status: number; body?: ReceiptResponse; text: string }> {
  return requestJson<ReceiptResponse>(`/encounters/${ENCOUNTER_ID}/cash-receipts`, {
    method: 'POST',
    headers: {
      ...headers,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey
    },
    body: JSON.stringify({
      cashRegisterId: CASH_REGISTER_ID,
      expectedAmount,
      notes: 'Pagamento HTTP em dinheiro'
    })
  });
}

async function postReversal(
  receiptId: string,
  idempotencyKey: string,
  headers: HeadersInit = authHeaders()
): Promise<{ status: number; body?: ReversalResponse; text: string }> {
  return requestJson<ReversalResponse>(
    `/encounters/${ENCOUNTER_ID}/cash-receipts/${receiptId}/reverse`,
    {
      method: 'POST',
      headers: {
        ...headers,
        'content-type': 'application/json',
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ reason: 'Correção HTTP de caixa' })
    }
  );
}

beforeAll(async () => {
  await seedFixture();
  await seedForeignFixture();
  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-cash-http-')),
    maxRetries: 10,
    retryDelayMs: 1000
  });
  if (!bootstrap.databaseHealthy || !bootstrap.unitOfWork) {
    throw new Error(`Database/UoW unavailable: ${bootstrap.databaseDetail}`);
  }

  setAppState({
    persistenceMode: 'database',
    databaseConfigured: true,
    databaseHealthy: true,
    databaseDetail: bootstrap.databaseDetail,
    repositoriesReady: true,
    repositoryCount: Object.values(bootstrap.repositories).filter(Boolean).length,
    workerReady: true,
    workerDetail: 'Cash receipt HTTP integration test runtime',
    productionReady: true,
    initialized: true
  });

  server = createApiServer({
    appName: 'cash-receipt-http-test',
    environment: 'test',
    version: '0.1.0',
    authSecret: 'cash-receipt-http-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  });
  await server.ready;
  await new Promise<void>((resolve) => {
    server?.listen(0, '127.0.0.1', () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const login = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: 'seed_admin' })
  });
  if (login.status !== 200 || !login.body?.accessToken) {
    throw new Error(`HTTP fixture login failed: ${login.status} ${login.text}`);
  }
  accessToken = login.body.accessToken;

  const limitedLogin = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: LIMITED_USERNAME, password: 'seed_admin' })
  });
  if (limitedLogin.status !== 200 || !limitedLogin.body?.accessToken) {
    throw new Error(
      `Limited HTTP fixture login failed: ${limitedLogin.status} ${limitedLogin.text}`
    );
  }
  limitedAccessToken = limitedLogin.body.accessToken;

  const foreignLogin = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: FOREIGN_USERNAME, password: 'seed_admin' })
  });
  if (foreignLogin.status !== 200 || !foreignLogin.body?.accessToken) {
    throw new Error(
      `Foreign HTTP fixture login failed: ${foreignLogin.status} ${foreignLogin.text}`
    );
  }
  foreignAccessToken = foreignLogin.body.accessToken;
});

afterAll(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) => {
      server?.close((error) => (error ? reject(error) : resolve()));
    });
  }
  // The integration harness drops ephemeral databases in globalTeardown. The
  // receipt and audit tables are intentionally append-only, so this test does
  // not issue destructive cleanup statements against them.
  await shutdownServices();
});

describe('cash receipt HTTP PostgreSQL boundary', () => {
  it('commits the full receipt graph and replays idempotently through the published route', async () => {
    const idempotencyKey = randomUUID();
    const first = await postReceipt(idempotencyKey);
    const replay = await postReceipt(idempotencyKey);
    const conflict = await postReceipt(idempotencyKey, AMOUNT + 1);

    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      encounterId: ENCOUNTER_ID,
      amount: AMOUNT,
      billingRecordId: BILLING_RECORD_ID
    });
    if (!first.body) throw new Error(`Receipt was not returned: ${first.text}`);
    receiptId = first.body.id;
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(conflict.status).toBe(409);

    const state = await getTestPool().query<{
      readonly receipts: number;
      readonly payments: number;
      readonly movements: number;
      readonly journalEntries: number;
      readonly audits: number;
      readonly outboxEvents: number;
      readonly idempotencyRows: number;
      readonly billingStatus: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2) AS "receipts",
         (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2) AS "payments",
         (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND cash_register_id = $3 AND movement_type = 'payment') AS "movements",
         (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS "journalEntries",
         (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter_cash_receipt') AS "audits",
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.created') AS "outboxEvents",
         (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $5 AND idempotency_key = $4 AND status = 'completed') AS "idempotencyRows",
         (SELECT status FROM billing_records WHERE account_id = $1 AND encounter_id = $2) AS "billingStatus"`,
      [ACCOUNT_ID, ENCOUNTER_ID, CASH_REGISTER_ID, idempotencyKey, HTTP_OPERATION]
    );

    expect(state.rows[0]).toEqual({
      receipts: 1,
      payments: 1,
      movements: 1,
      journalEntries: 1,
      audits: 1,
      outboxEvents: 1,
      idempotencyRows: 1,
      billingStatus: 'settled'
    });
  });

  it('reverses through the published route, replays idempotently and reopens only financial projections', async () => {
    const idempotencyKey = randomUUID();
    const first = await postReversal(receiptId, idempotencyKey);
    const replay = await postReversal(receiptId, idempotencyKey);
    const unauthorizedReplay = await postReversal(receiptId, idempotencyKey, limitedAuthHeaders());

    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      receiptId,
      encounterId: ENCOUNTER_ID,
      amount: AMOUNT,
      currency: 'BRL',
      reason: 'Correção HTTP de caixa'
    });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    expect(unauthorizedReplay.status).toBe(403);

    const state = await getTestPool().query<{
      readonly receipts: number;
      readonly reversals: number;
      readonly payments: number;
      readonly withdrawals: number;
      readonly reversalJournals: number;
      readonly reversalAudits: number;
      readonly reversalOutbox: number;
      readonly billingStatus: string;
      readonly financialStatus: string;
      readonly receivableStatus: string;
      readonly encounterStatus: string;
      readonly runningBalance: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2) AS "receipts",
         (SELECT COUNT(*)::int FROM encounter_cash_receipt_reversals WHERE account_id = $1 AND receipt_id = $3) AS "reversals",
         (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2) AS "payments",
         (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND cash_register_id = $4 AND movement_type = 'withdrawal') AS "withdrawals",
         (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt_reversal') AS "reversalJournals",
         (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter_cash_receipt_reversal') AS "reversalAudits",
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.reversed') AS "reversalOutbox",
         (SELECT status FROM billing_records WHERE account_id = $1 AND encounter_id = $2) AS "billingStatus",
         (SELECT financial_status FROM encounter_financial_accounts WHERE account_id = $1 AND encounter_id = $2) AS "financialStatus",
         (SELECT status FROM encounter_receivables WHERE account_id = $1 AND encounter_id = $2) AS "receivableStatus",
         (SELECT status FROM encounters WHERE account_id = $1 AND id = $2) AS "encounterStatus",
         (SELECT running_balance FROM cash_movements WHERE account_id = $1 AND cash_register_id = $4 ORDER BY created_at DESC, id DESC LIMIT 1) AS "runningBalance"`,
      [ACCOUNT_ID, ENCOUNTER_ID, receiptId, CASH_REGISTER_ID]
    );
    expect(state.rows[0]).toEqual({
      receipts: 1,
      reversals: 1,
      payments: 1,
      withdrawals: 1,
      reversalJournals: 1,
      reversalAudits: 1,
      reversalOutbox: 1,
      billingStatus: 'open',
      financialStatus: 'pending',
      receivableStatus: 'open',
      encounterStatus: 'closed',
      runningBalance: '50.00'
    });

    const detail = await requestJson<
      ReceiptResponse & {
        readonly reversalId: string;
        readonly reversalReason: string;
      }
    >(`/encounters/${ENCOUNTER_ID}/cash-receipts/${receiptId}`, {
      method: 'GET',
      headers: authHeaders()
    });
    expect(detail.status).toBe(200);
    expect(detail.body).toMatchObject({
      id: receiptId,
      reversalId: first.body?.id,
      reversalReason: 'Correção HTTP de caixa'
    });

    const summary = await requestJson<{
      readonly financialStatus: string;
      readonly financialClosed: boolean;
      readonly paidAmount: number;
      readonly balanceDue: number;
      readonly receivable: { readonly status: string } | null;
    }>(`/encounters/${ENCOUNTER_ID}/financial-summary`, {
      method: 'GET',
      headers: authHeaders()
    });
    expect(summary.status).toBe(200);
    expect(summary.body).toMatchObject({
      financialStatus: 'pending',
      financialClosed: false,
      paidAmount: 0,
      balanceDue: AMOUNT,
      receivable: { status: 'open' }
    });

    const close = await requestJson<{ readonly financialClosed: boolean }>(
      `/encounters/${ENCOUNTER_ID}/financial-close`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'content-type': 'application/json',
          'idempotency-key': randomUUID()
        },
        body: JSON.stringify({
          installments: [{ amount: AMOUNT, label: 'Parcela reaberta' }]
        })
      }
    );
    expect(close.status).toBe(200);
    expect(close.body?.financialClosed).toBe(true);

    const historicalPaymentState = await getTestPool().query<{ readonly count: number }>(
      `SELECT COUNT(*)::int AS count
         FROM encounter_receivable_payments
        WHERE account_id = $1 AND encounter_id = $2`,
      [ACCOUNT_ID, ENCOUNTER_ID]
    );
    expect(historicalPaymentState.rows[0]?.count).toBe(1);
  });

  it('keeps the published receipt route opaque across tenants', async () => {
    const foreignKey = randomUUID();
    const read = await requestJson<{ readonly code: string }>(
      `/encounters/${ENCOUNTER_ID}/cash-receipts`,
      {
        method: 'GET',
        headers: foreignAuthHeaders()
      }
    );
    const create = await postReceiptAs(foreignAuthHeaders(), foreignKey);

    expect(read.status).toBe(404);
    expect(read.body?.code).toBe('CASH_RECEIPT_NOT_FOUND');
    expect(create.status).toBe(404);
    expect(create.body).toMatchObject({ code: 'BILLING_RECORD_NOT_FOUND' });

    const state = await getTestPool().query<{
      readonly foreignReceipts: number;
      readonly foreignIdempotencyRows: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int
            FROM encounter_cash_receipts
           WHERE account_id = $1 AND encounter_id = $2) AS "foreignReceipts",
         (SELECT COUNT(*)::int
            FROM idempotency_requests
           WHERE account_id = $1
             AND operation = $3
             AND idempotency_key = $4) AS "foreignIdempotencyRows"`,
      [FOREIGN_ACCOUNT_ID, ENCOUNTER_ID, HTTP_OPERATION, foreignKey]
    );

    expect(state.rows[0]).toEqual({
      foreignReceipts: 0,
      foreignIdempotencyRows: 0
    });
  });
});
