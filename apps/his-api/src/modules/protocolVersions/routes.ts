import type { FastifyPluginAsync } from 'fastify';
import { ProtocolContentSchema, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProtocolVersionsService } from './service.js';

const protocolIdParamSchema = z.object({
  id: z.string().uuid()
});

const versionIdParamSchema = z.object({
  versionId: z.string().uuid()
});

const listVersionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

const editVersionBodySchema = z.object({
  content_json: ProtocolContentSchema,
  change_reason: z
    .string()
    .trim()
    .min(1)
    .max(400)
    .optional()
});

export const protocolVersionsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/protocols/:id/versions',
    {
      preHandler: requirePermission('protocol.write')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const service = createProtocolVersionsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.createDraft(params.id);

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      return reply.status(201).send(result.version);
    }
  );

  app.get(
    '/protocols/:id/versions',
    {
      preHandler: requirePermission('protocol.read')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const query = listVersionsQuerySchema.parse(request.query);
      const service = createProtocolVersionsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.listByProtocol(params.id, query);

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      return reply.send(result.versions);
    }
  );

  app.get(
    '/protocol-versions/:versionId',
    {
      preHandler: requirePermission('protocol.read')
    },
    async (request, reply) => {
      const params = versionIdParamSchema.parse(request.params);
      const service = createProtocolVersionsService({ db: app.db, requestContext: request.requestContext });
      const version = await service.getById(params.versionId);

      if (!version) {
        return reply.status(404).send({ message: 'Protocol version not found' });
      }

      return reply.send(version);
    }
  );

  app.patch(
    '/protocol-versions/:versionId',
    {
      preHandler: requirePermission('protocol.write')
    },
    async (request, reply) => {
      const params = versionIdParamSchema.parse(request.params);
      const body = parseOrThrow422(editVersionBodySchema, request.body);
      const service = createProtocolVersionsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.editDraft(params.versionId, {
        contentJson: body.content_json,
        changeReason: body.change_reason
      });

      if (result.kind === 'version_not_found') {
        return reply.status(404).send({ message: 'Protocol version not found' });
      }

      if (result.kind === 'version_not_editable') {
        return reply.status(409).send({
          message: 'Only draft protocol versions can be edited',
          version: result.version
        });
      }

      if (result.kind === 'change_reason_required') {
        return reply.status(422).send({
          message: 'change_reason is required for critical content changes'
        });
      }

      return reply.send(result.version);
    }
  );
};
