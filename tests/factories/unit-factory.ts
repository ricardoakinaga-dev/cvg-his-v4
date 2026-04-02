import { getTestPool } from '../db/db-admin.js';
import {
  uuid,
  queryOne,
  insertOne,
  cleanupRegistry,
  type CreatedEntity
} from '../helpers/db-helpers.js';

export interface UnitRecord {
  id: string;
  accountId: string;
  code: string;
  name: string;
}

export interface UnitOptions {
  accountId?: string;
  code?: string;
  name?: string;
}

export async function createUnit(options: UnitOptions = {}): Promise<UnitRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const code = options.code ?? `unit_${id.slice(0, 8)}`;
  const name = options.name ?? `Test Unit ${code}`;

  const unit = await insertOne<UnitRecord>(
    `INSERT INTO units (id, account_id, code, name) VALUES ($1, $2, $3, $4) RETURNING *`,
    [id, accountId, code, name]
  );

  cleanupRegistry.register('units', id);
  return unit;
}

async function ensureDefaultAccount(): Promise<string> {
  const existing = await queryOne<{ id: string }>(
    `SELECT id FROM accounts WHERE slug = 'default' LIMIT 1`
  );
  if (existing) return existing.id;

  const id = uuid();
  await insertOne(
    `INSERT INTO accounts (id, slug, name, is_active) VALUES ($1, 'default', 'Conta padrão', true) RETURNING *`,
    [id]
  );
  cleanupRegistry.register('accounts', id);
  return id;
}

export { ensureDefaultAccount };
