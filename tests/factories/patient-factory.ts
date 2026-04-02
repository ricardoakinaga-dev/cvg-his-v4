import { uuid, insertOne, cleanupRegistry, queryOne } from '../helpers/db-helpers.js';
import { ensureDefaultAccount } from './unit-factory.js';
import { createOwner, findOwnerById, type OwnerRecord } from './owner-factory.js';

export interface PatientRecord {
  id: string;
  accountId: string;
  unitId: string | null;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
}

export interface PatientOptions {
  accountId?: string;
  unitId?: string | null;
  ownerId?: string;
  owner?: OwnerRecord;
  name?: string;
  species?: string;
  breed?: string;
  sex?: string;
}

export async function createPatient(options: PatientOptions = {}): Promise<PatientRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const unitId = options.unitId ?? null;
  const owner =
    options.owner ??
    (options.ownerId ? await findOwnerById(options.ownerId) : null) ??
    (await createOwner({ accountId }));
  const name = options.name ?? `Paciente ${id.slice(0, 8)}`;
  const species = options.species ?? 'canine';
  const breed = options.breed ?? null;
  const sex = options.sex ?? 'male';

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO patients (id, account_id, unit_id, owner_id, name, species, breed, sex)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, account_id, unit_id, owner_id, name, species, breed, sex`,
    [id, accountId, unitId, owner.id, name, species, breed, sex]
  );

  const patient: PatientRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    unitId: row.unit_id as string | null,
    ownerId: row.owner_id as string,
    name: row.name as string,
    species: row.species as string,
    breed: row.breed as string | null,
    sex: row.sex as string | null
  };

  cleanupRegistry.register('patients', id);
  return patient;
}

export async function findPatientById(id: string): Promise<PatientRecord | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, account_id, unit_id, owner_id, name, species, breed, sex FROM patients WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    unitId: row.unit_id as string | null,
    ownerId: row.owner_id as string,
    name: row.name as string,
    species: row.species as string,
    breed: row.breed as string | null,
    sex: row.sex as string | null
  };
}
