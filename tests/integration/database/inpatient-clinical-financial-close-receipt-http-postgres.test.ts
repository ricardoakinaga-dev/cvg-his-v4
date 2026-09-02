import { randomUUID } from 'node:crypto';
import { mkdtempSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setAppState } from '../../../apps/api/src/app-state.js';
import { bootstrapServices, shutdownServices } from '../../../apps/api/src/bootstrap.js';
import { createApiServer, type ApiServer } from '../../../apps/api/src/server.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_A = randomUUID();
const ACCOUNT_A = randomUUID();
const USER_A = randomUUID();
const OWNER_A = randomUUID();
const PATIENT_A = randomUUID();
const CLOSE_PATIENT_A = randomUUID();
const RACE_PATIENT_A = randomUUID();
const ROLLBACK_PATIENT_A = randomUUID();
const CLOSE_ENCOUNTER_ID = randomUUID();
const RECEIPT_ENCOUNTER_ID = randomUUID();
const RACE_ENCOUNTER_ID = randomUUID();
const ROLLBACK_ENCOUNTER_ID = randomUUID();
const BILLING_RECORD_ID = randomUUID();
const BILLING_ITEM_ID = randomUUID();
const CASH_REGISTER_ID = randomUUID();
const COUNTER_SALE_AMOUNT = 80;

const TENANT_B = randomUUID();
const ACCOUNT_B = randomUUID();
const USER_B = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_B = randomUUID();
const FOREIGN_ENCOUNTER_ID = randomUUID();

const USERNAME_A = `close-receipt-${USER_A.slice(0, 8)}`;
const USERNAME_B = `close-receipt-foreign-${USER_B.slice(0, 8)}`;
const AMOUNT = 125.5;
const CLOSE_OPERATION = `POST /encounters/${CLOSE_ENCOUNTER_ID}/close`;
const RECEIPT_CLOSE_OPERATION = `POST /encounters/${RECEIPT_ENCOUNTER_ID}/close`;
const RECEIPT_OPERATION = 'encounter.cash-receipt.create';
const RACE_CLOSE_OPERATION = `POST /encounters/${RACE_ENCOUNTER_ID}/close`;
const ROLLBACK_CONSTRAINT = 'close_receipt_rollback_guard';

let server: ApiServer | undefined;
let secondaryServer: ApiServer | undefined;
let baseUrl = '';
let secondaryBaseUrl = '';
let accessTokenA = '';
let accessTokenB = '';

interface LoginResponse {
  readonly accessToken: string;
}

interface EncounterResponse {
  readonly id: string;
  readonly accountId: string;
  readonly status: string;
  readonly closeReason?: string;
}

interface ReceiptResponse {
  readonly id: string;
  readonly encounterId: string;
  readonly amount: number;
  readonly billingRecordId: string;
}

interface JsonResponse<T> {
  readonly status: number;
  readonly body?: T;
  readonly text: string;
}

async function requestJsonAt<T>(
  origin: string,
  path: string,
  init: RequestInit = {}
): Promise<JsonResponse<T>> {
  const response = await fetch(`${origin}${path}`, init);
  const text = await response.text();
  return {
    status: response.status,
    body: text.length > 0 ? (JSON.parse(text) as T) : undefined,
    text
  };
}

async function requestJson<T>(path: string, init: RequestInit = {}): Promise<JsonResponse<T>> {
  return requestJsonAt(baseUrl, path, init);
}

function authHeaders(token: string, tenantId: string, accountId: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    'x-tenant-id': tenantId,
    'x-account-id': accountId,
    'content-type': 'application/json'
  };
}

