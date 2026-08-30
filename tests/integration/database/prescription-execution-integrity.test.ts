import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import {
  DatabasePrescriptionExecutionRepository,
  type PrescriptionExecutionRepository
} from '../../../packages/modules/prescription-executions/src/index.js';
import { createDatabaseClient, getPool } from '../../../packages/shared/database/src/index.js';
import type {
  AccountId,
  AdministrationEventSummary,
  EncounterId,
  PatientId,
  PrescriptionExecutionSummary,
  UserId
} from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID() as AccountId;
const otherAccountId = randomUUID() as AccountId;
const actorUserId = randomUUID() as UserId;
const ownerId = randomUUID();
const patientId = randomUUID() as PatientId;
const encounterId = randomUUID() as EncounterId;
const medicalRecordId = `mr_${randomUUID()}`;
const clinicalEntryId = `rx_${randomUUID()}`;
const unsignedClinicalEntryId = `rx_${randomUUID()}`;
const archivedClinicalEntryId = `rx_${randomUUID()}`;

const tenantContext = {
  tenantId,
  accountId: String(accountId),
  userId: String(actorUserId),
  correlationId: 'prescription-execution-integrity-db'
};

function executionFixture(
  overrides: Partial<PrescriptionExecutionSummary> = {}
): PrescriptionExecutionSummary {
  const now = new Date().toISOString();
  return {
    id: `pe_${randomUUID()}` as PrescriptionExecutionSummary['id'],
    accountId,
    clinicalEntryId: clinicalEntryId as never,
    patientId,
    encounterId,
    medicationName: 'Amoxicilina',
    dosage: '500mg',
    route: 'oral',
    frequency: '8/8h',
    scheduledAt: now,
    status: 'pending',
    version: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function administrationEvent(
  execution: PrescriptionExecutionSummary,
  overrides: Partial<AdministrationEventSummary> = {}
): AdministrationEventSummary {
  const now = new Date().toISOString();
  return {
    id: `ae_${randomUUID()}` as AdministrationEventSummary['id'],
    executionId: execution.id,
    eventType: 'created',
    actorId: actorUserId,
    occurredAt: now,
    createdAt: now,
    ...overrides
  };
}

async function inTenant<T>(operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(tenantContext, operation);
}

async function countRows(table: string, account: string): Promise<number> {
  const result = await getTestPool().query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM ${table} WHERE account_id = $1`,
    [account]
  );
  return Number(result.rows[0]?.count ?? 0);
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [tenantId, `rx-integrity-tenant-${tenantId.slice(0, 8)}`, 'Prescription integrity tenant']
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $3, $4, $5, true), ($2, $3, $6, $7, true)`,
    [
      accountId,
      otherAccountId,
      tenantId,
      `rx-integrity-account-a-${accountId.slice(0, 8)}`,
      'Prescription integrity A',
      `rx-integrity-account-b-${otherAccountId.slice(0, 8)}`,
      'Prescription integrity B'
    ]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'fixture-hash', 'Prescription operator', true)`,
    [
      actorUserId,
      accountId,
      `rx-integrity-${actorUserId.slice(0, 8)}`,
      `rx-integrity-${actorUserId.slice(0, 8)}@example.test`
    ]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    ownerId,
    accountId,
    'Prescription integrity owner'
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Prescription integrity patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, version, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'open', 1, now(), now())`,
    [medicalRecordId, accountId, encounterId, patientId]
  );
  await pool.query(
    `INSERT INTO clinical_entries (
       id, account_id, medical_record_id, encounter_id, patient_id, author_user_id,
       entry_type, title, content, version, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, 'prescription', 'Amoxicilina', 'Posologia: 500mg\nVia: oral\nFrequência: 8/8h', 1, now(), now())`,
    [clinicalEntryId, accountId, medicalRecordId, encounterId, patientId, actorUserId]
  );
  await pool.query(
    `INSERT INTO prescription_signatures (
       id, account_id, prescription_id, version, signed_by_user_id, signature_hash, signed_at
     ) VALUES ($1, $2, $3, 1, $4, 'fixture-signature', now())`,
    [randomUUID(), accountId, clinicalEntryId, actorUserId]
  );
  await pool.query(
    `INSERT INTO clinical_entries (
       id, account_id, medical_record_id, encounter_id, patient_id, author_user_id,
       entry_type, title, content, version, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, 'prescription', 'Amoxicilina', 'Posologia: 500mg\nVia: oral\nFrequência: 8/8h', 1, now(), now()),
       ($7, $2, $3, $4, $5, $6, 'prescription', 'Amoxicilina', 'Posologia: 500mg\nVia: oral\nFrequência: 8/8h', 1, now(), now())`,
    [
      unsignedClinicalEntryId,
      accountId,
      medicalRecordId,
      encounterId,
      patientId,
      actorUserId,
      archivedClinicalEntryId
    ]
  );
  await pool.query(
    `INSERT INTO prescription_signatures (
       id, account_id, prescription_id, version, signed_by_user_id, signature_hash, signed_at
     ) VALUES ($1, $2, $3, 1, $4, 'fixture-archived-signature', now())`,
    [randomUUID(), accountId, archivedClinicalEntryId, actorUserId]
  );
});

afterAll(async () => {
  await getTestPool().query('DELETE FROM tenants WHERE id = $1', [tenantId]);
});

