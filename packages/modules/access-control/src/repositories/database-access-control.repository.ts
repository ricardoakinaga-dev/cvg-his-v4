import { getPool } from '@cvg-his-v2/shared-database';
import type { RoleId, PermissionId } from '@cvg-his-v2/shared-types';

export interface RoleRecord {
  readonly id: RoleId;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: string;
}

export interface PermissionRecord {
  readonly id: PermissionId;
  readonly key: string;
  readonly description?: string;
  readonly createdAt: string;
}

export interface AccessControlRepository {
  // Roles
  createRole(role: RoleRecord): Promise<void>;
  findRoleById(id: RoleId): Promise<RoleRecord | null>;
  findRoleByName(name: string): Promise<RoleRecord | null>;
  findAllRoles(): Promise<readonly RoleRecord[]>;

  // Permissions
  createPermission(permission: PermissionRecord): Promise<void>;
  findPermissionByKey(key: string): Promise<PermissionRecord | null>;
  findAllPermissions(): Promise<readonly PermissionRecord[]>;

  // Role-Permission
  addPermissionToRole(roleId: RoleId, permissionId: PermissionId): Promise<void>;
  removePermissionFromRole(roleId: RoleId, permissionId: PermissionId): Promise<void>;
  findPermissionsByRole(roleId: RoleId): Promise<readonly PermissionRecord[]>;

  // User-Role
  assignRoleToUser(userId: string, roleId: RoleId): Promise<void>;
  removeRoleFromUser(userId: string, roleId: RoleId): Promise<void>;
  findRolesByUser(userId: string): Promise<readonly RoleRecord[]>;
}

export class DatabaseAccessControlRepository implements AccessControlRepository {
  async createRole(role: RoleRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      'INSERT INTO roles (id, name, description, created_at) VALUES ($1, $2, $3, $4)',
      [role.id, role.name, role.description ?? null, new Date(role.createdAt)]
    );
  }

  async findRoleById(id: RoleId): Promise<RoleRecord | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRole(result.rows[0]);
  }

  async findRoleByName(name: string): Promise<RoleRecord | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM roles WHERE name = $1', [name]);
    if (result.rows.length === 0) return null;
    return this.mapRole(result.rows[0]);
  }

  async findAllRoles(): Promise<readonly RoleRecord[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM roles ORDER BY name');
    return result.rows.map((r: Record<string, unknown>) => this.mapRole(r));
  }

  async createPermission(permission: PermissionRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      'INSERT INTO permissions (id, key, description, created_at) VALUES ($1, $2, $3, $4)',
      [permission.id, permission.key, permission.description ?? null, new Date(permission.createdAt)]
    );
  }

  async findPermissionByKey(key: string): Promise<PermissionRecord | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM permissions WHERE key = $1', [key]);
    if (result.rows.length === 0) return null;
    return this.mapPermission(result.rows[0]);
  }

  async findAllPermissions(): Promise<readonly PermissionRecord[]> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM permissions ORDER BY key');
    return result.rows.map((r: Record<string, unknown>) => this.mapPermission(r));
  }

  async addPermissionToRole(roleId: RoleId, permissionId: PermissionId): Promise<void> {
    const pool = getPool();
    await pool.query(
      'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [roleId, permissionId]
    );
  }

  async removePermissionFromRole(roleId: RoleId, permissionId: PermissionId): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [roleId, permissionId]);
  }

  async findPermissionsByRole(roleId: RoleId): Promise<readonly PermissionRecord[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT p.* FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       WHERE rp.role_id = $1 ORDER BY p.key`,
      [roleId]
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapPermission(r));
  }

  async assignRoleToUser(userId: string, roleId: RoleId): Promise<void> {
    const pool = getPool();
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleId]
    );
  }

  async removeRoleFromUser(userId: string, roleId: RoleId): Promise<void> {
    const pool = getPool();
    await pool.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
  }

  async findRolesByUser(userId: string): Promise<readonly RoleRecord[]> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT r.* FROM roles r
       JOIN user_roles ur ON ur.role_id = r.id
       WHERE ur.user_id = $1 ORDER BY r.name`,
      [userId]
    );
    return result.rows.map((r: Record<string, unknown>) => this.mapRole(r));
  }

  private mapRole(row: Record<string, unknown>): RoleRecord {
    return {
      id: row.id as RoleId,
      name: row.name as string,
      description: (row.description as string) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }

  private mapPermission(row: Record<string, unknown>): PermissionRecord {
    return {
      id: row.id as PermissionId,
      key: row.key as string,
      description: (row.description as string) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}
