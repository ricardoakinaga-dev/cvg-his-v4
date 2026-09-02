import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import { PatientsService } from '../../../packages/modules/patients/src/index.js';
import { SchedulingService } from '../../../packages/modules/scheduling/src/index.js';
import { DatabaseSchedulingRepository } from '../../../packages/modules/scheduling/src/repositories/database-scheduling.repository.js';
import { createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import type {
  AccountId,
  AppointmentId,
  OwnerId,
  PatientId
} from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const OWNER_A = randomUUID() as OwnerId;
const OWNER_B = randomUUID() as OwnerId;
const PATIENT_A_EARLY = randomUUID() as PatientId;
const PATIENT_A_LATE = randomUUID() as PatientId;
const PATIENT_A_COMPLETED = randomUUID() as PatientId;
const PATIENT_A_CANCELLED = randomUUID() as PatientId;
const PATIENT_B = randomUUID() as PatientId;
const APPOINTMENT_A_EARLY = randomUUID() as AppointmentId;
const APPOINTMENT_A_LATE = randomUUID() as AppointmentId;
const APPOINTMENT_A_COMPLETED = randomUUID() as AppointmentId;
const APPOINTMENT_A_CANCELLED = randomUUID() as AppointmentId;
const APPOINTMENT_B = randomUUID() as AppointmentId;

function inAccount<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(
    {
      tenantId: TENANT_ID,
      accountId,
      correlationId: `appointments-report-${randomUUID()}`
    },
    operation
  );
}