async function seedTenant(input: {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly username: string;
  readonly label: string;
  readonly encounterIds: readonly string[];
  readonly encounterPatientIds: readonly string[];
}): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, $3, 'active')`,
    [input.tenantId, `close-receipt-${input.tenantId.slice(0, 8)}`, input.label]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [
      input.accountId,
      input.tenantId,
      `close-receipt-${input.accountId.slice(0, 8)}`,
      `${input.label} account`
    ]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name, is_active
     ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:seed_admin', $5, true)`,
    [
      input.userId,
      input.accountId,
      input.username,
      `${input.username}@example.test`,
      `${input.label} operator`
    ]
  );
  const role = await pool.query<{ readonly id: string }>(
    `SELECT id FROM roles WHERE name = 'admin' ORDER BY created_at LIMIT 1`
  );
  if (!role.rows[0]) throw new Error('admin role is missing from the test seed');
  await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [
    input.userId,
    role.rows[0].id
  ]);
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    input.ownerId,
    input.accountId,
    `${input.label} owner`
  ]);
  if (input.encounterIds.length !== input.encounterPatientIds.length) {
    throw new Error('Close-receipt fixture encounter and patient counts must match');
  }
  for (const patientId of new Set([input.patientId, ...input.encounterPatientIds])) {
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $2, $3, $4, 'canine')`,
      [patientId, input.accountId, input.ownerId, `${input.label} patient ${patientId.slice(0, 8)}`]
    );
  }
  for (const [index, encounterId] of input.encounterIds.entries()) {
    await pool.query(
      `INSERT INTO encounters (
         id, account_id, patient_id, owner_id, status, opened_by_user_id, reason
       ) VALUES ($1, $2, $3, $4, 'open', $5, 'Consulta hospitalar')`,
      [encounterId, input.accountId, input.encounterPatientIds[index], input.ownerId, input.userId]
    );
  }
}

async function seedFinancialGraph(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status,
       subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [BILLING_RECORD_ID, ACCOUNT_A, RECEIPT_ENCOUNTER_ID, PATIENT_A, OWNER_A, AMOUNT]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type,
       description, quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta hospitalar', 1, $5, $5, $6)`,
    [BILLING_ITEM_ID, ACCOUNT_A, BILLING_RECORD_ID, RECEIPT_ENCOUNTER_ID, AMOUNT, USER_A]
  );
  await pool.query(
    `INSERT INTO cash_registers (
       id, account_id, opened_by_user_id, opening_amount, status
     ) VALUES ($1, $2, $3, 50, 'open')`,
    [CASH_REGISTER_ID, ACCOUNT_A, USER_A]
  );
}

async function login(username: string): Promise<string> {
  const response = await requestJson<LoginResponse>('/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password: 'seed_admin' })
  });
  if (response.status !== 200 || !response.body?.accessToken) {
    throw new Error(`Close/receipt fixture login failed: ${response.status} ${response.text}`);
  }
  return response.body.accessToken;
}

async function postClose(
  encounterId: string,
  idempotencyKey: string,
  closeReason = 'Alta clínica confirmada',
  origin = baseUrl,
  token = accessTokenA,
  tenantId = TENANT_A,
  accountId = ACCOUNT_A
): Promise<JsonResponse<EncounterResponse & { readonly code?: string }>> {
  return requestJsonAt<EncounterResponse & { readonly code?: string }>(
    origin,
    `/encounters/${encounterId}/close`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token, tenantId, accountId),
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({ closeReason })
    }
  );
}

async function postReceipt(
  idempotencyKey: string
): Promise<JsonResponse<ReceiptResponse & { readonly code?: string }>> {
  return requestJson<ReceiptResponse & { readonly code?: string }>(
    `/encounters/${RECEIPT_ENCOUNTER_ID}/cash-receipts`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
        'idempotency-key': idempotencyKey
      },
      body: JSON.stringify({
        cashRegisterId: CASH_REGISTER_ID,
        expectedAmount: AMOUNT,
        notes: 'Recebimento após alta clínica'
      })
    }
  );
}

