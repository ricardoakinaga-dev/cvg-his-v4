import type { FastifyPluginAsync } from 'fastify';

import { CANONICAL_PERMISSIONS, ROLE_PERMISSIONS } from '@cvg-his/rbac';

import { requirePermission } from '../../middlewares/requirePermission.js';

export const rbacRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/test',
    {
      preHandler: requirePermission('system.admin.test')
    },
    async (request) => ({
      ok: true,
      permission: 'system.admin.test',
      requestId: request.requestContext.requestId
    })
  );

  app.get(
    '/audit/test',
    {
      preHandler: requirePermission('audit.read')
    },
    async (request) => ({
      ok: true,
      permission: 'audit.read',
      requestId: request.requestContext.requestId
    })
  );

  app.get(
    '/rbac/catalog',
    {
      preHandler: requirePermission('rbac.manage')
    },
    async () => ({
      permissions: CANONICAL_PERMISSIONS,
      rolePermissions: ROLE_PERMISSIONS
    })
  );
};
