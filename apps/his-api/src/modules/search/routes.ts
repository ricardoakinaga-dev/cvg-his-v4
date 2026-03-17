import type { FastifyPluginAsync } from 'fastify';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createSearchService } from './service.js';
import { searchQuerySchema } from './types.js';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/',
    {
      preHandler: requirePermission('search.read')
    },
    async (request) => {
      const query = searchQuerySchema.parse(request.query);
      const service = createSearchService({ db: app.db, requestContext: request.requestContext });
      return service.search(query);
    }
  );
};
