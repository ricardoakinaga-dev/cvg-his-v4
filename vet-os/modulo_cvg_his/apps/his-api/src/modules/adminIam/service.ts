import { append } from '@cvg-his/audit';
import type { db as DbType } from '@cvg-his/db';

type DbLike = typeof DbType;

type ActorLike = {
  accountId: string;
  userId?: string;
  roles: string[];
};

type AuditMeta = {
  requestId?: string;
};

function assertCanMutatePrivilegedTarget(actor: ActorLike, targetUserId: string): void {
  if (actor.userId && actor.userId === targetUserId) {
    const error = new Error('You cannot change your own privileges or disable your own account.');
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}

function assertCanMutateRoleDefinition(actor: ActorLike, roleNamesAffected: string[]): void {
  if (roleNamesAffected.some((roleName) => actor.roles.includes(roleName))) {
    const error = new Error('You cannot change permissions of a role currently assigned to your own account.');
    (error as Error & { statusCode?: number }).statusCode = 403;
    throw error;
  }
}

export async function listAdminUsers(
  db: DbLike,
  actor: ActorLike,
  query: { search?: string; active?: boolean; page: number; pageSize: number }
): Promise<{ data: unknown[]; total: number; page: number; pageSize: number }> {
  const whereParts = ['u.account_id = $1'];
  const values: unknown[] = [actor.accountId];
  let index = 2;

  if (query.search) {
    whereParts.push(`(lower(u.email) like lower($${index}) or lower(u.full_name) like lower($${index}) or lower(coalesce(u.username, '')) like lower($${index}))`);
    values.push(`%${query.search}%`);
    index += 1;
  }

  if (typeof query.active === 'boolean') {
    whereParts.push(`u.is_active = $${index}`);
    values.push(query.active);
    index += 1;
  }

  const whereClause = `where ${whereParts.join(' and ')}`;
  const offset = (query.page - 1) * query.pageSize;

  const [usersResult, totalResult] = await Promise.all([
    db.$client.query(
      `
        select
          u.id,
          u.account_id,
          u.unit_id,
          u.email,
          u.username,
          u.full_name,
          u.is_active,
          u.must_change_password,
          u.failed_login_attempts,
          u.locked_until,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          coalesce(
            json_agg(
              distinct jsonb_build_object('id', r.id, 'name', r.name)
            ) filter (where r.id is not null),
            '[]'::json
          ) as roles
        from users u
        left join user_roles ur on ur.user_id = u.id
        left join roles r on r.id = ur.role_id
        ${whereClause}
        group by u.id
        order by u.full_name asc
        limit $${index} offset $${index + 1}
      `,
      [...values, query.pageSize, offset]
    ),
    db.$client.query(
      `select count(*)::int as total from users u ${whereClause}`,
      values
    )
  ]);

  return {
    data: usersResult.rows,
    total: Number(totalResult.rows[0]?.total ?? 0),
    page: query.page,
    pageSize: query.pageSize
  };
}

export async function getAdminUserById(
  db: DbLike,
  actor: ActorLike,
  userId: string
): Promise<unknown | null> {
  const result = await db.$client.query(
    `
      select
        u.id,
        u.account_id,
        u.unit_id,
        u.email,
        u.username,
        u.full_name,
        u.is_active,
        u.must_change_password,
        u.failed_login_attempts,
        u.locked_until,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        coalesce(
          json_agg(
            distinct jsonb_build_object('id', r.id, 'name', r.name)
          ) filter (where r.id is not null),
          '[]'::json
        ) as roles,
        coalesce(
          json_agg(
            distinct jsonb_build_object(
              'id', s.id,
              'scopeType', s.scope_type,
              'scopeKey', s.scope_key,
              'name', s.name,
              'expiresAt', usa.expires_at
            )
          ) filter (where s.id is not null),
          '[]'::json
        ) as scopes
      from users u
      left join user_roles ur on ur.user_id = u.id
      left join roles r on r.id = ur.role_id
      left join user_scope_assignments usa on usa.user_id = u.id
      left join access_scopes s on s.id = usa.scope_id
      where u.account_id = $1
        and u.id = $2
      group by u.id
      limit 1
    `,
    [actor.accountId, userId]
  );

  return result.rows[0] ?? null;
}

export async function createAdminUser(
  db: DbLike,
  actor: ActorLike,
  input: {
    email: string;
    username?: string;
    fullName: string;
    unitId?: string;
    passwordHash: string;
    mustChangePassword: boolean;
    roleIds: string[];
  },
  audit: AuditMeta = {}
): Promise<{ id: string }> {
  const userResult = await db.$client.query(
    `
      insert into users (
        account_id,
        unit_id,
        email,
        username,
        password_hash,
        full_name,
        must_change_password,
        password_changed_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, now())
      returning id
    `,
    [
      actor.accountId,
      input.unitId ?? null,
      input.email,
      input.username ?? null,
      input.passwordHash,
      input.fullName,
      input.mustChangePassword
    ]
  );

  const userId = String(userResult.rows[0]?.id);

  for (const roleId of input.roleIds) {
    await db.$client.query(
      `
        insert into user_roles (user_id, role_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [userId, roleId]
    );
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-users-create-${userId}`,
    action: 'user.created',
    entityType: 'user',
    entityId: userId,
    afterJson: {
      email: input.email,
      username: input.username ?? null,
      fullName: input.fullName,
      unitId: input.unitId ?? null,
      roleIds: input.roleIds
    },
    reason: 'admin_create_user'
  });

  return { id: userId };
}

export async function updateAdminUser(
  db: DbLike,
  actor: ActorLike,
  userId: string,
  input: {
    email?: string;
    username?: string | null;
    fullName?: string;
    unitId?: string | null;
    isActive?: boolean;
    mustChangePassword?: boolean;
  },
  audit: AuditMeta = {}
): Promise<boolean> {
  if (input.isActive === false) {
    assertCanMutatePrivilegedTarget(actor, userId);
  }

  const updates: string[] = [];
  const values: unknown[] = [actor.accountId, userId];
  let index = 3;

  const pushUpdate = (column: string, value: unknown) => {
    updates.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  };

  if (input.email !== undefined) pushUpdate('email', input.email);
  if (input.username !== undefined) pushUpdate('username', input.username);
  if (input.fullName !== undefined) pushUpdate('full_name', input.fullName);
  if (input.unitId !== undefined) pushUpdate('unit_id', input.unitId);
  if (input.isActive !== undefined) pushUpdate('is_active', input.isActive);
  if (input.mustChangePassword !== undefined) pushUpdate('must_change_password', input.mustChangePassword);

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
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-users-update-${userId}`,
    action: input.isActive === false ? 'user.disabled' : 'user.updated',
    entityType: 'user',
    entityId: userId,
    afterJson: input,
    reason: 'admin_update_user'
  });

  return true;
}

export async function resetAdminUserPassword(
  db: DbLike,
  actor: ActorLike,
  userId: string,
  input: { passwordHash: string; mustChangePassword: boolean },
  audit: AuditMeta = {}
): Promise<boolean> {
  assertCanMutatePrivilegedTarget(actor, userId);

  const result = await db.$client.query(
    `
      update users
      set
        password_hash = $3,
        must_change_password = $4,
        password_changed_at = now(),
        failed_login_attempts = 0,
        locked_until = null,
        updated_at = now()
      where account_id = $1
        and id = $2
      returning id
    `,
    [actor.accountId, userId, input.passwordHash, input.mustChangePassword]
  );

  if (result.rows.length === 0) {
    return false;
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-users-reset-password-${userId}`,
    action: 'user.password.reset',
    entityType: 'user',
    entityId: userId,
    reason: 'admin_password_reset'
  });

  return true;
}

