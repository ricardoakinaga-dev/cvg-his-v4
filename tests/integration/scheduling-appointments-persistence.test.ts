import { randomUUID } from 'node:crypto';

import { DatabaseSchedulingRepository } from '../../packages/modules/scheduling/src/repositories/database-scheduling.repository.ts';
import { closeDatabaseClient, createDatabaseClient } from '@cvg-his-v2/shared-database';
import type { SchedulingAppointmentSummary } from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { getTestPool } from '../db/db-admin.js';
import { TEST_DB_URL } from '../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ACCOUNT_A = randomUUID();
const ACCOUNT_B = randomUUID();
const OWNER_A = randomUUID();
const OWNER_A_2 = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_A = randomUUID();
const PATIENT_B = randomUUID();
const STAFF_A = randomUUID();
const SERVICE_A = randomUUID();

function inAccount<T>(accountId: string, callback: () => T): T {
  return runWithTenantContext(
    {
      tenantId: TENANT_ID,
      accountId,
      correlationId: randomUUID()
    },
    callback
  );
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $3, $4, 'Scheduling Account A'),
            ($2, $3, $5, 'Scheduling Account B')`,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID, `schedule-a-${ACCOUNT_A}`, `schedule-b-${ACCOUNT_B}`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Owner A'), ($3, $2, 'Owner A 2'), ($4, $5, 'Owner B')`,
    [OWNER_A, ACCOUNT_A, OWNER_A_2, OWNER_B, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Patient A', 'canine'),
            ($4, $5, $6, 'Patient B', 'feline')`,
    [PATIENT_A, ACCOUNT_A, OWNER_A, PATIENT_B, ACCOUNT_B, OWNER_B]
  );
  await pool.query(
    `INSERT INTO staff (id, account_id, employee_code, full_name, department, job_title)
     VALUES ($1, $2, 'VET-A', 'Veterinarian A', 'Clinica', 'Veterinario')`,
    [STAFF_A, ACCOUNT_A]
  );
  await pool.query(
    `INSERT INTO services (id, account_id, name, code, base_price)
     VALUES ($1, $2, 'Consulta A', 'CONS-A', 100)`,
    [SERVICE_A, ACCOUNT_A]
  );
});

afterAll(async () => {
  await closeDatabaseClient();
});

describe('database scheduling appointments repository', () => {
  it('round-trips the operational contract through start_at and end_at', async () => {
    const repository = new DatabaseSchedulingRepository();
    const now = '2026-07-11T14:00:00.000Z';
    const appointment: SchedulingAppointmentSummary = {
      id: randomUUID() as never,
      accountId: ACCOUNT_A as never,
      patientId: PATIENT_A as never,
      ownerId: OWNER_A as never,
      scheduledAt: '2026-07-15T13:00:00.000Z',
      durationMinutes: 45,
      visitType: 'scheduled',
      reason: 'Consulta de rotina',
      practitionerStaffId: STAFF_A as never,
      serviceId: SERVICE_A,
      unit: 'Clinica',
      specialty: 'Clinico geral',
      resourceLabel: 'Consultorio 1',
      status: 'scheduled',
      createdAt: now,
      updatedAt: now
    };

    await inAccount(ACCOUNT_A, () => repository.createAppointment(appointment));
    const loaded = await inAccount(ACCOUNT_A, () => repository.findAppointmentById(appointment.id));

    expect(loaded).toMatchObject(appointment);
    const row = await getTestPool().query<{ start_at: Date; end_at: Date }>(
      `SELECT start_at, end_at FROM appointments WHERE id = $1`,
      [appointment.id]
    );
    expect(row.rows[0]!.end_at.getTime() - row.rows[0]!.start_at.getTime()).toBe(45 * 60_000);

    const hidden = await inAccount(ACCOUNT_B, () => repository.findAppointmentById(appointment.id));
    expect(hidden).toBeNull();
  });

  it('updates start and end together when an appointment is rescheduled', async () => {
    const repository = new DatabaseSchedulingRepository();
    const id = randomUUID();
    const appointment: SchedulingAppointmentSummary = {
      id: id as never,
      accountId: ACCOUNT_A as never,
      patientId: PATIENT_A as never,
      ownerId: OWNER_A as never,
      scheduledAt: '2026-07-16T10:00:00.000Z',
      durationMinutes: 30,
      visitType: 'return',
      reason: 'Retorno',
      status: 'scheduled',
      createdAt: '2026-07-11T14:00:00.000Z',
      updatedAt: '2026-07-11T14:00:00.000Z'
    };
    await inAccount(ACCOUNT_A, () => repository.createAppointment(appointment));

    const updated: SchedulingAppointmentSummary = {
      ...appointment,
      scheduledAt: '2026-07-16T15:00:00.000Z',
      durationMinutes: 60,
      reason: 'Retorno reagendado',
      updatedAt: '2026-07-11T15:00:00.000Z'
    };
    await inAccount(ACCOUNT_A, () => repository.updateAppointment(updated));

    const loaded = await inAccount(ACCOUNT_A, () => repository.findAppointmentById(id as never));
    expect(loaded).toMatchObject(updated);
  });

  it('rejects a patient from another account through the composite foreign key', async () => {
    const repository = new DatabaseSchedulingRepository();
    const invalid: SchedulingAppointmentSummary = {
      id: randomUUID() as never,
      accountId: ACCOUNT_A as never,
      patientId: PATIENT_B as never,
      ownerId: OWNER_A as never,
      scheduledAt: '2026-07-17T10:00:00.000Z',
      durationMinutes: 30,
      visitType: 'scheduled',
      reason: 'Cross account',
      status: 'scheduled',
      createdAt: '2026-07-11T14:00:00.000Z',
      updatedAt: '2026-07-11T14:00:00.000Z'
    };

    await expect(
      inAccount(ACCOUNT_A, () => repository.createAppointment(invalid))
    ).rejects.toThrow();
  });

  it('rejects a coherent account B payload while the active context is account A', async () => {
    const repository = new DatabaseSchedulingRepository();
    const accountBAppointment: SchedulingAppointmentSummary = {
      id: randomUUID() as never,
      accountId: ACCOUNT_B as never,
      patientId: PATIENT_B as never,
      ownerId: OWNER_B as never,
      scheduledAt: '2026-07-17T11:00:00.000Z',
      durationMinutes: 30,
      visitType: 'scheduled',
      reason: 'Payload B under context A',
      status: 'scheduled',
      createdAt: '2026-07-11T14:00:00.000Z',
      updatedAt: '2026-07-11T14:00:00.000Z'
    };

    await expect(
      inAccount(ACCOUNT_A, () => repository.createAppointment(accountBAppointment))
    ).rejects.toThrow();
    const leaked = await inAccount(ACCOUNT_A, () => repository.findAllAppointments(ACCOUNT_B as never));
    expect(leaked).toEqual([]);
  });

  it('rejects an owner who does not own the patient even within the same account', async () => {
    const repository = new DatabaseSchedulingRepository();
    const wrongOwner: SchedulingAppointmentSummary = {
      id: randomUUID() as never,
      accountId: ACCOUNT_A as never,
      patientId: PATIENT_A as never,
      ownerId: OWNER_A_2 as never,
      scheduledAt: '2026-07-17T12:00:00.000Z',
      durationMinutes: 30,
      visitType: 'scheduled',
      reason: 'Wrong owner',
      status: 'scheduled',
      createdAt: '2026-07-11T14:00:00.000Z',
      updatedAt: '2026-07-11T14:00:00.000Z'
    };

    await expect(
      inAccount(ACCOUNT_A, () => repository.createAppointment(wrongOwner))
    ).rejects.toThrow();
  });

  it('preserves legacy canonical status and clinical type during an operational update', async () => {
    const repository = new DatabaseSchedulingRepository();
    const id = randomUUID();
    await getTestPool().query(
      `INSERT INTO appointments (
         id, account_id, patient_id, owner_id, start_at, end_at, status, type,
         visit_type, reason, notes
       ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 'surgery', 'scheduled', $7, $7)`,
      [
        id,
        ACCOUNT_A,
        PATIENT_A,
        OWNER_A,
        '2026-07-18T10:00:00.000Z',
        '2026-07-18T11:00:00.000Z',
        'Cirurgia confirmada'
      ]
    );
    const loaded = await inAccount(ACCOUNT_A, () => repository.findAppointmentById(id as never));
    expect(loaded).not.toBeNull();

    await inAccount(ACCOUNT_A, () =>
      repository.updateAppointment({
        ...loaded!,
        scheduledAt: '2026-07-18T12:00:00.000Z',
        reason: 'Cirurgia remarcada'
      })
    );

    const row = await getTestPool().query<{ status: string; type: string }>(
      `SELECT status::text, type::text FROM appointments WHERE id = $1`,
      [id]
    );
    expect(row.rows[0]).toEqual({ status: 'confirmed', type: 'surgery' });
  });
});
