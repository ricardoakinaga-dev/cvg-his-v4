import { uuid, insertOne, cleanupRegistry, queryOne } from '../helpers/db-helpers.js';
import { ensureDefaultAccount } from './unit-factory.js';
import { createPatient, findPatientById, type PatientRecord } from './patient-factory.js';
import { createOwner, findOwnerById, type OwnerRecord } from './owner-factory.js';
import { createUser, type UserRecord } from './user-factory.js';

export interface EncounterRecord {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  status: string;
  openedByUserId: string;
  reason: string | null;
}

export interface EncounterOptions {
  accountId?: string;
  patientId?: string;
  patient?: PatientRecord;
  ownerId?: string;
  owner?: OwnerRecord;
  status?: string;
  openedByUserId?: string;
  openedByUser?: UserRecord;
  reason?: string;
}

export async function createEncounter(options: EncounterOptions = {}): Promise<EncounterRecord> {
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
  const openedByUser =
    options.openedByUser ??
    (options.openedByUserId ? await findUserById(options.openedByUserId) : null) ??
    (await createUser({ accountId }));
  const status = options.status ?? 'open';
  const reason = options.reason ?? 'Test encounter';

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, account_id, patient_id, owner_id, status, opened_by_user_id, reason`,
    [id, accountId, patient.id, owner.id, status, openedByUser.id, reason]
  );

  const encounter: EncounterRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: row.patient_id as string,
    ownerId: row.owner_id as string,
    status: row.status as string,
    openedByUserId: row.opened_by_user_id as string,
    reason: row.reason as string | null
  };

  cleanupRegistry.register('encounters', id);
  return encounter;
}

async function findUserById(id: string) {
  return queryOne<Record<string, unknown>>(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [id]);
}

export async function findEncounterById(id: string): Promise<EncounterRecord | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, account_id, patient_id, owner_id, status, opened_by_user_id, reason FROM encounters WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: row.patient_id as string,
    ownerId: row.owner_id as string,
    status: row.status as string,
    openedByUserId: row.opened_by_user_id as string,
    reason: row.reason as string | null
  };
}
