import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccessAssignmentEffect,
  AccessSectorId,
  AccessSectorSummary,
  AccessTeamId,
  AccessTeamSummary,
  AccountId,
  PermissionId,
  RoleId,
  UserId
} from '@cvg-his-v2/shared-types';

export interface RoleRecord {
  readonly id: RoleId;
  readonly code: string;
  readonly name: string;
  readonly description?: string;
  readonly createdAt: string;
  readonly permissionCodes: readonly string[];
}

export interface PermissionRecord {
  readonly id: PermissionId;
  readonly key: string;
  readonly description?: string;
  readonly createdAt: string;
}

export interface AccessMembershipRecord {
  readonly userId: UserId;
  readonly subjectType: 'team' | 'sector';
  readonly subjectId: AccessTeamId | AccessSectorId;
  readonly createdAt: string;
}

export interface AccessPermissionAssignmentRecord {
  readonly accountId: AccountId;
  readonly subjectType: 'user' | 'team' | 'sector';
  readonly subjectId: string;
  readonly permissionCode: string;
  readonly effect: AccessAssignmentEffect;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AccessControlRepository {
  createRole(role: RoleRecord): Promise<void>;
  findRoleById(id: RoleId): Promise<RoleRecord | null>;
  findRoleByName(name: string): Promise<RoleRecord | null>;
  findAllRoles(): Promise<readonly RoleRecord[]>;

  createPermission(permission: PermissionRecord): Promise<void>;
  findPermissionByKey(key: string): Promise<PermissionRecord | null>;
  findAllPermissions(): Promise<readonly PermissionRecord[]>;

  addPermissionToRole(roleId: RoleId, permissionId: PermissionId): Promise<void>;
  removePermissionFromRole(roleId: RoleId, permissionId: PermissionId): Promise<void>;
  findPermissionsByRole(roleId: RoleId): Promise<readonly PermissionRecord[]>;

  assignRoleToUser(userId: string, roleId: RoleId): Promise<void>;
  removeRoleFromUser(userId: string, roleId: RoleId): Promise<void>;
  findRolesByUser(userId: string): Promise<readonly RoleRecord[]>;

  createTeam(input: {
    accountId: AccountId;
    code: string;
    name: string;
    description?: string | null;
  }): Promise<AccessTeamSummary>;
  updateTeam(
    id: AccessTeamId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessTeamSummary>;
  findAllTeams(accountId: AccountId): Promise<readonly AccessTeamSummary[]>;

  createSector(input: {
    accountId: AccountId;
    code: string;
    name: string;
    description?: string | null;
  }): Promise<AccessSectorSummary>;
  updateSector(
    id: AccessSectorId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessSectorSummary>;
  findAllSectors(accountId: AccountId): Promise<readonly AccessSectorSummary[]>;

  replaceUserTeams(userId: UserId, teamIds: readonly AccessTeamId[]): Promise<void>;
  replaceUserSectors(userId: UserId, sectorIds: readonly AccessSectorId[]): Promise<void>;
  findTeamMemberships(accountId: AccountId): Promise<readonly AccessMembershipRecord[]>;
  findSectorMemberships(accountId: AccountId): Promise<readonly AccessMembershipRecord[]>;

  upsertPermissionAssignment(input: {
    accountId: AccountId;
    subjectType: 'user' | 'team' | 'sector';
    subjectId: string;
    permissionCode: string;
    effect: AccessAssignmentEffect;
  }): Promise<void>;
  removePermissionAssignment(input: {
    subjectType: 'user' | 'team' | 'sector';
    subjectId: string;
    permissionCode: string;
  }): Promise<void>;
  findPermissionAssignments(accountId: AccountId): Promise<readonly AccessPermissionAssignmentRecord[]>;
}

export class DatabaseAccessControlRepository implements AccessControlRepository {
  async createRole(role: RoleRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        'INSERT INTO roles (id, name, description, created_at) VALUES ($1, $2, $3, $4)',
        [role.id, role.code, role.description ?? null, new Date(role.createdAt)]
      );
    });
  }

