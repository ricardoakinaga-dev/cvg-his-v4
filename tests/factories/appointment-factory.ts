import { uuid, insertOne, cleanupRegistry, queryOne } from '../helpers/db-helpers.js';
import { ensureDefaultAccount } from './unit-factory.js';
import { createPatient, findPatientById, type PatientRecord } from './patient-factory.js';
import { createOwner, findOwnerById, type OwnerRecord } from './owner-factory.js';
import { createUser, type UserRecord } from './user-factory.js';

export interface AppointmentRecord {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  professionalUserId: string;
  startAt: string;
  endAt: string;
  status: string;
}

export interface AppointmentOptions {
  accountId?: string;
  patientId?: string;
  patient?: PatientRecord;
  ownerId?: string;
  owner?: OwnerRecord;
  professionalUserId?: string;
  professionalUser?: UserRecord;
  startAt?: string;
  endAt?: string;
  status?: string;
}

export async function createAppointment(
  options: AppointmentOptions = {}
): Promise<AppointmentRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const patient =
    options.patient ??
    (options.patientId ? await findPatientById(options.patientId) : null) ??
    (await createPatient({ accountId }));
  const owner =
    options.owner ??
    (options.ownerId ? await findOwnerById(options.ownerId) : null) ??
    (await createOwner({ accountId }));
  const professionalUser =
    options.professionalUser ??
    (options.professionalUserId ? await findUserById(options.professionalUserId) : null) ??
    (await createUser({ accountId, fullName: 'Dr. Test' }));
  const now = new Date();
  const startAt = options.startAt ?? new Date(now.getTime() + 3600000).toISOString();
  const endAt = options.endAt ?? new Date(now.getTime() + 7200000).toISOString();
  const status = options.status ?? 'scheduled';

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO appointments (id, account_id, patient_id, owner_id, professional_user_id, start_at, end_at, status, type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'consultation') RETURNING id, account_id, patient_id, owner_id, professional_user_id, start_at, end_at, status`,
    [id, accountId, patient.id, owner.id, professionalUser.id, startAt, endAt, status]
  );

  const appointment: AppointmentRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: row.patient_id as string,
    ownerId: row.owner_id as string,
    professionalUserId: row.professional_user_id as string,
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    status: row.status as string
  };

  cleanupRegistry.register('appointments', id);
  return appointment;
}

async function findUserById(id: string) {
  return queryOne<Record<string, unknown>>(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [id]);
}
