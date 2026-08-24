import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseEncounterRepository } from '../../../packages/modules/encounters/src/repositories/database-encounter.repository.js';
import { DatabaseSchedulingRepository } from '../../../packages/modules/scheduling/src/repositories/database-scheduling.repository.js';
import { ConflictError } from '../../../packages/shared/errors/src/index.js';
import {
  createDatabaseClient,
  getDatabaseClient
} from '../../../packages/shared/database/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import type { AppointmentId } from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const USER_ID = randomUUID();

const tenantContext = {
  tenantId: TENANT_ID,
  accountId: ACCOUNT_ID,
  correlationId: `participant-lifecycle-${randomUUID()}`
};

function appointment(
  id = randomUUID(),
  scheduledAt = '2026-08-25T10:00:00.000Z'
) {
  const now = '2026-08-24T12:00:00.000Z';
  return {
    id,
    accountId: ACCOUNT_ID,
    patientId: PATIENT_ID,
    ownerId: OWNER_ID,
    scheduledAt,
    durationMinutes: 30,
    visitType: 'scheduled' as const,
    reason: 'Authoritative lifecycle boundary',
    status: 'scheduled' as const,
    createdAt: now,
    updatedAt: now
  };
}

function encounter(id = randomUUID()) {
  const now = '2026-08-24T12:00:00.000Z';
  return {
    id,
    accountId: ACCOUNT_ID,
    patientId: PATIENT_ID,
    ownerId: OWNER_ID,
    visitType: 'walk_in' as const,
    origin: 'reception' as const,
    reason: 'Authoritative lifecycle boundary',
    status: 'reception' as const,
    openedAt: now,
    createdByUserId: USER_ID,
    updatedAt: now
  };
}

function queueEntry(id = randomUUID(), appointmentId?: AppointmentId) {
  const now = '2026-08-24T12:00:00.000Z';
  return {
    id,
    accountId: ACCOUNT_ID,
    patientId: PATIENT_ID,
    ownerId: OWNER_ID,
    ...(appointmentId ? { appointmentId } : {}),
    entryType: 'standard' as const,
    reason: 'Authoritative lifecycle boundary',
    priority: 'medium' as const,
    status: 'waiting' as const,
    checkedInAt: now,
    currentSector: 'Recepcao',
    operationalStatus: 'waiting' as const,
    clinicalStatus: 'not_started' as const,
    billingStatus: 'not_started' as const,
    handoffStatus: 'not_started' as const,
    createdAt: now,
    updatedAt: now
  };
}

