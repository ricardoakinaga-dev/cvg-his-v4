import type { FastifyPluginAsync } from 'fastify';
import { createHash } from 'node:crypto';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { auditFromRequest } from '../../hooks/auditHook.js';

import {
  listUsersQuerySchema,
  createUserSchema,
  updateUserSchema,
  disableUserSchema,
  listRolesQuerySchema,
  createRoleSchema,
  updateRoleSchema,
  updateRolePermissionsSchema,
  updateUserRolesSchema,
  listAuditQuerySchema,
  type PaginatedResponse,
  type UserResponse,
  type RoleResponse,
  type PermissionResponse,
  type AuditEventResponse
} from './types.js';

import {
  findUsers,
  findUserById,
  createUser,
  updateUser,
  setUserActiveStatus,
  replaceUserRoles,
  findRoles,
  findRoleById,
  createRole,
  updateRole,
  deleteRole,
  replaceRolePermissions,
  isRoleInUse,
  findAllPermissions,
  findAuditEvents
} from './repo.js';

function hashPassword(rawPassword: string): string {
  return createHash('sha256').update(rawPassword).digest('hex');
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  // ============================================
  // Users Management
  // ============================================

  // GET /admin/users - List users
  app.get<{ Querystring: typeof listUsersQuerySchema._type }>(
    '/admin/users',
    {
      preHandler: requirePermission('admin.usuarios.read'),
      schema: {
        querystring: listUsersQuerySchema
      }
    },
    async (request): Promise<PaginatedResponse<UserResponse>> => {
      const query = listUsersQuerySchema.parse(request.query);
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        return { page: query.page, pageSize: query.pageSize, total: 0, data: [] };
      }

      return findUsers(request.db, actor.accountId, {
        q: query.q,
        page: query.page,
        pageSize: query.pageSize,
        includeInactive: query.includeInactive
      });
    }
  );

  // POST /admin/users - Create user
  app.post<{ Body: typeof createUserSchema._type }>(
    '/admin/users',
    {
      preHandler: requirePermission('admin.usuarios.create'),
      schema: { body: createUserSchema }
    },
    async (request, reply): Promise<UserResponse> => {
      const body = createUserSchema.parse(request.body);
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        reply.code(401);
        throw new Error('Unauthorized');
      }

      const audit = auditFromRequest(request);
      const user = await createUser(request.db, actor.accountId, {
        email: body.email,
        fullName: body.fullName,
        passwordHash: hashPassword(body.password),
        unitId: body.unitId
      });

      // Assign roles if provided
      if (body.roleIds.length > 0) {
        await replaceUserRoles(request.db, actor.accountId, user.id, body.roleIds);
      }

      // Audit log
      await audit.append({
        action: 'admin.user.created',
        entityType: 'user',
        entityId: user.id,
        beforeJson: null,
        afterJson: {
          email: user.email,
          fullName: user.fullName,
          roleIds: body.roleIds
        }
      });

      const fullUser = await findUserById(request.db, actor.accountId, user.id);
      reply.code(201);
      return fullUser!;
    }
  );

  // GET /admin/users/:id - Get user by ID
  app.get<{ Params: { id: string } }>(
    '/admin/users/:id',
    {
      preHandler: requirePermission('admin.usuarios.read')
    },
    async (request, reply): Promise<UserResponse> => {
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        reply.code(401);
        throw new Error('Unauthorized');
      }

      const user = await findUserById(request.db, actor.accountId, request.params.id);

      if (!user) {
        reply.code(404);
        throw new Error('User not found');
      }

      return user;
    }
  );

  // PUT /admin/users/:id - Update user
  app.put<{ Params: { id: string }; Body: typeof updateUserSchema._type }>(
    '/admin/users/:id',
    {
      preHandler: requirePermission('admin.usuarios.update'),
      schema: { body: updateUserSchema }
    },
    async (request, reply): Promise<UserResponse> => {
      const body = updateUserSchema.parse(request.body);
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        reply.code(401);
        throw new Error('Unauthorized');
      }

      const before = await findUserById(request.db, actor.accountId, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('User not found');
      }

      const audit = auditFromRequest(request);

      if (body.fullName !== undefined || body.unitId !== undefined) {
        await updateUser(request.db, actor.accountId, request.params.id, {
          fullName: body.fullName,
          unitId: body.unitId
        });
      }

      if (body.roleIds !== undefined) {
        await replaceUserRoles(request.db, actor.accountId, request.params.id, body.roleIds);
      }

      const after = await findUserById(request.db, actor.accountId, request.params.id);

      await audit.append({
        action: 'admin.user.updated',
        entityType: 'user',
        entityId: request.params.id,
        beforeJson: {
          fullName: before.fullName,
          unitId: before.unitId,
          roleIds: before.roles.map((r) => r.id)
        },
        afterJson: {
          fullName: after?.fullName,
          unitId: after?.unitId,
          roleIds: after?.roles.map((r) => r.id)
        }
      });

      return after!;
    }
  );

  // POST /admin/users/:id/disable - Disable user
  app.post<{ Params: { id: string }; Body: typeof disableUserSchema._type }>(
    '/admin/users/:id/disable',
    {
      preHandler: requirePermission('admin.usuarios.disable'),
      schema: { body: disableUserSchema }
    },
    async (request, reply): Promise<UserResponse> => {
      const body = disableUserSchema.parse(request.body);
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        reply.code(401);
        throw new Error('Unauthorized');
      }

      const before = await findUserById(request.db, actor.accountId, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('User not found');
      }

      const audit = auditFromRequest(request);
      const after = await setUserActiveStatus(request.db, actor.accountId, request.params.id, false);

      await audit.append({
        action: 'admin.user.disabled',
        entityType: 'user',
        entityId: request.params.id,
        beforeJson: { isActive: true },
        afterJson: { isActive: false },
        reason: body.reason
      });

      return after!;
    }
  );

  // POST /admin/users/:id/enable - Enable user
  app.post<{ Params: { id: string } }>(
    '/admin/users/:id/enable',
    {
      preHandler: requirePermission('admin.usuarios.disable')
    },
    async (request, reply): Promise<UserResponse> => {
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        reply.code(401);
        throw new Error('Unauthorized');
      }

      const before = await findUserById(request.db, actor.accountId, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('User not found');
      }

      const audit = auditFromRequest(request);
      const after = await setUserActiveStatus(request.db, actor.accountId, request.params.id, true);

      await audit.append({
        action: 'admin.user.enabled',
        entityType: 'user',
        entityId: request.params.id,
        beforeJson: { isActive: false },
        afterJson: { isActive: true }
      });

      return after!;
    }
  );

  // PUT /admin/users/:id/roles - Replace user roles
  app.put<{ Params: { id: string }; Body: typeof updateUserRolesSchema._type }>(
    '/admin/users/:id/roles',
    {
      preHandler: requirePermission('admin.usuarios.manage'),
      schema: { body: updateUserRolesSchema }
    },
    async (request, reply): Promise<{ ok: boolean }> => {
      const body = updateUserRolesSchema.parse(request.body);
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        reply.code(401);
        throw new Error('Unauthorized');
      }

      const before = await findUserById(request.db, actor.accountId, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('User not found');
      }

      const audit = auditFromRequest(request);
      await replaceUserRoles(request.db, actor.accountId, request.params.id, body.roleIds);

      await audit.append({
        action: 'admin.user.roles_updated',
        entityType: 'user',
        entityId: request.params.id,
        beforeJson: { roleIds: before.roles.map((r) => r.id) },
        afterJson: { roleIds: body.roleIds }
      });

      return { ok: true };
    }
  );

  // ============================================
  // Roles Management
  // ============================================

  // GET /admin/roles - List roles
  app.get<{ Querystring: typeof listRolesQuerySchema._type }>(
    '/admin/roles',
    {
      preHandler: requirePermission('admin.roles.read'),
      schema: { querystring: listRolesQuerySchema }
    },
    async (): Promise<PaginatedResponse<RoleResponse>> => {
      const query = listRolesQuerySchema.parse({});
      return findRoles(request.db, { page: query.page, pageSize: query.pageSize });
    }
  );

  // POST /admin/roles - Create role
  app.post<{ Body: typeof createRoleSchema._type }>(
    '/admin/roles',
    {
      preHandler: requirePermission('admin.roles.create'),
      schema: { body: createRoleSchema }
    },
    async (request, reply): Promise<RoleResponse> => {
      const body = createRoleSchema.parse(request.body);
      const audit = auditFromRequest(request);

      const role = await createRole(request.db, {
        name: body.name,
        description: body.description
      });

      await audit.append({
        action: 'admin.role.created',
        entityType: 'role',
        entityId: role.id,
        beforeJson: null,
        afterJson: { name: role.name, description: role.description }
      });

      reply.code(201);
      return role;
    }
  );

  // GET /admin/roles/:id - Get role by ID
  app.get<{ Params: { id: string } }>(
    '/admin/roles/:id',
    {
      preHandler: requirePermission('admin.roles.read')
    },
    async (request, reply): Promise<RoleResponse> => {
      const role = await findRoleById(request.db, request.params.id);

      if (!role) {
        reply.code(404);
        throw new Error('Role not found');
      }

      return role;
    }
  );

  // PUT /admin/roles/:id - Update role
  app.put<{ Params: { id: string }; Body: typeof updateRoleSchema._type }>(
    '/admin/roles/:id',
    {
      preHandler: requirePermission('admin.roles.update'),
      schema: { body: updateRoleSchema }
    },
    async (request, reply): Promise<RoleResponse> => {
      const body = updateRoleSchema.parse(request.body);
      const audit = auditFromRequest(request);

      const before = await findRoleById(request.db, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('Role not found');
      }

      const after = await updateRole(request.db, request.params.id, {
        name: body.name,
        description: body.description
      });

      if (!after) {
        reply.code(404);
        throw new Error('Role not found');
      }

      await audit.append({
        action: 'admin.role.updated',
        entityType: 'role',
        entityId: request.params.id,
        beforeJson: { name: before.name, description: before.description },
        afterJson: { name: after.name, description: after.description }
      });

      return after;
    }
  );

  // DELETE /admin/roles/:id - Delete role
  app.delete<{ Params: { id: string } }>(
    '/admin/roles/:id',
    {
      preHandler: requirePermission('admin.roles.delete')
    },
    async (request, reply): Promise<{ ok: boolean }> => {
      const audit = auditFromRequest(request);

      const before = await findRoleById(request.db, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('Role not found');
      }

      // Check if role is in use
      const inUse = await isRoleInUse(request.db, request.params.id);
      if (inUse) {
        reply.code(400);
        throw new Error('Cannot delete role that is assigned to users');
      }

      await deleteRole(request.db, request.params.id);

      await audit.append({
        action: 'admin.role.deleted',
        entityType: 'role',
        entityId: request.params.id,
        beforeJson: { name: before.name, description: before.description },
        afterJson: null
      });

      return { ok: true };
    }
  );

  // PUT /admin/roles/:id/permissions - Replace role permissions
  app.put<{ Params: { id: string }; Body: typeof updateRolePermissionsSchema._type }>(
    '/admin/roles/:id/permissions',
    {
      preHandler: requirePermission('admin.permissoes.manage'),
      schema: { body: updateRolePermissionsSchema }
    },
    async (request, reply): Promise<{ ok: boolean }> => {
      const body = updateRolePermissionsSchema.parse(request.body);
      const audit = auditFromRequest(request);

      const before = await findRoleById(request.db, request.params.id);

      if (!before) {
        reply.code(404);
        throw new Error('Role not found');
      }

      await replaceRolePermissions(request.db, request.params.id, body.permissionIds);

      await audit.append({
        action: 'admin.role.permissions_updated',
        entityType: 'role',
        entityId: request.params.id,
        beforeJson: { permissionIds: before.permissions.map((p) => p.id) },
        afterJson: { permissionIds: body.permissionIds }
      });

      return { ok: true };
    }
  );

  // ============================================
  // Permissions
  // ============================================

  // GET /admin/permissions - List all permissions
  app.get(
    '/admin/permissions',
    {
      preHandler: requirePermission('admin.permissoes.read')
    },
    async (): Promise<PermissionResponse[]> => {
      return findAllPermissions(request.db);
    }
  );

  // ============================================
  // Audit
  // ============================================

  // GET /admin/audit - List audit events
  app.get<{ Querystring: typeof listAuditQuerySchema._type }>(
    '/admin/audit',
    {
      preHandler: requirePermission('admin.auditoria.read'),
      schema: { querystring: listAuditQuerySchema }
    },
    async (request): Promise<PaginatedResponse<AuditEventResponse>> => {
      const query = listAuditQuerySchema.parse(request.query);
      const actor = request.requestContext.actor;

      if (!actor?.accountId) {
        return { page: query.page, pageSize: query.pageSize, total: 0, data: [] };
      }

      return findAuditEvents(request.db, actor.accountId, {
        actorId: query.actorId,
        entityType: query.entityType,
        action: query.action,
        startDate: query.startDate,
        endDate: query.endDate,
        page: query.page,
        pageSize: query.pageSize
      });
    }
  );
};