describe('scheduling appointments report source on PostgreSQL', () => {
  const pool = getTestPool();
  const repository = new DatabaseSchedulingRepository();
  let scheduling: SchedulingService;

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Appointments report tenant', 'active', now())`,
      [TENANT_ID, `appointments-report-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Appointments report account A', true),
              ($2, $3, $5, 'Appointments report account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `appointments-report-a-${ACCOUNT_A.slice(0, 12)}`,
        `appointments-report-b-${ACCOUNT_B.slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, address_json)
       VALUES ($1, $3, 'Tutor A', '{"status":"active"}'::jsonb),
              ($2, $4, 'Tutor B', '{"status":"active"}'::jsonb)`,
      [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES
         ($1, $6, $7, 'Paciente A cedo', 'canine', '{"status":"active"}'::jsonb),
         ($2, $6, $7, 'Paciente A tarde', 'canine', '{"status":"active"}'::jsonb),
         ($3, $6, $7, 'Paciente A concluido', 'canine', '{"status":"active"}'::jsonb),
         ($4, $6, $7, 'Paciente A cancelado', 'canine', '{"status":"active"}'::jsonb),
         ($5, $8, $9, 'Paciente B estrangeiro', 'canine', '{"status":"active"}'::jsonb)`,
      [
        PATIENT_A_EARLY,
        PATIENT_A_LATE,
        PATIENT_A_COMPLETED,
        PATIENT_A_CANCELLED,
        PATIENT_B,
        ACCOUNT_A,
        OWNER_A,
        ACCOUNT_B,
        OWNER_B
      ]
    );
    await pool.query(
      `INSERT INTO appointments (
         id, account_id, patient_id, owner_id, start_at, end_at, status, type,
         visit_type, reason, unit, specialty, resource_label, created_at, updated_at
       ) VALUES
         ($1, $6, $7, $8, '2026-06-01T09:00:00.000Z', '2026-06-01T09:30:00.000Z',
          'confirmed', 'consultation', 'scheduled', 'Consulta preventiva', 'Clinica A',
          'Clinico geral', 'Sala 1', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($2, $6, $9, $8, '2026-06-02T23:59:59.000Z', '2026-06-03T00:29:59.000Z',
          'in_progress', 'consultation', 'scheduled', 'Acompanhamento em andamento', 'Clinica A',
          'Clinico geral', 'Sala 2', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($3, $6, $10, $8, '2026-06-03T00:00:00.000Z', '2026-06-03T00:30:00.000Z',
          'completed', 'consultation', 'return', 'Consulta concluida', 'Clinica A',
          'Clinico geral', 'Sala 3', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($4, $6, $11, $8, '2026-06-04T10:00:00.000Z', '2026-06-04T10:30:00.000Z',
          'cancelled', 'consultation', 'scheduled', 'Consulta cancelada', 'Clinica A',
          'Clinico geral', 'Sala 4', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z'),
         ($5, $12, $13, $14, '2026-06-01T09:00:00.000Z', '2026-06-01T09:30:00.000Z',
          'scheduled', 'consultation', 'scheduled', 'Consulta estrangeira', 'Clinica B',
          'Clinico geral', 'Sala B', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z')`,
      [
        APPOINTMENT_A_EARLY,
        APPOINTMENT_A_LATE,
        APPOINTMENT_A_COMPLETED,
        APPOINTMENT_A_CANCELLED,
        APPOINTMENT_B,
        ACCOUNT_A,
        PATIENT_A_EARLY,
        OWNER_A,
        PATIENT_A_LATE,
        PATIENT_A_COMPLETED,
        PATIENT_A_CANCELLED,
        ACCOUNT_B,
        PATIENT_B,
        OWNER_B
      ]
    );

    const owners = new OwnersService({ seedOwners: [] });
    const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
    scheduling = new SchedulingService(owners, patients, [], { repository });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
  });

  it('reads only persisted rows with inclusive UTC dates, canonical status filters and deterministic order', async () => {
    const rows = await inAccount(ACCOUNT_A, () =>
      scheduling.listPersistedReportRows(ACCOUNT_A, {
        search: 'consulta',
        status: 'scheduled',
        dateFrom: '2026-06-01',
        dateTo: '2026-06-02',
        limit: 10_001
      })
    );

    expect(rows.map((row) => row.id)).toEqual([APPOINTMENT_A_EARLY]);
    expect(rows[0]).toMatchObject({
      id: APPOINTMENT_A_EARLY,
      accountId: ACCOUNT_A,
      status: 'scheduled',
      canonicalStatus: 'confirmed',
      reason: 'Consulta preventiva',
      unit: 'Clinica A',
      specialty: 'Clinico geral',
      resourceLabel: 'Sala 1'
    });

    const inclusiveEnd = await inAccount(ACCOUNT_A, () =>
      scheduling.listPersistedReportRows(ACCOUNT_A, {
        dateFrom: '2026-06-02',
        dateTo: '2026-06-02',
        limit: 10_001
      })
    );
    expect(inclusiveEnd.map((row) => row.id)).toEqual([APPOINTMENT_A_LATE]);
  });

  it('enforces account scope, status normalization and bounded reads against the real RLS source', async () => {
    const rows = await inAccount(ACCOUNT_A, () =>
      scheduling.listPersistedReportRows(ACCOUNT_A, { limit: 10_001 })
    );
    expect(rows.map((row) => row.id)).toEqual([
      APPOINTMENT_A_EARLY,
      APPOINTMENT_A_LATE,
      APPOINTMENT_A_COMPLETED,
      APPOINTMENT_A_CANCELLED
    ]);
    expect(rows.every((row) => row.accountId === ACCOUNT_A)).toBe(true);

    const checkedIn = await inAccount(ACCOUNT_A, () =>
      scheduling.listPersistedReportRows(ACCOUNT_A, { status: 'checked_in', limit: 10_001 })
    );
    expect(checkedIn.map((row) => row.id)).toEqual([APPOINTMENT_A_LATE]);
    expect(checkedIn[0]?.canonicalStatus).toBe('in_progress');

    const accountB = await inAccount(ACCOUNT_B, () =>
      scheduling.listPersistedReportRows(ACCOUNT_B, { limit: 1 })
    );
    expect(accountB.map((row) => row.id)).toEqual([APPOINTMENT_B]);

    await expect(
      inAccount(ACCOUNT_A, () => scheduling.listPersistedReportRows(ACCOUNT_B, { limit: 10_001 }))
    ).rejects.toThrow(/does not match tenant context/);

    await expect(
      inAccount(ACCOUNT_A, () => scheduling.listPersistedReportRows(ACCOUNT_A, { limit: 10_002 }))
    ).rejects.toThrow(/between 1 and 10001/);
  });

  it('returns the real 10,001-row overflow sentinel without widening the tenant scope', async () => {
    const overflowPrefix = `appointments-report-overflow-${randomUUID()}`;
    await pool.query(
      `WITH overflow_patients AS (
         INSERT INTO patients (account_id, owner_id, name, species, alerts_json)
         SELECT $1, $2, $3 || '-' || generated.sequence, 'canine', '{"status":"active"}'::jsonb
           FROM generate_series(1, 10001) AS generated(sequence)
         RETURNING id
       )
       INSERT INTO appointments (
         account_id, patient_id, owner_id, start_at, end_at, status, type,
         visit_type, reason
       )
       SELECT $1, patient.id, $2,
              '2026-06-10T10:00:00.000Z', '2026-06-10T10:30:00.000Z',
              'scheduled', 'consultation', 'scheduled', $3
         FROM overflow_patients AS patient`,
      [ACCOUNT_A, OWNER_A, overflowPrefix]
    );

    try {
      const rows = await inAccount(ACCOUNT_A, () =>
        scheduling.listPersistedReportRows(ACCOUNT_A, {
          search: overflowPrefix,
          limit: 10_001
        })
      );
      expect(rows).toHaveLength(10_001);
      expect(rows.every((row) => row.accountId === ACCOUNT_A)).toBe(true);
      expect(rows.every((row) => row.reason === overflowPrefix)).toBe(true);
    } finally {
      await pool.query('DELETE FROM patients WHERE account_id = $1 AND name LIKE $2', [
        ACCOUNT_A,
        `${overflowPrefix}%`
      ]);
    }
  }, 120_000);
});
