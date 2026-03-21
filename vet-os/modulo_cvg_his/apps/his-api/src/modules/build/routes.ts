import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';

/**
 * Build Routes - Exposes build information for traceability
 */
export const buildRoutes: FastifyPluginAsync = async (app) => {
  app.get('/build', { preHandler: requirePermission('build.read') }, async (_request, reply) => {
    const buildInfo = {
      buildId: process.env.BUILD_ID || process.env.GIT_SHA || 'dev',
      gitSha: process.env.GIT_SHA || 'unknown',
      buildTime: process.env.BUILD_TIME || 'unknown',
    };

    return reply.status(200).send(buildInfo);
  });
};
