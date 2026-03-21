import type { FastifyPluginAsync } from 'fastify';
import { randomBytes, scrypt } from 'node:crypto';
import { promisify } from 'node:util';

import { requirePermission } from '../../middlewares/requirePermission.js';
import {
  createScopeBodySchema,
  createRoleBodySchema,
  createUserBodySchema,
  listUsersQuerySchema,
  replaceUserScopesBodySchema,
  replaceRolePermissionsBodySchema,
  replaceUserRolesBodySchema,
  resetPasswordBodySchema,
  roleIdParamSchema,
  sessionIdParamSchema,
  updateRoleBodySchema,
  updateUserBodySchema,
  userIdParamSchema
} from './schemas.js';
import {
  createAdminScope,
  createAdminRole,
  createAdminUser,
  getAdminRoleById,
  getAdminUserById,
  listAdminPermissions,
  listAdminRoles,
  listAdminScopes,
  listAdminUsers,
  listUserSessions,
  replaceAdminUserScopes,
  replaceAdminUserRoles,
  replaceRolePermissions,
  resetAdminUserPassword,
  revokeSessionById,
  updateAdminRole,
  updateAdminUser
} from './service.js';

const scryptAsync = promisify(scrypt);

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

function requireActor(request: { requestContext: { actor?: { accountId?: string; userId?: string; roles?: string[] } } }) {
  const actor = request.requestContext.actor;
  if (!actor?.accountId) {
    const error = new Error('Actor context required.');
    (error as Error & { statusCode?: number }).statusCode = 401;
    throw error;
  }

  return {
    accountId: actor.accountId,
    userId: actor.userId,
    roles: actor.roles ?? []
  };
}