  async findRoleById(id: RoleId): Promise<RoleRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM roles WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRole(result.rows[0]);
    });
  }

  async findRoleByName(name: string): Promise<RoleRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM roles WHERE name = $1', [name]);
      if (result.rows.length === 0) return null;
      return this.mapRole(result.rows[0]);
    });
  }

  async findAllRoles(): Promise<readonly RoleRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT r.*, COALESCE(array_agg(p.key ORDER BY p.key) FILTER (WHERE p.key IS NOT NULL), '{}') AS permission_codes
         FROM roles r
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
         GROUP BY r.id, r.name, r.description, r.created_at
         ORDER BY r.name`
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRole(r));
    });
  }

  async createPermission(permission: PermissionRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        'INSERT INTO permissions (id, key, description, created_at) VALUES ($1, $2, $3, $4)',
        [permission.id, permission.key, permission.description ?? null, new Date(permission.createdAt)]
      );
    });
  }

  async findPermissionByKey(key: string): Promise<PermissionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM permissions WHERE key = $1', [key]);
      if (result.rows.length === 0) return null;
      return this.mapPermission(result.rows[0]);
    });
  }

  async findAllPermissions(): Promise<readonly PermissionRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM permissions ORDER BY key');
      return result.rows.map((r: Record<string, unknown>) => this.mapPermission(r));
    });
  }

  async addPermissionToRole(roleId: RoleId, permissionId: PermissionId): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [roleId, permissionId]
      );
    });
  }

  async removePermissionFromRole(roleId: RoleId, permissionId: PermissionId): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query('DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2', [
        roleId,
        permissionId
      ]);
    });
  }

  async findPermissionsByRole(roleId: RoleId): Promise<readonly PermissionRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON rp.permission_id = p.id
         WHERE rp.role_id = $1 ORDER BY p.key`,
        [roleId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapPermission(r));
    });
  }

  async assignRoleToUser(userId: string, roleId: RoleId): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleId]
      );
    });
  }

  async removeRoleFromUser(userId: string, roleId: RoleId): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
    });
  }

  async findRolesByUser(userId: string): Promise<readonly RoleRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT r.*, COALESCE(array_agg(p.key ORDER BY p.key) FILTER (WHERE p.key IS NOT NULL), '{}') AS permission_codes
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         LEFT JOIN role_permissions rp ON rp.role_id = r.id
         LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE ur.user_id = $1
         GROUP BY r.id, r.name, r.description, r.created_at
         ORDER BY r.name`,
        [userId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRole(r));
    });
  }

  async createTeam(input: {
    accountId: AccountId;
    code: string;
    name: string;
    description?: string | null;
  }): Promise<AccessTeamSummary> {
    const now = nowIso();
    const id = `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO access_teams (id, account_id, code, name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, input.accountId, input.code, input.name, input.description ?? null, true, new Date(now), new Date(now)]
      );
      return {
        id: id as AccessTeamId,
        accountId: input.accountId,
        code: input.code,
        name: input.name,
        description: input.description ?? undefined,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
    });
  }

  async updateTeam(
    id: AccessTeamId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessTeamSummary> {
    return withTenantQuery(getPool(), async (client) => {
      const existingResult = await client.query(`SELECT * FROM access_teams WHERE id = $1`, [id]);
      if (existingResult.rows.length === 0) throw new Error(`Access team not found: ${id}`);
      const existing = this.mapTeam(existingResult.rows[0]);
      const now = nowIso();
      await client.query(
        `UPDATE access_teams
         SET code = $2, name = $3, description = $4, is_active = $5, updated_at = $6
         WHERE id = $1`,
        [
          id,
          input.code ?? existing.code,
          input.name ?? existing.name,
          input.description !== undefined ? input.description : existing.description ?? null,
          input.isActive ?? (existing.status === 'active'),
          new Date(now)
        ]
      );
      return {
        ...existing,
        code: input.code ?? existing.code,
        name: input.name ?? existing.name,
        description:
          input.description !== undefined ? input.description ?? undefined : existing.description,
        status: input.isActive !== undefined ? (input.isActive ? 'active' : 'inactive') : existing.status,
        updatedAt: now
      };
    });
  }

  async findAllTeams(accountId: AccountId): Promise<readonly AccessTeamSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM access_teams WHERE account_id = $1 ORDER BY name`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapTeam(row));
    });
  }

  async createSector(input: {
    accountId: AccountId;
    code: string;
    name: string;
    description?: string | null;
  }): Promise<AccessSectorSummary> {
    const now = nowIso();
    const id = `sector_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO access_sectors (id, account_id, code, name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, input.accountId, input.code, input.name, input.description ?? null, true, new Date(now), new Date(now)]
      );
      return {
        id: id as AccessSectorId,
        accountId: input.accountId,
        code: input.code,
        name: input.name,
        description: input.description ?? undefined,
        status: 'active',
        createdAt: now,
        updatedAt: now
      };
    });
  }

  async updateSector(
    id: AccessSectorId,
    input: { code?: string; name?: string; description?: string | null; isActive?: boolean }
  ): Promise<AccessSectorSummary> {
    return withTenantQuery(getPool(), async (client) => {
      const existingResult = await client.query(`SELECT * FROM access_sectors WHERE id = $1`, [id]);
      if (existingResult.rows.length === 0) throw new Error(`Access sector not found: ${id}`);
      const existing = this.mapSector(existingResult.rows[0]);
      const now = nowIso();
      await client.query(
        `UPDATE access_sectors
         SET code = $2, name = $3, description = $4, is_active = $5, updated_at = $6
         WHERE id = $1`,
        [
          id,
          input.code ?? existing.code,
          input.name ?? existing.name,
          input.description !== undefined ? input.description : existing.description ?? null,
          input.isActive ?? (existing.status === 'active'),
          new Date(now)
        ]
      );
      return {
        ...existing,
        code: input.code ?? existing.code,
        name: input.name ?? existing.name,
        description:
          input.description !== undefined ? input.description ?? undefined : existing.description,
        status: input.isActive !== undefined ? (input.isActive ? 'active' : 'inactive') : existing.status,
        updatedAt: now
      };
    });
  }

  async findAllSectors(accountId: AccountId): Promise<readonly AccessSectorSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM access_sectors WHERE account_id = $1 ORDER BY name`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapSector(row));
    });
  }

  async replaceUserTeams(userId: UserId, teamIds: readonly AccessTeamId[]): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM access_team_memberships WHERE user_id = $1', [userId]);
      for (const teamId of teamIds) {
        await client.query(
          `INSERT INTO access_team_memberships (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, teamId]
        );
      }
    });
  }

  async replaceUserSectors(userId: UserId, sectorIds: readonly AccessSectorId[]): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM access_sector_memberships WHERE user_id = $1', [userId]);
      for (const sectorId of sectorIds) {
        await client.query(
          `INSERT INTO access_sector_memberships (user_id, sector_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, sectorId]
        );
      }
    });
  }

  async findTeamMemberships(accountId: AccountId): Promise<readonly AccessMembershipRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT m.user_id, m.team_id, m.created_at
         FROM access_team_memberships m
         JOIN users u ON u.id = m.user_id
         WHERE u.account_id = $1`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => ({
        userId: row.user_id as UserId,
        subjectType: 'team',
        subjectId: row.team_id as AccessTeamId,
        createdAt: new Date(row.created_at as string).toISOString()
      }));
    });
  }

  async findSectorMemberships(accountId: AccountId): Promise<readonly AccessMembershipRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT m.user_id, m.sector_id, m.created_at
         FROM access_sector_memberships m
         JOIN users u ON u.id = m.user_id
         WHERE u.account_id = $1`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => ({
        userId: row.user_id as UserId,
        subjectType: 'sector',
        subjectId: row.sector_id as AccessSectorId,
        createdAt: new Date(row.created_at as string).toISOString()
      }));
    });
  }

  async upsertPermissionAssignment(input: {
    accountId: AccountId;
    subjectType: 'user' | 'team' | 'sector';
    subjectId: string;
    permissionCode: string;
    effect: AccessAssignmentEffect;
  }): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const permResult = await client.query('SELECT * FROM permissions WHERE key = $1', [input.permissionCode]);
      if (permResult.rows.length === 0) throw new Error(`Permission not found: ${input.permissionCode}`);
      const permission = this.mapPermission(permResult.rows[0]);
      const now = nowIso();
      if (input.subjectType === 'user') {
        await client.query(
          `INSERT INTO access_user_permissions (user_id, permission_id, effect, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (user_id, permission_id)
           DO UPDATE SET effect = EXCLUDED.effect, updated_at = EXCLUDED.updated_at`,
          [input.subjectId, permission.id, input.effect, new Date(now), new Date(now)]
        );
        return;
      }
      if (input.subjectType === 'team') {
        await client.query(
          `INSERT INTO access_team_permissions (team_id, permission_id, effect, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (team_id, permission_id)
           DO UPDATE SET effect = EXCLUDED.effect, updated_at = EXCLUDED.updated_at`,
          [input.subjectId, permission.id, input.effect, new Date(now), new Date(now)]
        );
        return;
      }
      await client.query(
        `INSERT INTO access_sector_permissions (sector_id, permission_id, effect, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (sector_id, permission_id)
         DO UPDATE SET effect = EXCLUDED.effect, updated_at = EXCLUDED.updated_at`,
        [input.subjectId, permission.id, input.effect, new Date(now), new Date(now)]
      );
    });
  }

  async removePermissionAssignment(input: {
    subjectType: 'user' | 'team' | 'sector';
    subjectId: string;
    permissionCode: string;
  }): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const permResult = await client.query('SELECT * FROM permissions WHERE key = $1', [input.permissionCode]);
      if (permResult.rows.length === 0) return;
      const permission = this.mapPermission(permResult.rows[0]);
      if (input.subjectType === 'user') {
        await client.query(
          'DELETE FROM access_user_permissions WHERE user_id = $1 AND permission_id = $2',
          [input.subjectId, permission.id]
        );
        return;
      }
      if (input.subjectType === 'team') {
        await client.query(
          'DELETE FROM access_team_permissions WHERE team_id = $1 AND permission_id = $2',
          [input.subjectId, permission.id]
        );
        return;
      }
      await client.query(
        'DELETE FROM access_sector_permissions WHERE sector_id = $1 AND permission_id = $2',
        [input.subjectId, permission.id]
      );
    });
  }

  async findPermissionAssignments(
    accountId: AccountId
  ): Promise<readonly AccessPermissionAssignmentRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT u.account_id, 'user' AS subject_type, aup.user_id::text AS subject_id, p.key AS permission_code, aup.effect, aup.created_at, aup.updated_at
         FROM access_user_permissions aup
         JOIN users u ON u.id = aup.user_id
         JOIN permissions p ON p.id = aup.permission_id
         WHERE u.account_id = $1
         UNION ALL
         SELECT t.account_id, 'team' AS subject_type, atp.team_id::text AS subject_id, p.key AS permission_code, atp.effect, atp.created_at, atp.updated_at
         FROM access_team_permissions atp
         JOIN access_teams t ON t.id = atp.team_id
         JOIN permissions p ON p.id = atp.permission_id
         WHERE t.account_id = $1
         UNION ALL
         SELECT s.account_id, 'sector' AS subject_type, asp.sector_id::text AS subject_id, p.key AS permission_code, asp.effect, asp.created_at, asp.updated_at
         FROM access_sector_permissions asp
         JOIN access_sectors s ON s.id = asp.sector_id
         JOIN permissions p ON p.id = asp.permission_id
         WHERE s.account_id = $1`,
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => ({
        accountId: row.account_id as AccountId,
        subjectType: row.subject_type as 'user' | 'team' | 'sector',
        subjectId: row.subject_id as string,
        permissionCode: row.permission_code as string,
        effect: row.effect as AccessAssignmentEffect,
        createdAt: new Date(row.created_at as string).toISOString(),
        updatedAt: new Date(row.updated_at as string).toISOString()
      }));
    });
  }

  private mapRole(row: Record<string, unknown>): RoleRecord {
    const code = row.name as string;
    return {
      id: row.id as RoleId,
      code,
      name: toTitle(code),
      description: (row.description as string) ?? undefined,
      createdAt: new Date(row.created_at as string).toISOString(),
      permissionCodes: ((row.permission_codes as readonly string[] | undefined) ?? []).filter(Boolean)
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

  private mapTeam(row: Record<string, unknown>): AccessTeamSummary {
    return {
      id: row.id as AccessTeamId,
      accountId: row.account_id as AccountId,
      code: row.code as string,
      name: row.name as string,
      description: (row.description as string) ?? undefined,
      status: (row.is_active as boolean) ? 'active' : 'inactive',
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapSector(row: Record<string, unknown>): AccessSectorSummary {
    return {
      id: row.id as AccessSectorId,
      accountId: row.account_id as AccountId,
      code: row.code as string,
      name: row.name as string,
      description: (row.description as string) ?? undefined,
      status: (row.is_active as boolean) ? 'active' : 'inactive',
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}

function toTitle(value: string): string {
  return value
    .split(/[_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function nowIso(): string {
  return new Date().toISOString();
}
