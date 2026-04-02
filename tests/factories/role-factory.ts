import { getTestPool } from '../db/db-admin.js';
import { uuid, queryOne, insertOne, cleanupRegistry } from '../helpers/db-helpers.js';

export interface RoleRecord {
  id: string;
  name: string;
  description: string;
}

export interface RoleOptions {
  name?: string;
  description?: string;
}

export async function createRole(options: RoleOptions = {}): Promise<RoleRecord> {
  const id = uuid();
  const name = options.name ?? `role_${id.slice(0, 8)}`;
  const description = options.description ?? `Test role ${name}`;

  const role = await insertOne<RoleRecord>(
    `INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) RETURNING *`,
    [id, name, description]
  );

  cleanupRegistry.register('roles', id);
  return role;
}

export async function getOrCreateRole(name: string): Promise<RoleRecord> {
  const existing = await queryOne<RoleRecord>(`SELECT * FROM roles WHERE name = $1 LIMIT 1`, [
    name
  ]);
  if (existing) return existing;
  return createRole({ name });
}

export interface PermissionRecord {
  id: string;
  key: string;
  description: string;
}

export interface PermissionOptions {
  key?: string;
  description?: string;
}

export async function createPermission(options: PermissionOptions = {}): Promise<PermissionRecord> {
  const id = uuid();
  const key = options.key ?? `perm_${id.slice(0, 8)}`;
  const description = options.description ?? `Test permission ${key}`;

  const perm = await insertOne<PermissionRecord>(
    `INSERT INTO permissions (id, key, description) VALUES ($1, $2, $3) RETURNING *`,
    [id, key, description]
  );

  cleanupRegistry.register('permissions', id);
  return perm;
}

export async function assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
  await getTestPool().query(
    `INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [roleId, permissionId]
  );
}
