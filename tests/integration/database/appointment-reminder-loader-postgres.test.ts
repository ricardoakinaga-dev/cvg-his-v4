import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createAppointmentReminderLoader } from '../../../apps/worker/src/jobs/appointment-reminder-handler.js';
import { createDatabaseClient, getPool } from '../../../packages/shared/database/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID();
const FOREIGN_ACCOUNT_ID = randomUUID();
const USER_ID = randomUUID();
const OWNER_ID = randomUUID();
const PATIENT_ID = randomUUID();
const APPOINTMENT_ID = randomUUID();

describe('appointment reminder loader on PostgreSQL', () => {
  const pool = getTestPool();

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Reminder tenant', 'active', now())`,
      [TENANT_ID, `reminder-${TENANT_ID}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Reminder account', true),
              ($4, $2, $5, 'Foreign reminder account', true)`,
      [
        ACCOUNT_ID,
        TENANT_ID,
        `reminder-${ACCOUNT_ID.slice(0, 16)}`,
        FOREIGN_ACCOUNT_ID,
        `reminder-foreign-${FOREIGN_ACCOUNT_ID.slice(0, 12)}`
      ]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Vet')`,
      [USER_ID, ACCOUNT_ID, `vet-${USER_ID}`, `vet-${USER_ID}@example.test`]
    );
    await pool.query(
      `INSERT INTO owners (id, account_id, full_name, phone_main, address_json)
       VALUES ($1, $2, 'Maria Tutora', '+55 11 90000-0000', '{"status":"active"}'::jsonb)`,
      [OWNER_ID, ACCOUNT_ID]
    );
    await pool.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species, alerts_json)
       VALUES ($1, $2, $3, 'Luna', 'canine', '{"status":"active"}'::jsonb)`,
      [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
    );
    await pool.query(
      `INSERT INTO appointments (id, account_id, patient_id, owner_id, professional_user_id, start_at, end_at, status, type, visit_type, reason)
       VALUES ($1, $2, $3, $4, $5, '2030-01-02T12:00:00Z', '2030-01-02T12:30:00Z', 'confirmed', 'vaccination', 'scheduled', 'Vacina anual')`,
      [APPOINTMENT_ID, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [ACCOUNT_ID, FOREIGN_ACCOUNT_ID]);
  });

  it('reads the appointment, patient and tutor phone under the tenant boundary', async () => {
    const load = createAppointmentReminderLoader(getPool());

    const row = await load(ACCOUNT_ID, APPOINTMENT_ID);

    expect(row).toMatchObject({
      id: APPOINTMENT_ID,
      status: 'confirmed',
      type: 'vaccination',
      patient_id: PATIENT_ID,
      owner_id: OWNER_ID,
      patient_name: 'Luna',
      owner_name: 'Maria Tutora',
      owner_phone: '+55 11 90000-0000'
    });
    expect(new Date(row!.start_at).toISOString()).toBe('2030-01-02T12:00:00.000Z');
  });

  it('does not reveal the appointment to another account', async () => {
    const load = createAppointmentReminderLoader(getPool());

    expect(await load(FOREIGN_ACCOUNT_ID, APPOINTMENT_ID)).toBeNull();
    expect(await load(ACCOUNT_ID, 'not-a-uuid')).toBeNull();
  });
});
