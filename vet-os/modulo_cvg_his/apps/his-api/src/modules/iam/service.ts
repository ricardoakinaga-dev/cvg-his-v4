import { append } from '@cvg-his/audit';
import type { db as DbType } from '@cvg-his/db';

import { iamAuthProfileSchema, type IamAuthProfile } from './schemas.js';

type DbLike = typeof DbType;

type PgRow = Record<string, unknown>;

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.length > 0) {
    return value
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((item) => item.replace(/^"|"$/g, '').trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeScopeRows(rows: PgRow[]): IamAuthProfile['scopes'] {
  return rows
    .filter((row) => row.scope_id)
    .map((row) => ({
      id: String(row.scope_id),
      scopeType: String(row.scope_type),
      scopeKey: String(row.scope_key),
      name: String(row.scope_name),
      expiresAt: row.scope_expires_at ? new Date(String(row.scope_expires_at)).toISOString() : null
    }));
}

export async function findUserAuthProfileByLogin(
  db: DbLike,
  login: string
): Promise<IamAuthProfile | null> {
  const result = await db.$client.query(
    `
      select
        u.id,
        u.account_id,
        u.unit_id,
        u.email,
        u.username,
        u.password_hash,
        u.full_name,
        u.is_active,
        u.must_change_password,
        u.failed_login_attempts,
        u.locked_until,
        array_remove(array_agg(distinct r.name), null) as roles,
        array_remove(array_agg(distinct p.key), null) as permissions,
        usa.scope_id,
        s.scope_type,
        s.scope_key,
        s.name as scope_name,
        usa.expires_at as scope_expires_at
      from users u
      join accounts a on a.id = u.account_id and a.is_active = true
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
      left join user_scope_assignments usa on usa.user_id = u.id
      left join access_scopes s on s.id = usa.scope_id and s.is_active = true
      where (lower(u.email) = lower($1) or lower(coalesce(u.username, '')) = lower($1))
        and u.is_active = true
      group by
        u.id,
        u.account_id,
        u.unit_id,
        u.email,
        u.username,
        u.password_hash,
        u.full_name,
        u.is_active,
        u.must_change_password,
        u.failed_login_attempts,
        u.locked_until,
        usa.scope_id,
        s.scope_type,
        s.scope_key,
        s.name,
        usa.expires_at
      order by u.id
    `,
    [login]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const [firstRow] = result.rows;
  const roles = normalizeStringArray(firstRow?.roles);
  const permissions = normalizeStringArray(firstRow?.permissions);

  const profile = {
    id: String(firstRow.id),
    accountId: String(firstRow.account_id),
    unitId: firstRow.unit_id ? String(firstRow.unit_id) : null,
    email: String(firstRow.email),
    username: firstRow.username ? String(firstRow.username) : null,
    fullName: String(firstRow.full_name),
    passwordHash: String(firstRow.password_hash),
    isActive: Boolean(firstRow.is_active),
    mustChangePassword: Boolean(firstRow.must_change_password),
    failedLoginAttempts: Number(firstRow.failed_login_attempts ?? 0),
    lockedUntil: firstRow.locked_until ? new Date(String(firstRow.locked_until)).toISOString() : null,
    roles,
    permissions,
    scopes: normalizeScopeRows(result.rows)
  };

  return iamAuthProfileSchema.parse(profile);
}

export async function createAuthSession(
  db: DbLike,
  input: {
    accountId: string;
    userId: string;
    unitId?: string;
    authMethod: 'password' | 'api_key' | 'dev';
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<{ sessionId: string }> {
  const result = await db.$client.query(
    `
      insert into auth_sessions (
        account_id,
        user_id,
        unit_id,
        auth_method,
        ip_address,
        user_agent,
        expires_at
      )
      values ($1, $2, $3, $4, $5, $6, $7)
      returning id
    `,
    [
      input.accountId,
      input.userId,
      input.unitId ?? null,
      input.authMethod,
      input.ipAddress ?? null,
      input.userAgent ?? null,
      input.expiresAt.toISOString()
    ]
  );

  return {
    sessionId: String(result.rows[0]?.id)
  };
}

export async function getActiveSessionById(
  db: DbLike,
  input: {
    sessionId: string;
    accountId: string;
  }
): Promise<{
  id: string;
  accountId: string;
  userId: string;
  revokedAt: string | null;
  expiresAt: string;
} | null> {
  const result = await db.$client.query(
    `
      select id, account_id, user_id, revoked_at, expires_at
      from auth_sessions
      where id = $1
        and account_id = $2
      limit 1
    `,
    [input.sessionId, input.accountId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    userId: String(row.user_id),
    revokedAt: row.revoked_at ? String(row.revoked_at) : null,
    expiresAt: new Date(String(row.expires_at)).toISOString()
  };
}

export async function touchAuthSession(
  db: DbLike,
  sessionId: string
): Promise<void> {
  await db.$client.query(
    `
      update auth_sessions
      set
        last_seen_at = now(),
        updated_at = now()
      where id = $1
        and revoked_at is null
    `,
    [sessionId]
  );
}

export async function revokeAuthSession(
  db: DbLike,
  input: {
    sessionId: string;
    accountId: string;
    reason: string;
  }
): Promise<boolean> {
  const result = await db.$client.query(
    `
      update auth_sessions
      set
        revoked_at = now(),
        revoked_reason = $3,
        updated_at = now()
      where id = $1
        and account_id = $2
        and revoked_at is null
      returning id
    `,
    [input.sessionId, input.accountId, input.reason]
  );

  return result.rows.length > 0;
}

export async function markUserSuccessfulLogin(
  db: DbLike,
  userId: string
): Promise<void> {
  await db.$client.query(
    `
      update users
      set
        failed_login_attempts = 0,
        locked_until = null,
        last_login_at = now(),
        updated_at = now()
      where id = $1
    `,
    [userId]
  );
}

export async function registerFailedLoginAttempt(
  db: DbLike,
  input: {
    userId: string;
    lockAfterAttempts?: number;
    lockMinutes?: number;
  }
): Promise<{ failedLoginAttempts: number; lockedUntil: string | null }> {
  const lockAfterAttempts = input.lockAfterAttempts ?? 5;
  const lockMinutes = input.lockMinutes ?? 15;

  const result = await db.$client.query(
    `
      update users
      set
        failed_login_attempts = failed_login_attempts + 1,
        locked_until = case
          when failed_login_attempts + 1 >= $2 then now() + ($3 || ' minutes')::interval
          else locked_until
        end,
        updated_at = now()
      where id = $1
      returning failed_login_attempts, locked_until
    `,
    [input.userId, lockAfterAttempts, String(lockMinutes)]
  );

  return {
    failedLoginAttempts: Number(result.rows[0]?.failed_login_attempts ?? 0),
    lockedUntil: result.rows[0]?.locked_until ? new Date(String(result.rows[0]?.locked_until)).toISOString() : null
  };
}

export async function listRoleCatalog(
  db: DbLike
): Promise<Array<{ id: string; name: string; description: string | null }>> {
  const result = await db.$client.query(
    `
      select id, name, description
      from roles
      order by name asc
    `,
    []
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null
  }));
}

export async function listPermissionCatalog(
  db: DbLike
): Promise<Array<{ id: string; key: string; description: string | null }>> {
  const result = await db.$client.query(
    `
      select id, key, description
      from permissions
      order by key asc
    `,
    []
  );

  return result.rows.map((row) => ({
    id: String(row.id),
    key: String(row.key),
    description: row.description ? String(row.description) : null
  }));
}

export async function getUserProfileById(
  db: DbLike,
  input: { accountId: string; userId: string }
): Promise<{
  id: string;
  account_id: string;
  unit_id: string | null;
  email: string;
  username: string | null;
  full_name: string;
  must_change_password: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  created_at: string;
  updated_at: string;
  roles: Array<{ id: string; name: string }>;
  permissions: Array<{ id: string; key: string; description: string | null }>;
  scopes: Array<{ id: string; scopeType: string; scopeKey: string; name: string; expiresAt: string | null }>;
} | null> {
  const result = await db.$client.query(
    `
      select
        u.id,
        u.account_id,
        u.unit_id,
        u.email,
        u.username,
        u.full_name,
        u.must_change_password,
        u.last_login_at,
        u.password_changed_at,
        u.created_at,
        u.updated_at,
        coalesce(
          (
            select json_agg(role_item order by role_item->>'name')
            from (
              select distinct jsonb_build_object('id', r.id, 'name', r.name) as role_item
              from user_roles ur
              join roles r on r.id = ur.role_id
              where ur.user_id = u.id
            ) role_items
          ),
          '[]'::json
        ) as roles,
        coalesce(
          (
            select json_agg(permission_item order by permission_item->>'key')
            from (
              select distinct jsonb_build_object('id', p.id, 'key', p.key, 'description', p.description) as permission_item
              from user_roles ur
              join role_permissions rp on rp.role_id = ur.role_id
              join permissions p on p.id = rp.permission_id
              where ur.user_id = u.id
            ) permission_items
          ),
          '[]'::json
        ) as permissions,
        coalesce(
          (
            select json_agg(scope_item order by scope_item->>'name')
            from (
              select distinct jsonb_build_object(
                'id', s.id,
                'scopeType', s.scope_type,
                'scopeKey', s.scope_key,
                'name', s.name,
                'expiresAt', usa.expires_at
              ) as scope_item
              from user_scope_assignments usa
              join access_scopes s on s.id = usa.scope_id
              where usa.user_id = u.id
            ) scope_items
          ),
          '[]'::json
        ) as scopes
      from users u
      where u.account_id = $1
        and u.id = $2
      limit 1
    `,
    [input.accountId, input.userId]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    account_id: String(row.account_id),
    unit_id: row.unit_id ? String(row.unit_id) : null,
    email: String(row.email),
    username: row.username ? String(row.username) : null,
    full_name: String(row.full_name),
    must_change_password: Boolean(row.must_change_password),
    last_login_at: row.last_login_at ? new Date(String(row.last_login_at)).toISOString() : null,
    password_changed_at: row.password_changed_at ? new Date(String(row.password_changed_at)).toISOString() : null,
    created_at: new Date(String(row.created_at)).toISOString(),
    updated_at: new Date(String(row.updated_at)).toISOString(),
    roles: Array.isArray(row.roles) ? row.roles as Array<{ id: string; name: string }> : [],
    permissions: Array.isArray(row.permissions) ? row.permissions as Array<{ id: string; key: string; description: string | null }> : [],
    scopes: Array.isArray(row.scopes) ? row.scopes as Array<{ id: string; scopeType: string; scopeKey: string; name: string; expiresAt: string | null }> : []
  };
}

export async function updateOwnUserProfile(
  db: DbLike,
  input: {
    accountId: string;
    userId: string;
    email?: string;
    username?: string | null;
    fullName?: string;
  },
  audit: { requestId?: string; actorRoles?: string[] } = {}
): Promise<boolean> {
  const updates: string[] = [];
  const values: unknown[] = [input.accountId, input.userId];
  let index = 3;

  const pushUpdate = (column: string, value: unknown) => {
    updates.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (input.email !== undefined) pushUpdate('email', input.email);
  if (input.username !== undefined) pushUpdate('username', input.username);
  if (input.fullName !== undefined) pushUpdate('full_name', input.fullName);

  if (updates.length === 0) {
    return false;
  }

  updates.push('updated_at = now()');

  const result = await db.$client.query(
    `
      update users
      set ${updates.join(', ')}
      where account_id = $1
        and id = $2
      returning id
    `,
    values
  );

  if (result.rows.length === 0) {
    return false;
  }

  await append({
    accountId: input.accountId,
    actorUserId: input.userId,
    roles: audit.actorRoles ?? [],
    requestId: audit.requestId ?? `user-profile-update-${input.userId}`,
    action: 'user.updated',
    entityType: 'user',
    entityId: input.userId,
    afterJson: {
      email: input.email,
      username: input.username,
      fullName: input.fullName
    },
    reason: 'self_service_profile_update'
  });

  return true;
}

export async function getUserPasswordHashById(
  db: DbLike,
  input: { accountId: string; userId: string }
): Promise<string | null> {
  const result = await db.$client.query(
    `
      select password_hash
      from users
      where account_id = $1
        and id = $2
      limit 1
    `,
    [input.accountId, input.userId]
  );

  const row = result.rows[0];
  return row?.password_hash ? String(row.password_hash) : null;
}

export async function updateOwnUserPassword(
  db: DbLike,
  input: {
    accountId: string;
    userId: string;
    passwordHash: string;
  },
  audit: { requestId?: string; actorRoles?: string[] } = {}
): Promise<boolean> {
  const result = await db.$client.query(
    `
      update users
      set
        password_hash = $3,
        must_change_password = false,
        password_changed_at = now(),
        updated_at = now()
      where account_id = $1
        and id = $2
      returning id
    `,
    [input.accountId, input.userId, input.passwordHash]
  );

  if (result.rows.length === 0) {
    return false;
  }

  await append({
    accountId: input.accountId,
    actorUserId: input.userId,
    roles: audit.actorRoles ?? [],
    requestId: audit.requestId ?? `user-password-change-${input.userId}`,
    action: 'user.password.changed',
    entityType: 'user',
    entityId: input.userId,
    reason: 'self_service_password_change'
  });

  return true;
}
