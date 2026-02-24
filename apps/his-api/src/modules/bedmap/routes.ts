import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createBedMapService } from './service.js';

const bedMapQuerySchema = z.object({
  wardId: z.string().uuid()
});

export const bedMapRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/map',
    {
      preHandler: requirePermission('bedmap.read')
    },
    async (request, reply) => {
      const query = bedMapQuerySchema.parse(request.query);
      const service = createBedMapService({ db: app.db, requestContext: request.requestContext });
      const result = await service.getByWardId(query.wardId);

      if (result.kind === 'ward_not_found') {
        return reply.status(404).send({ message: 'Ward not found' });
      }

      return reply.send(result.map);
    }
  );
};
