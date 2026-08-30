import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { OwnersService } from '../../../packages/modules/owners/src/index.js';
import { PatientsService } from '../../../packages/modules/patients/src/index.js';
import { SchedulingService } from '../../../packages/modules/scheduling/src/index.js';
import { DatabaseSchedulingRepository } from '../../../packages/modules/scheduling/src/repositories/database-scheduling.repository.js';
import { createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import type { AccountId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID() as AccountId;
const ACCOUNT_B = randomUUID() as AccountId;
const OWNER_A = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_IDS = Array.from({ length: 7 }, () => randomUUID());
const PATIENT_B = randomUUID();
const APPOINTMENT_IDS = Array.from({ length: 8 }, () => randomUUID());
const STAFF_ALPHA = randomUUID();
const STAFF_ZETA = randomUUID();
const STAFF_FOREIGN = randomUUID();
const SERVICE_1 = randomUUID();
const SERVICE_2 = randomUUID();
const SERVICE_3 = randomUUID();
const SERVICE_9 = randomUUID();
const SERVICE_FOREIGN = randomUUID();

function inAccount<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
  return runWithTenantContext(
    {
      tenantId: TENANT_ID,
      accountId,
      correlationId: `professional-care-report-${randomUUID()}`
    },
    operation
  );
}

describe('scheduling professional care report source on PostgreSQL', () => {
  const pool = getTestPool();
  let scheduling: SchedulingService;

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Professional care report tenant', 'active', now())`,
      [TENANT_ID, `professional-care-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $3, $4, 'Professional care account A', true),
              ($2, $3, $5, 'Professional care account B', true)`,
      [
        ACCOUNT_A,
        ACCOUNT_B,
        TENANT_ID,
        `professional-care-a-${ACCOUNT_A.slice(0, 12)}`,
        `professional-care-b-${ACCOUNT_B.slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, address_json)
       VALUES ($1, $3, 'Tutor professional A', '{"status":"active"}'::jsonb),
              ($2, $4, 'Tutor professional B', '{"status":"active"}'::jsonb)`,
      [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       SELECT patient_id, $2, $3, 'Paciente profissional ' || row_number() OVER (),
              'canine', '{"status":"active"}'::jsonb
       FROM unnest($1::uuid[]) AS patient_id`,
      [PATIENT_IDS, ACCOUNT_A, OWNER_A]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES ($1, $2, $3, 'Paciente profissional B', 'canine', '{"status":"active"}'::jsonb)`,
      [PATIENT_B, ACCOUNT_B, OWNER_B]
    );
    await pool.query(
      `INSERT INTO staff (id, account_id, employee_code, full_name)
       VALUES ($1, $4, 'STAFF-ALPHA', 'Profissional Alpha'),
              ($2, $4, 'STAFF-ZETA', 'Profissional Zeta'),
              ($3, $5, 'STAFF-FOREIGN', 'Profissional Foreign')`,
      [STAFF_ALPHA, STAFF_ZETA, STAFF_FOREIGN, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO services (id, account_id, name, base_price)
       VALUES ($1, $6, 'Serviço 1', 100),
              ($2, $6, 'Serviço 2', 100),
              ($3, $6, 'Serviço 3', 100),
              ($4, $6, 'Serviço 9', 100),
              ($5, $7, 'Serviço foreign', 100)`,
      [SERVICE_1, SERVICE_2, SERVICE_3, SERVICE_9, SERVICE_FOREIGN, ACCOUNT_A, ACCOUNT_B]
    );
    await pool.query(
      `INSERT INTO appointments (
         id, account_id, patient_id, owner_id, start_at, end_at, status, type,
         visit_type, reason, practitioner_staff_id, service_id
       ) VALUES
         ($1, $9, $10, $17, '2026-06-01T09:00:00.000Z', '2026-06-01T09:30:00.000Z',
          'confirmed', 'consultation', 'scheduled', 'Profissional alpha confirmado', $20, $22),
         ($2, $9, $11, $17, '2026-06-02T09:00:00.000Z', '2026-06-02T09:30:00.000Z',
          'completed', 'consultation', 'scheduled', 'Profissional alpha concluído', $20, $22),
         ($3, $9, $12, $17, '2026-06-03T09:00:00.000Z', '2026-06-03T09:30:00.000Z',
          'in_progress', 'consultation', 'scheduled', 'Profissional alpha em andamento', $20, $23),
         ($4, $9, $13, $17, '2026-06-04T09:00:00.000Z', '2026-06-04T09:30:00.000Z',
          'checked_in', 'consultation', 'scheduled', 'Profissional zeta check-in', $21, $24),
         ($5, $9, $14, $17, '2026-06-04T10:00:00.000Z', '2026-06-04T10:30:00.000Z',
          'no_show', 'consultation', 'scheduled', 'Profissional zeta no-show', $21, $24),
         ($6, $9, $15, $17, '2026-06-04T11:00:00.000Z', '2026-06-04T11:30:00.000Z',
          'cancelled', 'consultation', 'scheduled', 'Sem profissional cancelado', NULL, NULL),
         ($7, $9, $10, $17, '2026-07-01T09:00:00.000Z', '2026-07-01T09:30:00.000Z',
          'completed', 'consultation', 'scheduled', 'Fora do período', $21, $26),
         ($8, $16, $19, $18, '2026-06-02T09:00:00.000Z', '2026-06-02T09:30:00.000Z',
          'completed', 'consultation', 'scheduled', 'Conta estrangeira', $25, $27)`,
      [
        ...APPOINTMENT_IDS,
        ACCOUNT_A,
        PATIENT_IDS[0],
        PATIENT_IDS[1],
        PATIENT_IDS[2],
        PATIENT_IDS[3],
        PATIENT_IDS[4],
        PATIENT_IDS[5],
        ACCOUNT_B,
        OWNER_A,
        OWNER_B,
        PATIENT_B,
        STAFF_ALPHA,
        STAFF_ZETA,
        SERVICE_1,
        SERVICE_2,
        SERVICE_3,
        STAFF_FOREIGN,
        SERVICE_9,
        SERVICE_FOREIGN
      ]
    );

    const owners = new OwnersService({ seedOwners: [] });
    const patients = new PatientsService({ owners, seedPatients: [], seedLinks: [] });
    scheduling = new SchedulingService(owners, patients, [], {
      repository: new DatabaseSchedulingRepository()
    });
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_A, ACCOUNT_B]);
  });

  it('aggregates canonical statuses, distinct services and unassigned care with inclusive UTC dates', async () => {
    const rows = await inAccount(ACCOUNT_A, () =>
      scheduling.listPersistedProfessionalCareReportRows(ACCOUNT_A, {
        dateFrom: '2026-06-01',
        dateTo: '2026-06-04'
      })
    );

    expect(rows).toEqual([
      {
        professional: STAFF_ALPHA,
        scheduled: 3,
        completed: 1,
        checkedIn: 1,
        cancelled: 0,
        services: 2
      },
      {
        professional: STAFF_ZETA,
        scheduled: 2,
        completed: 0,
        checkedIn: 1,
        cancelled: 1,
        services: 1
      },
      {
        professional: 'Sem profissional',
        scheduled: 1,
        completed: 0,
        checkedIn: 0,
        cancelled: 1,
        services: 0
      }
    ]);
  });

  it('preserves account isolation and rejects tenant mismatch', async () => {
    const accountBPatient = await pool.query<{ id: string }>(
      'SELECT id FROM patients WHERE account_id = $1 LIMIT 1',
      [ACCOUNT_B]
    );
    const accountB = await inAccount(ACCOUNT_B, () =>
      scheduling.listPersistedProfessionalCareReportRows(ACCOUNT_B)
    );
    expect(accountB).toEqual([
      {
        professional: STAFF_FOREIGN,
        scheduled: 1,
        completed: 1,
        checkedIn: 0,
        cancelled: 0,
        services: 1
      }
    ]);
    expect(accountBPatient.rows).toHaveLength(1);

    await expect(
      inAccount(ACCOUNT_A, () => scheduling.listPersistedProfessionalCareReportRows(ACCOUNT_B))
    ).rejects.toThrow(/does not match tenant context/);
  });

  it('returns the real 10,001-row persisted source overflow sentinel before aggregation', async () => {
    const overflowPrefix = `professional-care-overflow-${randomUUID()}`;
    await pool.query(
      `WITH overflow_source AS (
         SELECT gen_random_uuid() AS id, generated.sequence
           FROM generate_series(1, 10001) AS generated(sequence)
       ), overflow_patients AS (
         INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
         SELECT id, $1, $2, $3 || '-' || sequence, 'canine', '{"status":"active"}'::jsonb
           FROM overflow_source
         RETURNING id
       )
       INSERT INTO appointments (
         id, account_id, patient_id, owner_id, start_at, end_at, status, type,
         visit_type, reason, practitioner_staff_id, service_id
       )
       SELECT gen_random_uuid(),
              $1, patient.id, $2,
              '2026-06-10T10:00:00.000Z', '2026-06-10T10:30:00.000Z',
              'scheduled', 'consultation', 'scheduled', $3, NULL, $4
         FROM overflow_patients AS patient`,
      [ACCOUNT_A, OWNER_A, overflowPrefix, SERVICE_1]
    );

    try {
      await expect(
        inAccount(ACCOUNT_A, () =>
          scheduling.listPersistedProfessionalCareReportRows(ACCOUNT_A, {
            dateFrom: '2026-06-10',
            dateTo: '2026-06-10'
          })
        )
      ).rejects.toThrow('too many rows');
    } finally {
      await pool.query('DELETE FROM appointments WHERE account_id = $1 AND reason = $2', [
        ACCOUNT_A,
        overflowPrefix
      ]);
      await pool.query('DELETE FROM patients WHERE account_id = $1 AND name LIKE $2', [
        ACCOUNT_A,
        `${overflowPrefix}%`
      ]);
    }
  });
});
