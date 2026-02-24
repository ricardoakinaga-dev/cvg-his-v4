import { and, count, eq, inArray, desc, sql } from 'drizzle-orm';
import { auditEvents, permissions, rolePermissions, roles, units, userRoles, users } from '@cvg-his/db';
// ============================================
// User Repository
// ============================================
export async function findUsers(db, accountId, options) {
    const { q, page, pageSize, includeInactive } = options;
    const offset = (page - 1) * pageSize;
    const conditions = [eq(users.accountId, accountId)];
    if (!includeInactive) {
        conditions.push(eq(users.isActive, true));
    }
    if (q) {
        conditions.push(sql `(${users.email} ilike ${`%${q}%`} or ${users.fullName} ilike ${`%${q}%`})`);
    }
    const whereClause = and(...conditions);
    const [totalResult] = await db
        .select({ count: count() })
        .from(users)
        .where(whereClause);
    const rows = await db
        .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        unitId: users.unitId,
        unitName: units.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
    })
        .from(users)
        .leftJoin(units, eq(users.unitId, units.id))
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset(offset);
    // Fetch roles for each user
    const userIds = rows.map((r) => r.id);
    const userRolesList = userIds.length > 0
        ? await db
            .select({ userId: userRoles.userId, roleId: userRoles.roleId, roleName: roles.name })
            .from(userRoles)
            .innerJoin(roles, eq(userRoles.roleId, roles.id))
            .where(inArray(userRoles.userId, userIds))
        : [];
    const rolesByUser = new Map();
    for (const ur of userRolesList) {
        const list = rolesByUser.get(ur.userId) ?? [];
        list.push({ id: ur.roleId, name: ur.roleName });
        rolesByUser.set(ur.userId, list);
    }
    const data = rows.map((row) => ({
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        isActive: row.isActive,
        unitId: row.unitId,
        unitName: row.unitName,
        roles: rolesByUser.get(row.id) ?? [],
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
    }));
    return { data, total: totalResult.count };
}
export async function findUserById(db, accountId, userId) {
    const [row] = await db
        .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        isActive: users.isActive,
        unitId: users.unitId,
        unitName: units.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt
    })
        .from(users)
        .leftJoin(units, eq(users.unitId, units.id))
        .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
        .limit(1);
    if (!row) {
        return null;
    }
    const userRolesList = await db
        .select({ roleId: userRoles.roleId, roleName: roles.name })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, row.id));
    return {
        id: row.id,
        email: row.email,
        fullName: row.fullName,
        isActive: row.isActive,
        unitId: row.unitId,
        unitName: row.unitName,
        roles: userRolesList.map((r) => ({ id: r.roleId, name: r.roleName })),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString()
    };
}
export async function createUser(db, accountId, data) {
    const [user] = await db
        .insert(users)
        .values({
        accountId,
        email: data.email,
        fullName: data.fullName,
        passwordHash: data.passwordHash,
        unitId: data.unitId ?? null
    })
        .returning();
    return {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
        unitId: user.unitId,
        unitName: null,
        roles: [],
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
    };
}
export async function updateUser(db, accountId, userId, data) {
    const [user] = await db
        .update(users)
        .set({
        fullName: data.fullName,
        unitId: data.unitId,
        updatedAt: new Date()
    })
        .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
        .returning();
    if (!user) {
        return null;
    }
    return findUserById(db, accountId, userId);
}
export async function setUserActiveStatus(db, accountId, userId, isActive) {
    const [user] = await db
        .update(users)
        .set({
        isActive,
        updatedAt: new Date()
    })
        .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
        .returning();
    if (!user) {
        return null;
    }
    return findUserById(db, accountId, userId);
}
export async function replaceUserRoles(db, accountId, userId, roleIds) {
    // Verify user belongs to account
    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.id, userId), eq(users.accountId, accountId)))
        .limit(1);
    if (!user) {
        throw new Error('User not found');
    }
    // Delete existing roles
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    // Insert new roles
    if (roleIds.length > 0) {
        await db.insert(userRoles).values(roleIds.map((roleId) => ({
            userId,
            roleId
        })));
    }
}
// ============================================
// Role Repository
// ============================================
export async function findRoles(db, options) {
    const { page, pageSize } = options;
    const offset = (page - 1) * pageSize;
    const [totalResult] = await db.select({ count: count() }).from(roles);
    const rows = await db
        .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        createdAt: roles.createdAt
    })
        .from(roles)
        .orderBy(roles.name)
        .limit(pageSize)
        .offset(offset);
    // Fetch permissions for each role
    const roleIds = rows.map((r) => r.id);
    const rolePermsList = roleIds.length > 0
        ? await db
            .select({ roleId: rolePermissions.roleId, permissionId: permissions.id, permissionKey: permissions.key })
            .from(rolePermissions)
            .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
            .where(inArray(rolePermissions.roleId, roleIds))
        : [];
    const permsByRole = new Map();
    for (const rp of rolePermsList) {
        const list = permsByRole.get(rp.roleId) ?? [];
        list.push({ id: rp.permissionId, key: rp.permissionKey });
        permsByRole.set(rp.roleId, list);
    }
    const data = rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        permissions: permsByRole.get(row.id) ?? [],
        createdAt: row.createdAt.toISOString()
    }));
    return { data, total: totalResult.count };
}
export async function findRoleById(db, roleId) {
    const [row] = await db
        .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        createdAt: roles.createdAt
    })
        .from(roles)
        .where(eq(roles.id, roleId))
        .limit(1);
    if (!row) {
        return null;
    }
    const rolePermsList = await db
        .select({ permissionId: permissions.id, permissionKey: permissions.key })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, row.id));
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        permissions: rolePermsList.map((p) => ({ id: p.permissionId, key: p.permissionKey })),
        createdAt: row.createdAt.toISOString()
    };
}
export async function createRole(db, data) {
    const [role] = await db
        .insert(roles)
        .values({
        name: data.name,
        description: data.description ?? null
    })
        .returning();
    return {
        id: role.id,
        name: role.name,
        description: role.description,
        permissions: [],
        createdAt: role.createdAt.toISOString()
    };
}
export async function updateRole(db, roleId, data) {
    const [role] = await db
        .update(roles)
        .set({
        name: data.name,
        description: data.description
    })
        .where(eq(roles.id, roleId))
        .returning();
    if (!role) {
        return null;
    }
    return findRoleById(db, roleId);
}
export async function deleteRole(db, roleId) {
    const result = await db.delete(roles).where(eq(roles.id, roleId));
    return (result.rowCount ?? 0) > 0;
}
export async function replaceRolePermissions(db, roleId, permissionIds) {
    // Delete existing permissions
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    // Insert new permissions
    if (permissionIds.length > 0) {
        await db.insert(rolePermissions).values(permissionIds.map((permissionId) => ({
            roleId,
            permissionId
        })));
    }
}
export async function isRoleInUse(db, roleId) {
    const [result] = await db
        .select({ count: count() })
        .from(userRoles)
        .where(eq(userRoles.roleId, roleId));
    return result.count > 0;
}
// ============================================
// Permission Repository
// ============================================
export async function findAllPermissions(db) {
    const rows = await db
        .select({
        id: permissions.id,
        key: permissions.key,
        description: permissions.description,
        createdAt: permissions.createdAt
    })
        .from(permissions)
        .orderBy(permissions.key);
    return rows.map((row) => ({
        id: row.id,
        key: row.key,
        description: row.description,
        createdAt: row.createdAt.toISOString()
    }));
}
// ============================================
// Audit Repository
// ============================================
export async function findAuditEvents(db, accountId, options) {
    const { actorId, entityType, action, startDate, endDate, page, pageSize } = options;
    const offset = (page - 1) * pageSize;
    const conditions = [eq(auditEvents.accountId, accountId)];
    if (actorId) {
        conditions.push(eq(auditEvents.actorUserId, actorId));
    }
    if (entityType) {
        conditions.push(eq(auditEvents.entityType, entityType));
    }
    if (action) {
        conditions.push(eq(auditEvents.action, action));
    }
    if (startDate) {
        conditions.push(sql `${auditEvents.createdAt} >= ${startDate}::timestamptz`);
    }
    if (endDate) {
        conditions.push(sql `${auditEvents.createdAt} <= ${endDate}::timestamptz`);
    }
    const whereClause = and(...conditions);
    const [totalResult] = await db
        .select({ count: count() })
        .from(auditEvents)
        .where(whereClause);
    const rows = await db
        .select({
        id: auditEvents.id,
        createdAt: auditEvents.createdAt,
        actorUserId: auditEvents.actorUserId,
        actorRoles: auditEvents.actorRoles,
        action: auditEvents.action,
        entityType: auditEvents.entityType,
        entityId: auditEvents.entityId,
        beforeJson: auditEvents.beforeJson,
        afterJson: auditEvents.afterJson,
        reason: auditEvents.reason,
        requestId: auditEvents.requestId
    })
        .from(auditEvents)
        .where(whereClause)
        .orderBy(desc(auditEvents.createdAt))
        .limit(pageSize)
        .offset(offset);
    const data = rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        actorUserId: row.actorUserId,
        actorRoles: row.actorRoles ?? [],
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        beforeJson: row.beforeJson,
        afterJson: row.afterJson,
        reason: row.reason,
        requestId: row.requestId
    }));
    return { data, total: totalResult.count };
}
//# sourceMappingURL=repo.js.map