export async function replaceAdminUserRoles(
  db: DbLike,
  actor: ActorLike,
  userId: string,
  roleIds: string[],
  audit: AuditMeta = {}
): Promise<boolean> {
  assertCanMutatePrivilegedTarget(actor, userId);

  await db.$client.query(
    `delete from user_roles where user_id = $1`,
    [userId]
  );

  for (const roleId of roleIds) {
    await db.$client.query(
      `
        insert into user_roles (user_id, role_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [userId, roleId]
    );
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-users-roles-${userId}`,
    action: 'user.roles.updated',
    entityType: 'user',
    entityId: userId,
    afterJson: { roleIds },
    reason: 'admin_replace_user_roles'
  });

  return true;
}

export async function listAdminRoles(
  db: DbLike,
  actor: ActorLike
): Promise<unknown[]> {
  const result = await db.$client.query(
    `
      select
        r.id,
        r.name,
        r.description,
        r.created_at,
        count(distinct ur.user_id)::int as users_count,
        count(distinct rp.permission_id)::int as permissions_count
      from roles r
      left join user_roles ur on ur.role_id = r.id
      left join role_permissions rp on rp.role_id = r.id
      group by r.id
      order by r.name asc
    `
  );

  return result.rows;
}

export async function getAdminRoleById(
  db: DbLike,
  roleId: string
): Promise<unknown | null> {
  const result = await db.$client.query(
    `
      select
        r.id,
        r.name,
        r.description,
        r.created_at,
        coalesce(
          json_agg(
            distinct jsonb_build_object('id', p.id, 'key', p.key, 'description', p.description)
          ) filter (where p.id is not null),
          '[]'::json
        ) as permissions
      from roles r
      left join role_permissions rp on rp.role_id = r.id
      left join permissions p on p.id = rp.permission_id
      where r.id = $1
      group by r.id
      limit 1
    `,
    [roleId]
  );

  return result.rows[0] ?? null;
}