describe('prescription execution PostgreSQL integrity', () => {
  it('rolls back the execution when the administration event insert fails', async () => {
    const repository =
      new DatabasePrescriptionExecutionRepository() as PrescriptionExecutionRepository & {
        createWithEvent: (
          execution: PrescriptionExecutionSummary,
          event: AdministrationEventSummary
        ) => Promise<void>;
      };
    const baseline = executionFixture();
    const baselineEvent = administrationEvent(baseline);
    await inTenant(() => repository.createWithEvent(baseline, baselineEvent));

    const execution = executionFixture();
    const invalidEvent = administrationEvent(execution, { id: baselineEvent.id });

    await expect(
      inTenant(() => repository.createWithEvent(execution, invalidEvent))
    ).rejects.toThrow();

    expect(await countRows('prescription_executions', String(accountId))).toBe(1);
  });

  it('rejects an unsigned or archived prescription before writing an execution', async () => {
    const repository = new DatabasePrescriptionExecutionRepository();
    const unsigned = executionFixture({ clinicalEntryId: unsignedClinicalEntryId as never });
    await expect(
      inTenant(() => repository.createWithEvent(unsigned, administrationEvent(unsigned)))
    ).rejects.toThrow('Prescription must be signed');

    await getTestPool().query(
      'UPDATE clinical_entries SET deleted_at = now() WHERE id = $1 AND account_id = $2',
      [archivedClinicalEntryId, accountId]
    );
    const archived = executionFixture({ clinicalEntryId: archivedClinicalEntryId as never });
    await expect(
      inTenant(() => repository.createWithEvent(archived, administrationEvent(archived)))
    ).rejects.toThrow('Archived prescriptions cannot be executed');
    expect(await countRows('prescription_executions', String(accountId))).toBe(1);
  });

  it('accepts one concurrent state transition and conflicts the stale writer', async () => {
    const repositoryA =
      new DatabasePrescriptionExecutionRepository() as PrescriptionExecutionRepository & {
        createWithEvent: (
          execution: PrescriptionExecutionSummary,
          event: AdministrationEventSummary
        ) => Promise<void>;
        updateWithEvent: (
          execution: PrescriptionExecutionSummary,
          event: AdministrationEventSummary,
          expectedVersion: number
        ) => Promise<void>;
      };
    const repositoryB = new DatabasePrescriptionExecutionRepository() as typeof repositoryA;
    const execution = executionFixture();
    await inTenant(() => repositoryA.createWithEvent(execution, administrationEvent(execution)));

    const updated = executionFixture({
      id: execution.id,
      version: 2,
      status: 'administered',
      administeredBy: actorUserId,
      administeredAt: new Date().toISOString()
    });
    const attemptA = inTenant(() =>
      repositoryA.updateWithEvent(
        updated,
        administrationEvent(updated, { eventType: 'administered' }),
        1
      )
    );
    const attemptB = inTenant(() =>
      repositoryB.updateWithEvent(
        updated,
        administrationEvent(updated, { eventType: 'administered' }),
        1
      )
    );

    const results = await Promise.allSettled([attemptA, attemptB]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);

    const state = await getTestPool().query<{ version: number; status: string }>(
      'SELECT version, status FROM prescription_executions WHERE id = $1 AND account_id = $2',
      [execution.id, accountId]
    );
    expect(state.rows[0]).toMatchObject({ version: 2, status: 'administered' });
    const events = await getTestPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM administration_events WHERE account_id = $1 AND execution_id = $2`,
      [accountId, execution.id]
    );
    expect(Number(events.rows[0]?.count ?? 0)).toBe(2);
  });

  it('does not read account A execution rows through account B tenant context', async () => {
    const repository = new DatabasePrescriptionExecutionRepository();
    const visibleToOtherAccount = await runWithTenantContext(
      {
        ...tenantContext,
        accountId: String(otherAccountId),
        correlationId: 'prescription-execution-integrity-other-account'
      },
      () => repository.findByAccountId(accountId)
    );

    expect(visibleToOtherAccount).toHaveLength(0);
  });

  it('keeps execution and event tables protected for the restricted RLS role', async () => {
    const catalog = await getTestPool().query<{
      readonly table_name: string;
      readonly row_security: boolean;
      readonly force_rls: boolean;
    }>(`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS row_security,
             c.relforcerowsecurity AS force_rls
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname IN ('prescription_executions', 'administration_events')
       ORDER BY c.relname
    `);
    expect(catalog.rows).toEqual([
      { table_name: 'administration_events', row_security: true, force_rls: true },
      { table_name: 'prescription_executions', row_security: true, force_rls: true }
    ]);

    const sourceConstraint = await getTestPool().query<{ readonly conname: string }>(`
      SELECT conname
        FROM pg_constraint
       WHERE conrelid = 'public.prescription_executions'::regclass
         AND conname = 'prescription_executions_account_clinical_entry_fk'
    `);
    expect(sourceConstraint.rows).toEqual([
      { conname: 'prescription_executions_account_clinical_entry_fk' }
    ]);

    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    const restrictedPool = new Pool({ connectionString: restrictedUrl.toString(), max: 1 });
    const client = await restrictedPool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
      const role = await client.query<{
        readonly current_user: string;
        readonly bypassrls: boolean;
      }>(`
        SELECT current_user, rolbypassrls AS bypassrls
          FROM pg_roles
         WHERE rolname = current_user
      `);
      expect(role.rows[0]?.bypassrls).toBe(false);
      const visible = await client.query<{ readonly account_id: string }>(
        'SELECT account_id::text FROM prescription_executions ORDER BY account_id::text'
      );
      expect(visible.rows.every((row) => row.account_id === String(accountId))).toBe(true);
      await client.query('ROLLBACK');
    } finally {
      client.release();
      await restrictedPool.end();
    }
  });
});