beforeAll(async () => {
  await seedTenant({
    tenantId: TENANT_A,
    accountId: ACCOUNT_A,
    userId: USER_A,
    ownerId: OWNER_A,
    patientId: PATIENT_A,
    username: USERNAME_A,
    label: 'Close receipt A',
    encounterIds: [
      CLOSE_ENCOUNTER_ID,
      RECEIPT_ENCOUNTER_ID,
      RACE_ENCOUNTER_ID,
      ROLLBACK_ENCOUNTER_ID
    ],
    encounterPatientIds: [CLOSE_PATIENT_A, PATIENT_A, RACE_PATIENT_A, ROLLBACK_PATIENT_A]
  });
  await seedTenant({
    tenantId: TENANT_B,
    accountId: ACCOUNT_B,
    userId: USER_B,
    ownerId: OWNER_B,
    patientId: PATIENT_B,
    username: USERNAME_B,
    label: 'Close receipt B',
    encounterIds: [FOREIGN_ENCOUNTER_ID],
    encounterPatientIds: [PATIENT_B]
  });
  await seedFinancialGraph();
  await getTestPool().query(
    `ALTER TABLE encounters
       ADD CONSTRAINT ${ROLLBACK_CONSTRAINT}
       CHECK (NOT (id = '${ROLLBACK_ENCOUNTER_ID}'::uuid AND status = 'closed'))`
  );

  const bootstrap = await bootstrapServices({
    databaseUrl: TEST_DB_URL,
    fileStoragePath: mkdtempSync(join(tmpdir(), 'cvg-his-v2-close-receipt-http-')),
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
    workerDetail: 'Close and receipt HTTP integration test runtime',
    productionReady: true,
    initialized: true
  });

  const serverOptions = {
    environment: 'test' as const,
    version: '0.1.0',
    authSecret: 'close-receipt-http-test-secret',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    repositories: bootstrap.repositories,
    fileStorage: bootstrap.fileStorage,
    unitOfWork: bootstrap.unitOfWork,
    preserveSeedUsersWithRepository: false,
    preserveSeedMasterDataWithRepository: false
  };
  server = createApiServer({ appName: 'close-receipt-http-test', ...serverOptions });
  await server.ready;
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', () => resolve()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  secondaryServer = createApiServer({
    appName: 'close-receipt-http-test-secondary',
    ...serverOptions
  });
  await secondaryServer.ready;
  await new Promise<void>((resolve) => secondaryServer?.listen(0, '127.0.0.1', () => resolve()));
  secondaryBaseUrl = `http://127.0.0.1:${(secondaryServer.address() as AddressInfo).port}`;

  accessTokenA = await login(USERNAME_A);
  accessTokenB = await login(USERNAME_B);
});

afterAll(async () => {
  if (server?.listening) {
    await new Promise<void>((resolve, reject) =>
      server?.close((error) => (error ? reject(error) : resolve()))
    );
  }
  if (secondaryServer?.listening) {
    await new Promise<void>((resolve, reject) =>
      secondaryServer?.close((error) => (error ? reject(error) : resolve()))
    );
  }
  await getTestPool().query(
    `ALTER TABLE encounters DROP CONSTRAINT IF EXISTS ${ROLLBACK_CONSTRAINT}`
  );
  await shutdownServices();
});