export async function createAdminRole(
  db: DbLike,
  actor: ActorLike,
  input: { name: string; description?: string | null },
  audit: AuditMeta = {}
): Promise<{ id: string }> {
  const result = await db.$client.query(
    `
      insert into roles (name, description)
      values ($1, $2)
      returning id
    `,
    [input.name, input.description ?? null]
  );

  const roleId = String(result.rows[0]?.id);

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-roles-create-${roleId}`,
    action: 'role.created',
    entityType: 'role',
    entityId: roleId,
    afterJson: input,
    reason: 'admin_create_role'
  });

  return { id: roleId };
}

export async function updateAdminRole(
  db: DbLike,
  actor: ActorLike,
  roleId: string,
  input: { name?: string; description?: string | null },
  audit: AuditMeta = {}
): Promise<boolean> {
  const currentRole = await db.$client.query(
    `select id, name from roles where id = $1 limit 1`,
    [roleId]
  );

  const roleName = currentRole.rows[0]?.name ? String(currentRole.rows[0].name) : null;
  if (!roleName) {
    return false;
  }

  assertCanMutateRoleDefinition(actor, [roleName]);

  const updates: string[] = [];
  const values: unknown[] = [roleId];
  let index = 2;

  if (input.name !== undefined) {
    updates.push(`name = $${index++}`);
    values.push(input.name);
  }

  if (input.description !== undefined) {
    updates.push(`description = $${index++}`);
    values.push(input.description);
  }

  if (updates.length === 0) {
    return false;
  }

  const result = await db.$client.query(
    `
      update roles
      set ${updates.join(', ')}
      where id = $1
      returning id
    `,
    values
  );

  if (result.rows.length === 0) {
    return false;
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-roles-update-${roleId}`,
    action: 'role.updated',
    entityType: 'role',
    entityId: roleId,
    afterJson: input,
    reason: 'admin_update_role'
  });

  return true;
}

export async function listAdminPermissions(
  db: DbLike
): Promise<unknown[]> {
  const result = await db.$client.query(
    `
      select id, key, description, created_at
      from permissions
      order by key asc
    `,
    []
  );

  return result.rows;
}

