import { uuid, insertOne, cleanupRegistry, queryOne } from '../helpers/db-helpers.js';
import { ensureDefaultAccount } from './unit-factory.js';

export interface OwnerRecord {
  id: string;
  accountId: string;
  unitId: string | null;
  fullName: string;
  document: string | null;
  email: string | null;
  phoneMain: string | null;
}

export interface OwnerOptions {
  accountId?: string;
  unitId?: string | null;
  fullName?: string;
  document?: string;
  email?: string;
  phoneMain?: string;
}

export async function createOwner(options: OwnerOptions = {}): Promise<OwnerRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const unitId = options.unitId ?? null;
  const fullName = options.fullName ?? `Tutor ${id.slice(0, 8)}`;
  const document = options.document ?? null;
  const email = options.email ?? null;
  const phoneMain = options.phoneMain ?? '11999999999';

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO owners (id, account_id, unit_id, full_name, document, email, phone_main)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, account_id, unit_id, full_name, document, email, phone_main`,
    [id, accountId, unitId, fullName, document, email, phoneMain]
  );

  const owner: OwnerRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    unitId: row.unit_id as string | null,
    fullName: row.full_name as string,
    document: row.document as string | null,
    email: row.email as string | null,
    phoneMain: row.phone_main as string | null
  };

  cleanupRegistry.register('owners', id);
  return owner;
}

export async function findOwnerById(id: string): Promise<OwnerRecord | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, account_id, unit_id, full_name, document, email, phone_main FROM owners WHERE id = $1 LIMIT 1`,
    [id]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    unitId: row.unit_id as string | null,
    fullName: row.full_name as string,
    document: row.document as string | null,
    email: row.email as string | null,
    phoneMain: row.phone_main as string | null
  };
}