describe('inpatient clinical-financial close → receipt HTTP PostgreSQL boundary', () => {
  it('completes queue transfer → clinical comanda → payment → immutable comanda receipt', async () => {
    const queueResponse = await requestJson<{ readonly id: string }>('/queue/check-in', {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      body: JSON.stringify({
        patientId: PATIENT_A,
        ownerId: OWNER_A,
        reason: 'Fluxo vertical de comanda',
        priority: 'high'
      })
    });
    expect(queueResponse.status).toBe(201);
    const queueEntryId = queueResponse.body?.id;
    expect(queueEntryId).toBeTruthy();

    const called = await requestJson(`/queue/${queueEntryId}/call`, {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A)
    });
    expect(called.status).toBe(200);

    const transfer = await requestJson<{
      readonly id: string;
      readonly operationalStatus: string;
    }>(`/queue/${queueEntryId}/transfer`, {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      body: JSON.stringify({
        toSector: 'consultorio',
        reason: 'Recepcao para atendimento'
      })
    });
    expect(transfer.status).toBe(200);
    expect(transfer.body?.operationalStatus).toBe('waiting_handoff');

    const transfers = await requestJson<{
      readonly items: readonly [{ readonly id: string; readonly status: string }];
    }>(`/queue/${queueEntryId}/transfers`, {
      method: 'GET',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A)
    });
    expect(transfers.status).toBe(200);
    expect(transfers.body?.items[0]?.status).toBe('sent');

    const received = await requestJson<{ readonly operationalStatus: string }>(
      `/queue/${queueEntryId}/transfers/${transfers.body?.items[0]?.id}/receive`,
      {
        method: 'POST',
        headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A)
      }
    );
    expect(received.status).toBe(200);
    expect(received.body?.operationalStatus).toBe('called');

    const sale = await requestJson<{
      readonly id: string;
      readonly patientId: string | null;
      readonly queueEntryId: string | null;
    }>('/counter-sales', {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      body: JSON.stringify({
        ownerId: OWNER_A,
        patientId: PATIENT_A,
        queueEntryId,
        notes: 'Comanda do atendimento'
      })
    });
    expect(sale.status).toBe(201);
    expect(sale.body).toMatchObject({
      patientId: PATIENT_A,
      queueEntryId
    });
    const saleId = sale.body?.id;
    expect(saleId).toBeTruthy();

    const item = await requestJson(`/counter-sales/${saleId}/items`, {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      body: JSON.stringify({
        itemType: 'service',
        nameSnapshot: 'Consulta vinculada a fila',
        unitPrice: COUNTER_SALE_AMOUNT
      })
    });
    expect(item.status).toBe(201);

    const settlementIdempotencyKey = randomUUID();
    const settlementHeaders = {
      ...authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      'idempotency-key': settlementIdempotencyKey
    };
    const closed = await requestJson<{
      readonly status: string;
      readonly receipt: {
        readonly counterSaleId: string;
        readonly amount: number;
        readonly journalEntryId: string | null;
      };
    }>(`/counter-sales/${saleId}/settle`, {
      method: 'POST',
      headers: settlementHeaders,
      body: JSON.stringify({
        payments: [{ method: 'pix', amount: COUNTER_SALE_AMOUNT }]
      })
    });
    const replayedSettlement = await requestJson(`/counter-sales/${saleId}/settle`, {
      method: 'POST',
      headers: settlementHeaders,
      body: JSON.stringify({
        payments: [{ method: 'pix', amount: COUNTER_SALE_AMOUNT }]
      })
    });
    expect(closed.status).toBe(200);
    expect(replayedSettlement.status).toBe(200);
    expect(replayedSettlement.body).toEqual(closed.body);
    expect(closed.body).toMatchObject({
      status: 'closed',
      receipt: {
        counterSaleId: saleId,
        amount: COUNTER_SALE_AMOUNT
      }
    });
    expect(closed.body?.receipt.journalEntryId).toBeTruthy();

    const state = await getTestPool().query<{
      readonly queueTransferStatus: string;
      readonly salePatientId: string;
      readonly saleQueueEntryId: string;
      readonly receipts: number;
      readonly receiptAmount: number;
      readonly journalEntries: number;
    }>(
      `SELECT
         (SELECT status FROM scheduling_queue_transfers WHERE account_id = $1 AND queue_entry_id = $2 AND status = 'received') AS "queueTransferStatus",
         (SELECT patient_id::text FROM counter_sales WHERE account_id = $1 AND id = $3::uuid) AS "salePatientId",
         (SELECT queue_entry_id FROM counter_sales WHERE account_id = $1 AND id = $3::uuid) AS "saleQueueEntryId",
         (SELECT COUNT(*)::int FROM counter_sale_receipts WHERE account_id = $1 AND counter_sale_id = $3::uuid) AS receipts,
         (SELECT amount::float8 FROM counter_sale_receipts WHERE account_id = $1 AND counter_sale_id = $3::uuid) AS "receiptAmount",
         (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'counter_sale_revenue' AND source_id = $3::text) AS "journalEntries"`,
      [ACCOUNT_A, queueEntryId, saleId]
    );
    expect(state.rows[0]).toEqual({
      queueTransferStatus: 'received',
      salePatientId: PATIENT_A,
      saleQueueEntryId: queueEntryId,
      receipts: 1,
      receiptAmount: COUNTER_SALE_AMOUNT,
      journalEntries: 1
    });

    const receipt = await getTestPool().query<{ readonly id: string }>(
      `SELECT id
         FROM counter_sale_receipts
        WHERE account_id = $1
          AND counter_sale_id = $2::uuid`,
      [ACCOUNT_A, saleId]
    );
    const receiptId = receipt.rows[0]?.id;
    expect(receiptId).toBeTruthy();
    await expect(
      getTestPool().query(
        'UPDATE counter_sale_receipts SET amount = amount + 1 WHERE id = $1::uuid',
        [receiptId]
      )
    ).rejects.toThrow(/immutable/i);
    await expect(
      getTestPool().query('DELETE FROM counter_sale_receipts WHERE id = $1::uuid', [receiptId])
    ).rejects.toThrow(/append-only|immutable/i);
  });

  it('serializes concurrent payments and rejects the second overpayment at the database lock', async () => {
    const sale = await requestJson<{ readonly id: string }>('/counter-sales', {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      body: JSON.stringify({ ownerId: OWNER_A, patientId: PATIENT_A })
    });
    expect(sale.status).toBe(201);
    const saleId = sale.body?.id;
    expect(saleId).toBeTruthy();

    const item = await requestJson(`/counter-sales/${saleId}/items`, {
      method: 'POST',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
      body: JSON.stringify({
        itemType: 'service',
        nameSnapshot: 'Procedimento concorrente',
        unitPrice: 100
      })
    });
    expect(item.status).toBe(201);

    const [first, second] = await Promise.all(
      [randomUUID(), randomUUID()].map((idempotencyKey) =>
        requestJson(`/counter-sales/${saleId}/payments`, {
          method: 'POST',
          headers: {
            ...authHeaders(accessTokenA, TENANT_A, ACCOUNT_A),
            'idempotency-key': idempotencyKey
          },
          body: JSON.stringify({ method: 'pix', amount: 60 })
        })
      )
    );
    expect([first.status, second.status].sort()).toEqual([201, 409]);

    const state = await getTestPool().query<{
      readonly paidAmount: number;
      readonly balanceDue: number;
      readonly payments: number;
    }>(
      `SELECT paid_amount::float8 AS "paidAmount",
              balance_due::float8 AS "balanceDue",
              (SELECT COUNT(*)::int FROM counter_sale_payments AS payment
                WHERE payment.account_id = sale.account_id
                  AND payment.counter_sale_id = sale.id) AS payments
         FROM counter_sales AS sale
        WHERE sale.account_id = $1
          AND sale.id = $2::uuid`,
      [ACCOUNT_A, saleId]
    );
    expect(state.rows[0]).toEqual({ paidAmount: 60, balanceDue: 40, payments: 1 });
  });

  it('closes idempotently and publishes the encounter timeline/audit/outbox graph', async () => {
    const idempotencyKey = randomUUID();
    const first = await postClose(CLOSE_ENCOUNTER_ID, idempotencyKey);
    const replay = await postClose(CLOSE_ENCOUNTER_ID, idempotencyKey);
    const conflict = await postClose(CLOSE_ENCOUNTER_ID, idempotencyKey, 'Motivo divergente');

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({
      id: CLOSE_ENCOUNTER_ID,
      accountId: ACCOUNT_A,
      status: 'closed',
      closeReason: 'Alta clínica confirmada'
    });
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect(conflict.status).toBe(409);

    const state = await getTestPool().query<{
      readonly encounterStatus: string;
      readonly closeReason: string | null;
      readonly timelineEvents: number;
      readonly audits: number;
      readonly outboxEvents: number;
      readonly completedIdempotency: number;
    }>(
      `SELECT
         (SELECT status FROM encounters WHERE account_id = $1 AND id = $2::uuid) AS "encounterStatus",
         (SELECT close_reason FROM encounters WHERE account_id = $1 AND id = $2::uuid) AS "closeReason",
         (SELECT COUNT(*)::int FROM encounter_timeline
           WHERE account_id = $1 AND encounter_id = $2::uuid AND event_type = 'encounter_closed') AS "timelineEvents",
         (SELECT COUNT(*)::int FROM audit_events
           WHERE account_id = $1 AND entity_type = 'encounter' AND entity_id = $2::text AND action = 'close') AS audits,
         (SELECT COUNT(*)::int FROM outbox_events
           WHERE account_id = $1 AND event_type = 'encounter.closed'
             AND payload->>'encounterId' = $2::text) AS "outboxEvents",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $3 AND idempotency_key = $4
             AND status = 'completed') AS "completedIdempotency"`,
      [ACCOUNT_A, CLOSE_ENCOUNTER_ID, CLOSE_OPERATION, idempotencyKey]
    );

    expect(state.rows[0]).toEqual({
      encounterStatus: 'closed',
      closeReason: 'Alta clínica confirmada',
      timelineEvents: 1,
      audits: 1,
      outboxEvents: 1,
      completedIdempotency: 1
    });
  });

  it('settles the billing generated by the same closed encounter exactly once', async () => {
    const closeKey = randomUUID();
    const closed = await postClose(RECEIPT_ENCOUNTER_ID, closeKey);
    expect(closed.status).toBe(200);

    const receiptKey = randomUUID();
    const first = await postReceipt(receiptKey);
    const replay = await postReceipt(receiptKey);

    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({
      encounterId: RECEIPT_ENCOUNTER_ID,
      amount: AMOUNT,
      billingRecordId: BILLING_RECORD_ID
    });
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);

    const state = await getTestPool().query<{
      readonly encounterStatus: string;
      readonly billingStatus: string;
      readonly receipts: number;
      readonly payments: number;
      readonly movements: number;
      readonly journalEntries: number;
      readonly journalDebit: number;
      readonly journalCredit: number;
      readonly audits: number;
      readonly closeOutbox: number;
      readonly receiptOutbox: number;
      readonly closeIdempotency: number;
      readonly receiptIdempotency: number;
    }>(
      `SELECT
         (SELECT status FROM encounters WHERE account_id = $1 AND id = $2) AS "encounterStatus",
         (SELECT status FROM billing_records WHERE account_id = $1 AND id = $3) AS "billingStatus",
         (SELECT COUNT(*)::int FROM encounter_cash_receipts WHERE account_id = $1 AND encounter_id = $2) AS receipts,
         (SELECT COUNT(*)::int FROM encounter_receivable_payments WHERE account_id = $1 AND encounter_id = $2) AS payments,
         (SELECT COUNT(*)::int FROM cash_movements WHERE account_id = $1 AND cash_register_id = $4 AND movement_type = 'payment') AS movements,
         (SELECT COUNT(*)::int FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt') AS "journalEntries",
         (SELECT COALESCE(SUM(debit), 0)::float8 FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS "journalDebit",
         (SELECT COALESCE(SUM(credit), 0)::float8 FROM financial_journal_lines WHERE account_id = $1 AND entry_id IN (SELECT id FROM financial_journal_entries WHERE account_id = $1 AND source_type = 'encounter_cash_receipt')) AS "journalCredit",
         (SELECT COUNT(*)::int FROM audit_events WHERE account_id = $1 AND entity_type = 'encounter_cash_receipt') AS audits,
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.closed' AND payload->>'encounterId' = $2::text) AS "closeOutbox",
         (SELECT COUNT(*)::int FROM outbox_events WHERE account_id = $1 AND event_type = 'encounter.cash-receipt.created' AND payload->>'encounterId' = $2::text) AS "receiptOutbox",
         (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $5 AND idempotency_key = $6 AND status = 'completed') AS "closeIdempotency",
         (SELECT COUNT(*)::int FROM idempotency_requests WHERE account_id = $1 AND operation = $7 AND idempotency_key = $8 AND status = 'completed') AS "receiptIdempotency"`,
      [
        ACCOUNT_A,
        RECEIPT_ENCOUNTER_ID,
        BILLING_RECORD_ID,
        CASH_REGISTER_ID,
        RECEIPT_CLOSE_OPERATION,
        closeKey,
        RECEIPT_OPERATION,
        receiptKey
      ]
    );

    expect(state.rows[0]).toEqual({
      encounterStatus: 'closed',
      billingStatus: 'settled',
      receipts: 1,
      payments: 1,
      // The preceding counter-sale settlement also uses the shared open
      // register, so this fixture contains one counter-sale and one clinical
      // cash movement.
      movements: 2,
      journalEntries: 1,
      journalDebit: AMOUNT,
      journalCredit: AMOUNT,
      audits: 1,
      closeOutbox: 1,
      receiptOutbox: 1,
      closeIdempotency: 1,
      receiptIdempotency: 1
    });
  });

  it('maps a distinct-key close race to one commit and one conflict', async () => {
    const [first, second] = await Promise.all([
      postClose(RACE_ENCOUNTER_ID, randomUUID(), 'Alta concorrente A', baseUrl),
      postClose(RACE_ENCOUNTER_ID, randomUUID(), 'Alta concorrente B', secondaryBaseUrl)
    ]);
    expect([first.status, second.status].sort()).toEqual([200, 409]);

    const state = await getTestPool().query<{
      readonly timelineEvents: number;
      readonly outboxEvents: number;
      readonly audits: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM encounter_timeline
           WHERE account_id = $1 AND encounter_id = $2::uuid AND event_type = 'encounter_closed') AS "timelineEvents",
         (SELECT COUNT(*)::int FROM outbox_events
           WHERE account_id = $1 AND event_type = 'encounter.closed' AND payload->>'encounterId' = $2::text) AS "outboxEvents",
         (SELECT COUNT(*)::int FROM audit_events
           WHERE account_id = $1 AND entity_type = 'encounter' AND entity_id = $2::text AND action = 'close') AS audits`,
      [ACCOUNT_A, RACE_ENCOUNTER_ID]
    );
    expect(state.rows[0]).toEqual({ timelineEvents: 1, outboxEvents: 1, audits: 1 });
  });

  it('does not allow tenant B or spoofed headers to close tenant A', async () => {
    const response = await postClose(
      CLOSE_ENCOUNTER_ID,
      randomUUID(),
      'Tentativa cross-tenant',
      baseUrl,
      accessTokenB,
      TENANT_B,
      ACCOUNT_B
    );
    expect(response.status).toBe(404);

    const state = await getTestPool().query<{ readonly closeAudits: number }>(
      `SELECT COUNT(*)::int AS "closeAudits"
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'encounter' AND entity_id = $2 AND action = 'close'`,
      [ACCOUNT_A, CLOSE_ENCOUNTER_ID]
    );
    expect(state.rows[0]?.closeAudits).toBe(1);
  });

  it('restores the encounter and timeline caches when close persistence fails', async () => {
    const idempotencyKey = randomUUID();
    const response = await postClose(ROLLBACK_ENCOUNTER_ID, idempotencyKey, 'Falha controlada');
    expect(response.status).toBe(500);

    const state = await getTestPool().query<{
      readonly encounterStatus: string;
      readonly closeReason: string | null;
      readonly timelineEvents: number;
      readonly audits: number;
      readonly outboxEvents: number;
      readonly idempotencyRows: number;
    }>(
      `SELECT
         (SELECT status FROM encounters WHERE account_id = $1 AND id = $2::uuid) AS "encounterStatus",
         (SELECT close_reason FROM encounters WHERE account_id = $1 AND id = $2::uuid) AS "closeReason",
         (SELECT COUNT(*)::int FROM encounter_timeline
           WHERE account_id = $1 AND encounter_id = $2::uuid AND event_type = 'encounter_closed') AS "timelineEvents",
         (SELECT COUNT(*)::int FROM audit_events
           WHERE account_id = $1 AND entity_type = 'encounter' AND entity_id = $2::text AND action = 'close') AS audits,
         (SELECT COUNT(*)::int FROM outbox_events
           WHERE account_id = $1 AND event_type = 'encounter.closed'
             AND payload->>'encounterId' = $2::text) AS "outboxEvents",
         (SELECT COUNT(*)::int FROM idempotency_requests
           WHERE account_id = $1 AND operation = $3 AND idempotency_key = $4) AS "idempotencyRows"`,
      [
        ACCOUNT_A,
        ROLLBACK_ENCOUNTER_ID,
        `POST /encounters/${ROLLBACK_ENCOUNTER_ID}/close`,
        idempotencyKey
      ]
    );

    expect(state.rows[0]).toEqual({
      encounterStatus: 'open',
      closeReason: null,
      timelineEvents: 0,
      audits: 0,
      outboxEvents: 0,
      idempotencyRows: 0
    });

    const cached = await requestJson<EncounterResponse>(`/encounters/${ROLLBACK_ENCOUNTER_ID}`, {
      method: 'GET',
      headers: authHeaders(accessTokenA, TENANT_A, ACCOUNT_A)
    });
    expect(cached.status).toBe(200);
    expect(cached.body).toMatchObject({
      id: ROLLBACK_ENCOUNTER_ID,
      status: 'reception'
    });
    expect(cached.body?.closeReason).toBeUndefined();
  });
});
