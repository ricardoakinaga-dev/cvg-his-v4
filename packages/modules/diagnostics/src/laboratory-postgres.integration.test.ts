import { randomUUID } from 'node:crypto';

import { afterAll, afterEach, expect, test } from 'vitest';

import {
  closeDatabaseClient,
  createDatabaseClient,
  getPool
} from '@cvg-his-v2/shared-database';
import type { AccountId } from '@cvg-his-v2/shared-types';

import {
  DatabaseDiagnosticOrderRepository,
  DiagnosticsService,
  LaboratoryService
} from './index.js';

const runPostgresTest = process.env.REQUIRE_TEST_DB === '1';
const databaseUrl =
  process.env.DATABASE_URL_TEST
  ?? process.env.DATABASE_URL
  ?? 'postgres://postgres:postgres@localhost:5433/cvg_his_v2_test';
const accountId = randomUUID() as AccountId;
const tenantId = randomUUID();
const signerUserId = randomUUID();
const professionId = randomUUID();
const staffId = randomUUID();
const encounter = {
  id: `encounter-${randomUUID()}`,
  accountId,
  patientId: `patient-${randomUUID()}`
};
let databaseInitialized = false;

afterEach(async () => {
  if (!runPostgresTest || !databaseInitialized) return;
  await getPool().query('DELETE FROM diagnostic_orders WHERE account_id = $1', [accountId]);
  await getPool().query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await getPool().query('DELETE FROM tenants WHERE id = $1', [tenantId]);
});

afterAll(async () => {
  if (runPostgresTest) {
    await closeDatabaseClient();
  }
});