export const adminIamRoutes: FastifyPluginAsync = async (app) => {
  app.get('/admin/iam/users', { preHandler: requirePermission('users.read') }, async (request) => {
    const actor = requireActor(request);
    const query = listUsersQuerySchema.parse(request.query);
    return listAdminUsers(app.db, actor, query);
  });

  app.post('/admin/iam/users', { preHandler: requirePermission('users.create') }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createUserBodySchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);
    const created = await createAdminUser(app.db, actor, {
      email: body.email,
      username: body.username,
      fullName: body.fullName,
      unitId: body.unitId,
      passwordHash,
      mustChangePassword: body.mustChangePassword,
      roleIds: body.roleIds
    }, { requestId: request.requestContext.requestId });
    return reply.status(201).send(created);
  });

  app.get('/admin/iam/users/:id', { preHandler: requirePermission('users.read') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = userIdParamSchema.parse(request.params);
    const user = await getAdminUserById(app.db, actor, params.id);
    if (!user) {
      return reply.status(404).send({ message: 'User not found' });
    }
    return user;
  });

  app.patch('/admin/iam/users/:id', { preHandler: requirePermission('users.update') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = userIdParamSchema.parse(request.params);
    const body = updateUserBodySchema.parse(request.body);
    const updated = await updateAdminUser(app.db, actor, params.id, body, {
      requestId: request.requestContext.requestId
    });
    if (!updated) {
      return reply.status(404).send({ message: 'User not found or no changes' });
    }
    return { ok: true };
  });

  app.post('/admin/iam/users/:id/reset-password', { preHandler: requirePermission('users.update') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = userIdParamSchema.parse(request.params);
    const body = resetPasswordBodySchema.parse(request.body);
    const passwordHash = await hashPassword(body.password);
    const updated = await resetAdminUserPassword(app.db, actor, params.id, {
      passwordHash,
      mustChangePassword: body.mustChangePassword
    }, { requestId: request.requestContext.requestId });
    if (!updated) {
      return reply.status(404).send({ message: 'User not found' });
    }
    return { ok: true };
  });

  app.put('/admin/iam/users/:id/roles', { preHandler: requirePermission('users.update') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = userIdParamSchema.parse(request.params);
    const body = replaceUserRolesBodySchema.parse(request.body);
    const updated = await replaceAdminUserRoles(app.db, actor, params.id, body.roleIds, {
      requestId: request.requestContext.requestId
    });
    if (!updated) {
      return reply.status(404).send({ message: 'User not found' });
    }
    return { ok: true };
  });

  app.get('/admin/iam/users/:id/sessions', { preHandler: requirePermission('sessions.read') }, async (request) => {
    const actor = requireActor(request);
    const params = userIdParamSchema.parse(request.params);
    return {
      data: await listUserSessions(app.db, actor, params.id)
    };
  });

  app.put('/admin/iam/users/:id/scopes', { preHandler: requirePermission('access_scope.manage') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = userIdParamSchema.parse(request.params);
    const body = replaceUserScopesBodySchema.parse(request.body);
    const updated = await replaceAdminUserScopes(app.db, actor, params.id, body.scopeIds, {
      expiresAt: body.expiresAt
    }, {
      requestId: request.requestContext.requestId
    });
    if (!updated) {
      return reply.status(404).send({ message: 'User not found' });
    }
    return { ok: true };
  });

  app.get('/admin/iam/roles', { preHandler: requirePermission('roles.read') }, async (request) => {
    const actor = requireActor(request);
    return {
      data: await listAdminRoles(app.db, actor)
    };
  });

  app.post('/admin/iam/roles', { preHandler: requirePermission('roles.create') }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createRoleBodySchema.parse(request.body);
    const created = await createAdminRole(app.db, actor, body, {
      requestId: request.requestContext.requestId
    });
    return reply.status(201).send(created);
  });

  app.get('/admin/iam/roles/:id', { preHandler: requirePermission('roles.read') }, async (request, reply) => {
    const params = roleIdParamSchema.parse(request.params);
    const role = await getAdminRoleById(app.db, params.id);
    if (!role) {
      return reply.status(404).send({ message: 'Role not found' });
    }
    return role;
  });

  app.patch('/admin/iam/roles/:id', { preHandler: requirePermission('roles.update') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = roleIdParamSchema.parse(request.params);
    const body = updateRoleBodySchema.parse(request.body);
    const updated = await updateAdminRole(app.db, actor, params.id, body, {
      requestId: request.requestContext.requestId
    });
    if (!updated) {
      return reply.status(404).send({ message: 'Role not found or no changes' });
    }
    return { ok: true };
  });

  app.get('/admin/iam/permissions', { preHandler: requirePermission('permissions.read') }, async () => {
    return {
      data: await listAdminPermissions(app.db)
    };
  });

  app.get('/admin/iam/scopes', { preHandler: requirePermission('access_scope.read') }, async (request) => {
    const actor = requireActor(request);
    return {
      data: await listAdminScopes(app.db, actor)
    };
  });

  app.post('/admin/iam/scopes', { preHandler: requirePermission('access_scope.manage') }, async (request, reply) => {
    const actor = requireActor(request);
    const body = createScopeBodySchema.parse(request.body);
    const created = await createAdminScope(app.db, actor, body, {
      requestId: request.requestContext.requestId
    });
    return reply.status(201).send(created);
  });

  app.put('/admin/iam/roles/:id/permissions', { preHandler: requirePermission('permissions.manage') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = roleIdParamSchema.parse(request.params);
    const body = replaceRolePermissionsBodySchema.parse(request.body);
    const updated = await replaceRolePermissions(app.db, actor, params.id, body.permissionIds, {
      requestId: request.requestContext.requestId
    });
    if (!updated) {
      return reply.status(404).send({ message: 'Role not found' });
    }
    return { ok: true };
  });

  app.post('/admin/iam/sessions/:id/revoke', { preHandler: requirePermission('sessions.revoke') }, async (request, reply) => {
    const actor = requireActor(request);
    const params = sessionIdParamSchema.parse(request.params);
    const revoked = await revokeSessionById(app.db, actor, params.id, {
      requestId: request.requestContext.requestId
    });
    if (!revoked) {
      return reply.status(404).send({ message: 'Session not found or already revoked' });
    }
    return { ok: true };
  });
};
