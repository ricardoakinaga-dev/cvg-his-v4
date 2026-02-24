import type { FastifyPluginAsync } from 'fastify';
import { parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProtocolReferencesQdrantAdapter } from './qdrant.js';
import { createProtocolReferencesService } from './service.js';

const protocolIdParamSchema = z.object({
  id: z.string().uuid()
});

const referenceIdParamSchema = z.object({
  id: z.string().uuid(),
  refId: z.string().uuid()
});

const protocolReferenceTypeSchema = z.enum(['qdrant_chunk', 'url', 'pdf', 'doi', 'book']);

const optionalTrimmedString = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().min(1).optional());

const createReferenceBodySchema = z.object({
  ref_type: protocolReferenceTypeSchema,
  title: optionalTrimmedString,
  url: optionalTrimmedString,
  source_id: optionalTrimmedString,
  score: z.coerce.number().finite().optional(),
  metadata_json: z.record(z.unknown()).optional()
});

const suggestQuerySchema = z.object({
  q: z.string().trim().min(3, 'q must have at least 3 characters'),
  limit: z.coerce.number().int().positive().max(20).default(8)
});

export const protocolReferencesRoutes: FastifyPluginAsync = async (app) => {
  const suggestAdapter = app.env.QDRANT_URL
    ? createProtocolReferencesQdrantAdapter({
        baseUrl: app.env.QDRANT_URL,
        collectionName: app.env.QDRANT_COLLECTION,
        apiKey: app.env.QDRANT_API_KEY
      })
    : null;

  app.get(
    '/:id/references',
    {
      preHandler: requirePermission('protocol.ref.read')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const service = createProtocolReferencesService(
        { db: app.db, requestContext: request.requestContext },
        { suggestAdapter }
      );
      const result = await service.list(params.id);

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      return reply.send(result.references);
    }
  );

  app.get(
    '/:id/references/suggest',
    {
      preHandler: requirePermission('protocol.ref.read')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const query = suggestQuerySchema.parse(request.query);
      const service = createProtocolReferencesService(
        { db: app.db, requestContext: request.requestContext },
        { suggestAdapter }
      );
      const result = await service.suggest(params.id, query);

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      if (result.kind === 'qdrant_unavailable') {
        return reply.status(503).send({ message: result.message });
      }

      return reply.send(result.hits);
    }
  );

  app.post(
    '/:id/references',
    {
      preHandler: requirePermission('protocol.ref.write')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const body = parseOrThrow422(createReferenceBodySchema, request.body);
      const service = createProtocolReferencesService(
        { db: app.db, requestContext: request.requestContext },
        { suggestAdapter }
      );
      const result = await service.add(params.id, {
        refType: body.ref_type,
        title: body.title,
        url: body.url,
        sourceId: body.source_id,
        score: body.score,
        metadataJson: body.metadata_json
      });

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      return reply.status(201).send(result.reference);
    }
  );

  app.delete(
    '/:id/references/:refId',
    {
      preHandler: requirePermission('protocol.ref.write')
    },
    async (request, reply) => {
      const params = referenceIdParamSchema.parse(request.params);
      const service = createProtocolReferencesService(
        { db: app.db, requestContext: request.requestContext },
        { suggestAdapter }
      );
      const result = await service.remove(params.id, params.refId);

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      if (result.kind === 'reference_not_found') {
        return reply.status(404).send({ message: 'Protocol reference not found' });
      }

      return reply.send(result.reference);
    }
  );
};