describe('authoritative participant lifecycle guards', () => {
  const pool = getTestPool();
  const scheduling = new DatabaseSchedulingRepository();
  let encounters: DatabaseEncounterRepository;

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    encounters = new DatabaseEncounterRepository(getDatabaseClient());
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Authoritative lifecycle tenant', 'active', now())`,
      [TENANT_ID, `participant-lifecycle-${TENANT_ID}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Authoritative lifecycle account', true)`,
      [ACCOUNT_ID, TENANT_ID, `participant-account-${ACCOUNT_ID.replaceAll('-', '').slice(0, 24)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Lifecycle operator')`,
      [USER_ID, ACCOUNT_ID, `participant-${USER_ID}`, `participant-${USER_ID}@example.test`]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, address_json)
       VALUES ($1, $2, 'Lifecycle owner', '{"status":"active"}'::jsonb)`,
      [OWNER_ID, ACCOUNT_ID]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES ($1, $2, $3, 'Lifecycle patient', 'canine', '{"status":"active"}'::jsonb)`,
      [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  });

  it('rejects appointment creation when another process inactivates the owner', async () => {
    await pool.query(
      `UPDATE owners SET address_json = '{"status":"inactive"}'::jsonb WHERE id = $1`,
      [OWNER_ID]
    );

    await expect(
      runWithTenantContext(tenantContext, () => scheduling.createAppointment(appointment()))
    ).rejects.toBeInstanceOf(ConflictError);

    await pool.query(
      `UPDATE owners SET address_json = '{"status":"active"}'::jsonb WHERE id = $1`,
      [OWNER_ID]
    );
  });

  it('rejects check-in and encounter opening when another process inactivates the patient', async () => {
    const linkedAppointment = appointment(undefined, '2026-08-28T10:00:00.000Z');
    await runWithTenantContext(tenantContext, () =>
      scheduling.createAppointment(linkedAppointment)
    );
    await pool.query(
      `UPDATE patients SET alerts_json = '{"status":"inactive"}'::jsonb WHERE id = $1`,
      [PATIENT_ID]
    );

    await expect(
      runWithTenantContext(tenantContext, () =>
        scheduling.persistCheckIn(queueEntry(randomUUID(), linkedAppointment.id as AppointmentId), {
          ...linkedAppointment,
          status: 'checked_in'
        })
      )
    ).rejects.toBeInstanceOf(ConflictError);
    const appointmentState = await pool.query(
      'SELECT status FROM appointments WHERE id = $1',
      [linkedAppointment.id]
    );
    expect(appointmentState.rows).toEqual([{ status: 'scheduled' }]);

    await expect(
      runWithTenantContext(tenantContext, () => scheduling.createQueueEntry(queueEntry()))
    ).rejects.toBeInstanceOf(ConflictError);
    await expect(
      runWithTenantContext(tenantContext, () => encounters.create(encounter()))
    ).rejects.toBeInstanceOf(ConflictError);

    await pool.query(
      `UPDATE patients SET alerts_json = '{"status":"active"}'::jsonb WHERE id = $1`,
      [PATIENT_ID]
    );
  });

  it('fences encounter reopen against a participant state change at update time', async () => {
    const closed = encounter();
    await pool.query(
      `INSERT INTO encounters (
         id, account_id, patient_id, owner_id, status, opened_by_user_id,
         opened_at, closed_at, close_reason, reason
       ) VALUES ($1, $2, $3, $4, 'closed', $5, now() - interval '1 hour', now(),
                 'Closed before lifecycle change', 'Reopen boundary')`,
      [closed.id, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
    );
    await pool.query(
      `UPDATE owners SET address_json = '{"status":"inactive"}'::jsonb WHERE id = $1`,
      [OWNER_ID]
    );

    await expect(
      runWithTenantContext(tenantContext, () =>
        encounters.updateForReopen!({ ...closed, status: 'reception' })
      )
    ).rejects.toBeInstanceOf(ConflictError);

    await pool.query(
      `UPDATE owners SET address_json = '{"status":"active"}'::jsonb WHERE id = $1`,
      [OWNER_ID]
    );
  });

  it('serializes concurrent check-ins so only one active queue entry commits', async () => {
    const linkedAppointment = appointment();
    await runWithTenantContext(tenantContext, () =>
      scheduling.createAppointment(linkedAppointment)
    );

    const checkedInAppointment = { ...linkedAppointment, status: 'checked_in' as const };
    const outcomes = await Promise.allSettled([
      runWithTenantContext(tenantContext, () =>
        scheduling.persistCheckIn(
          queueEntry(randomUUID(), linkedAppointment.id as AppointmentId),
          checkedInAppointment
        )
      ),
      runWithTenantContext(tenantContext, () =>
        scheduling.persistCheckIn(
          queueEntry(randomUUID(), linkedAppointment.id as AppointmentId),
          checkedInAppointment
        )
      )
    ]);

    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    const rejected = outcomes.find((outcome) => outcome.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : undefined).toBeInstanceOf(
      ConflictError
    );

    const persisted = await pool.query(
      `SELECT a.status, COUNT(q.id)::int AS active_queue_entries
         FROM appointments a
         LEFT JOIN scheduling_queue_entries q
           ON q.account_id = a.account_id
          AND q.appointment_id = a.id::text
          AND q.status NOT IN ('completed', 'cancelled')
        WHERE a.id = $1
        GROUP BY a.id, a.status`,
      [linkedAppointment.id]
    );
    expect(persisted.rows).toEqual([{ status: 'checked_in', active_queue_entries: 1 }]);
  });
});