test.skipIf(!runPostgresTest)('persists the canonical laboratory lifecycle and composite workflow FK', async () => {
  const repository = new DatabaseDiagnosticOrderRepository(createDatabaseClient(databaseUrl));
  databaseInitialized = true;
  const pool = getPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [tenantId, `laboratory-${tenantId}`, 'Laboratory integration tenant']
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [accountId, tenantId, `laboratory-${accountId}`, 'Laboratory integration account']
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active, principal_kind)
     VALUES ($1, $2, $3, $4, 'test-hash', 'Laboratory signer', true, 'human')`,
    [signerUserId, accountId, `laboratory-${signerUserId}`, `${signerUserId}@example.test`]
  );
  await pool.query(
    `INSERT INTO professions (id, account_id, code, name, is_active)
     VALUES ($1, $2, 'LAB-TECH', 'Laboratory technician', true)`,
    [professionId, accountId]
  );
  await pool.query(
    `INSERT INTO staff (id, account_id, user_id, employee_code, full_name, profession_id, is_active)
     VALUES ($1, $2, $3, 'LAB-001', 'Laboratory signer', $4, true)`,
    [staffId, accountId, signerUserId, professionId]
  );
  const constraintRows = await pool.query<{ name: string; definition: string }>(`
    SELECT conname AS name, pg_get_constraintdef(oid) AS definition
      FROM pg_constraint
     WHERE conrelid = 'diagnostic_order_workflows'::regclass
       AND conname IN (
         'diagnostic_order_workflows_account_order_unique',
         'diagnostic_order_workflows_account_order_fk'
       )
     ORDER BY conname
  `);
  expect(constraintRows.rows).toEqual([
    {
      name: 'diagnostic_order_workflows_account_order_fk',
      definition: 'FOREIGN KEY (account_id, order_id) REFERENCES diagnostic_orders(account_id, id) ON DELETE CASCADE'
    },
    {
      name: 'diagnostic_order_workflows_account_order_unique',
      definition: 'UNIQUE (account_id, order_id)'
    }
  ]);

  const service = new DiagnosticsService(
    {
      getOrThrow(encounterId: string) {
        if (encounterId !== encounter.id) throw new Error('Encounter not found');
        return encounter;
      }
    } as never,
    { diagnosticOrderRepository: repository }
  );
  const workflow = new LaboratoryService(service);
  const order = await service.createOrderAndPersistForAccount(accountId, {
    encounterId: encounter.id,
    patientId: encounter.patientId,
    examType: 'Hemograma',
    reason: 'Integração PostgreSQL da esteira'
  });

  const collected = await workflow.transitionOrderAndPersistForAccount(accountId, order.id, {
    status: 'collected',
    collectedByUserId: 'collector-db',
    idempotencyKey: 'laboratory-collect-1'
  });
  expect(collected.status).toBe('collected');
  expect(collected.collectionAttempt).toBe(1);

  const inAnalysis = await workflow.transitionOrderAndPersistForAccount(accountId, order.id, {
    status: 'in_analysis',
    actorUserId: 'analyst-db',
    idempotencyKey: 'laboratory-analysis-1'
  });
  expect(inAnalysis.status).toBe('in_analysis');

  const reported = await workflow.transitionOrderAndPersistForAccount(accountId, order.id, {
    status: 'reported',
    resultSummary: 'Laudo sem alterações',
    actorUserId: signerUserId,
    idempotencyKey: 'laboratory-report-1'
  });
  expect(reported.status).toBe('reported');
  expect(reported.reportedByUserId).toBe(signerUserId);
  expect(reported.signedByUserId).toBe(signerUserId);
  expect(reported.signatureHash).toMatch(/^[a-f0-9]{64}$/);

  const replayedReport = await workflow.transitionOrderAndPersistForAccount(accountId, order.id, {
    status: 'reported',
    resultSummary: 'Laudo sem alterações',
    actorUserId: signerUserId,
    idempotencyKey: 'laboratory-report-1'
  });
  expect(replayedReport.history).toHaveLength(reported.history.length);

  const delivered = await workflow.transitionOrderAndPersistForAccount(accountId, order.id, {
    status: 'delivered',
    deliveredByUserId: 'delivery-db',
    deliveryChannel: 'portal',
    deliveredAt: '2026-08-24T12:00:00.000Z',
    idempotencyKey: 'laboratory-delivery-1'
  });
  expect(delivered.status).toBe('delivered');
  expect(delivered.deliveredAt).toBe('2026-08-24T12:00:00.000Z');
  expect(delivered.deliveredByUserId).toBe('delivery-db');
  expect(delivered.deliveryChannel).toBe('portal');

  const recollected = await workflow.recollectOrderAndPersistForAccount(accountId, order.id, {
    reason: 'Amostra inadequada após entrega',
    collectedByUserId: 'recollector-db',
    idempotencyKey: 'laboratory-recollect-1'
  });
  expect(recollected.status).toBe('collected');
  expect(recollected.collectionAttempt).toBe(2);
  expect(recollected.recollectionReason).toBe('Amostra inadequada após entrega');

  const rehydrated = new DiagnosticsService(
    {
      getOrThrow(encounterId: string) {
        if (encounterId !== encounter.id) throw new Error('Encounter not found');
        return encounter;
      }
    } as never,
    { diagnosticOrderRepository: repository }
  );
  await rehydrated.hydrateFromDatabase(accountId);
  const persisted = rehydrated.getLaboratoryOrderOrThrow(accountId, order.id);
  expect(persisted.status).toBe('collected');
  expect(persisted.collectionAttempt).toBe(2);
  expect(persisted.history.map((event) => event.eventType)).toEqual([
    'collected',
    'in_analysis',
    'reported',
    'delivered',
    'recollected'
  ]);
  expect(persisted.history.at(-1)).toMatchObject({
    status: 'collected',
    attempt: 2,
    reason: 'Amostra inadequada após entrega',
    actorUserId: 'recollector-db'
  });

  const persistedRows = await pool.query<{
    status: string;
    legacy_status: string | null;
    collection_attempt: number;
    delivery_channel: string | null;
  }>(`
    SELECT status, legacy_status, collection_attempt, delivery_channel
      FROM diagnostic_order_workflows
     WHERE account_id = $1 AND order_id = $2
  `, [accountId, order.id]);
  expect(persistedRows.rows).toEqual([{
    status: 'collected',
    legacy_status: null,
    collection_attempt: 2,
    delivery_channel: null
  }]);
});
