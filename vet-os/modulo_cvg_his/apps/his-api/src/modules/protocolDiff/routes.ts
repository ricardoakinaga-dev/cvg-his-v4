import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProtocolDiffService } from './service.js';

const versionDiffParamsSchema = z.object({
  a: z.string().uuid(),
  b: z.string().uuid()
});

export const protocolDiffRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/protocol-versions/:a/diff/:b',
    {
      preHandler: requirePermission('protocol.diff.read')
    },
    async (request, reply) => {
      const params = versionDiffParamsSchema.parse(request.params);
      const service = createProtocolDiffService({ db: app.db, requestContext: request.requestContext });
      const result = await service.getVersionDiff(params.a, params.b);

      if (result.kind === 'from_not_found') {
        return reply.status(404).send({ message: 'From protocol version not found' });
      }

      if (result.kind === 'to_not_found') {
        return reply.status(404).send({ message: 'To protocol version not found' });
      }

      if (result.kind === 'different_protocols') {
        return reply.status(422).send({ message: 'Versions belong to different protocols' });
      }

      return reply.send(result.diff);
    }
  );
};