export async function replaceRolePermissions(
  db: DbLike,
  actor: ActorLike,
  roleId: string,
  permissionIds: string[],
  audit: AuditMeta = {}
): Promise<boolean> {
  const currentRole = await db.$client.query(
    `select id, name from roles where id = $1 limit 1`,
    [roleId]
  );

  const roleName = currentRole.rows[0]?.name ? String(currentRole.rows[0].name) : null;
  if (!roleName) {
    return false;
  }

  assertCanMutateRoleDefinition(actor, [roleName]);

  await db.$client.query(`delete from role_permissions where role_id = $1`, [roleId]);

  for (const permissionId of permissionIds) {
    await db.$client.query(
      `
        insert into role_permissions (role_id, permission_id)
        values ($1, $2)
        on conflict do nothing
      `,
      [roleId, permissionId]
    );
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-roles-permissions-${roleId}`,
    action: 'role.permissions.updated',
    entityType: 'role',
    entityId: roleId,
    afterJson: { permissionIds },
    reason: 'admin_replace_role_permissions'
  });

  return true;
}

export async function listUserSessions(
  db: DbLike,
  actor: ActorLike,
  userId: string
): Promise<unknown[]> {
  const result = await db.$client.query(
    `
      select
        id,
        account_id,
        user_id,
        unit_id,
        auth_method,
        ip_address,
        user_agent,
        issued_at,
        expires_at,
        last_seen_at,
        revoked_at,
        revoked_reason
      from auth_sessions
      where account_id = $1
        and user_id = $2
      order by issued_at desc
    `,
    [actor.accountId, userId]
  );

  return result.rows;
}

export async function revokeSessionById(
  db: DbLike,
  actor: ActorLike,
  sessionId: string,
  audit: AuditMeta = {}
): Promise<boolean> {
  const result = await db.$client.query(
    `
      update auth_sessions
      set revoked_at = now(),
          revoked_reason = 'admin_revoke',
          updated_at = now()
      where id = $1
        and account_id = $2
        and revoked_at is null
      returning id, user_id
    `,
    [sessionId, actor.accountId]
  );

  if (result.rows.length === 0) {
    return false;
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-sessions-revoke-${sessionId}`,
    action: 'session.revoked',
    entityType: 'session',
    entityId: sessionId,
    afterJson: { userId: result.rows[0]?.user_id ?? null },
    reason: 'admin_revoke_session'
  });

  return true;
}

export async function listAdminScopes(
  db: DbLike,
  actor: ActorLike
): Promise<unknown[]> {
  const result = await db.$client.query(
    `
      select
        s.id,
        s.account_id,
        s.scope_type as "scopeType",
        s.scope_key as "scopeKey",
        s.name,
        s.description,
        s.is_active,
        s.created_at,
        s.updated_at,
        count(distinct usa.user_id)::int as users_count
      from access_scopes s
      left join user_scope_assignments usa on usa.scope_id = s.id
      where s.account_id = $1
      group by s.id
      order by s.scope_type asc, s.name asc
    `,
    [actor.accountId]
  );

  return result.rows;
}

export async function createAdminScope(
  db: DbLike,
  actor: ActorLike,
  input: {
    scopeType: string;
    scopeKey: string;
    name: string;
    description?: string | null;
    isActive: boolean;
  },
  audit: AuditMeta = {}
): Promise<{ id: string }> {
  const result = await db.$client.query(
    `
      insert into access_scopes (
        account_id,
        scope_type,
        scope_key,
        name,
        description,
        is_active
      )
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [actor.accountId, input.scopeType, input.scopeKey, input.name, input.description ?? null, input.isActive]
  );

  const scopeId = String(result.rows[0]?.id);

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-scopes-create-${scopeId}`,
    action: 'access_scope.created',
    entityType: 'access_scope',
    entityId: scopeId,
    afterJson: input,
    reason: 'admin_create_scope'
  });

  return { id: scopeId };
}

export async function replaceAdminUserScopes(
  db: DbLike,
  actor: ActorLike,
  userId: string,
  scopeIds: string[],
  input: { expiresAt?: string | null } = {},
  audit: AuditMeta = {}
): Promise<boolean> {
  assertCanMutatePrivilegedTarget(actor, userId);

  await db.$client.query(`delete from user_scope_assignments where user_id = $1`, [userId]);

  for (const scopeId of scopeIds) {
    await db.$client.query(
      `
        insert into user_scope_assignments (user_id, scope_id, granted_by_user_id, expires_at)
        values ($1, $2, $3, $4)
        on conflict (user_id, scope_id) do update
        set granted_by_user_id = excluded.granted_by_user_id,
            expires_at = excluded.expires_at
      `,
      [userId, scopeId, actor.userId ?? null, input.expiresAt ?? null]
    );
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles,
    requestId: audit.requestId ?? `admin-users-scopes-${userId}`,
    action: 'user.scopes.updated',
    entityType: 'user',
    entityId: userId,
    afterJson: {
      scopeIds,
      expiresAt: input.expiresAt ?? null
    },
    reason: 'admin_replace_user_scopes'
  });

  return true;
}
