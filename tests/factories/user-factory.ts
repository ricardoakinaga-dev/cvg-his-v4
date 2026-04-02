import { uuid, insertOne, cleanupRegistry, queryOne } from '../helpers/db-helpers.js';
import { ensureDefaultAccount } from './unit-factory.js';
import { getOrCreateRole } from './role-factory.js';

export interface UserRecord {
  id: string;
  accountId: string;
  unitId: string | null;
  email: string;
  passwordHash: string;
  fullName: string;
  isActive: boolean;
}

export interface UserOptions {
  accountId?: string;
  unitId?: string | null;
  email?: string;
  passwordHash?: string;
  fullName?: string;
  isActive?: boolean;
  roleCodes?: string[];
}

const DEFAULT_PASSWORD_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

export async function createUser(options: UserOptions = {}): Promise<UserRecord> {
  const id = uuid();
  const accountId = options.accountId ?? (await ensureDefaultAccount());
  const unitId = options.unitId ?? null;
  const email = options.email ?? `user_${id.slice(0, 8)}@test.com`;
  const passwordHash = options.passwordHash ?? DEFAULT_PASSWORD_HASH;
  const fullName = options.fullName ?? `Test User ${id.slice(0, 8)}`;
  const isActive = options.isActive !== false;

  const row = await insertOne<Record<string, unknown>>(
    `INSERT INTO users (id, account_id, unit_id, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, account_id, unit_id, email, password_hash, full_name, is_active`,
    [id, accountId, unitId, email, passwordHash, fullName, isActive]
  );

  const user: UserRecord = {
    id: row.id as string,
    accountId: row.account_id as string,
    unitId: row.unit_id as string | null,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    fullName: row.full_name as string,
    isActive: row.is_active as boolean
  };

  if (options.roleCodes && options.roleCodes.length > 0) {
    for (const roleCode of options.roleCodes) {
      const role = await getOrCreateRole(roleCode);
      const pool = (await import('../db/db-admin.js')).getTestPool();
      await pool.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [id, role.id]
      );
    }
  }

  cleanupRegistry.register('users', id);
  return user;
}

export async function createAdminUser(options: Partial<UserOptions> = {}): Promise<UserRecord> {
  return createUser({
    ...options,
    fullName: options.fullName ?? 'Admin Test',
    email: options.email ?? `admin_${uuid().slice(0, 8)}@test.com`,
    roleCodes: ['admin']
  });
}

export async function createVeterinarianUser(
  options: Partial<UserOptions> = {}
): Promise<UserRecord> {
  return createUser({
    ...options,
    fullName: options.fullName ?? 'Vet Test',
    email: options.email ?? `vet_${uuid().slice(0, 8)}@test.com`,
    roleCodes: ['veterinarian']
  });
}

export async function createReceptionUser(options: Partial<UserOptions> = {}): Promise<UserRecord> {
  return createUser({
    ...options,
    fullName: options.fullName ?? 'Reception Test',
    email: options.email ?? `reception_${uuid().slice(0, 8)}@test.com`,
    roleCodes: ['reception']
  });
}

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT id, account_id, unit_id, email, password_hash, full_name, is_active FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  if (!row) return null;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    unitId: row.unit_id as string | null,
    email: row.email as string,
    passwordHash: row.password_hash as string,
    fullName: row.full_name as string,
    isActive: row.is_active as boolean
  };
}
