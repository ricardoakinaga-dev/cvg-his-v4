import type { FastifyPluginAsync } from 'fastify';
import { DocumentCreateSchema, parseOrThrow422 } from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createDocumentsService } from './service.js';

const documentIdParamSchema = z.object({
  id: z.string().uuid()
});

const encounterIdParamSchema = z.object({
  id: z.string().uuid()
});

const attachDocumentBodySchema = z.object({
  documentId: z.string().uuid()
});

export const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/documents',
    {
      preHandler: requirePermission('document.write')
    },
    async (request, reply) => {
      const body = parseOrThrow422(DocumentCreateSchema, request.body);
      const service = createDocumentsService({ db: app.db, requestContext: request.requestContext });
      const created = await service.create(body);
      return reply.status(201).send(created);
    }
  );

  app.post(
    '/encounters/:id/documents',
    {
      preHandler: requirePermission('document.write')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const body = attachDocumentBodySchema.parse(request.body);
      const service = createDocumentsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.attachToEncounter(params.id, body.documentId);

      if (result.kind === 'encounter_not_found') {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      if (result.kind === 'document_not_found') {
        return reply.status(404).send({ message: 'Document not found' });
      }

      return reply.status(result.alreadyAttached ? 200 : 201).send({
        ...result.relation,
        alreadyAttached: result.alreadyAttached
      });
    }
  );

  app.get(
    '/documents/:id',
    {
      preHandler: requirePermission('document.read')
    },
    async (request, reply) => {
      const params = documentIdParamSchema.parse(request.params);
      const service = createDocumentsService({ db: app.db, requestContext: request.requestContext });
      const document = await service.getById(params.id);

      if (!document) {
        return reply.status(404).send({ message: 'Document not found' });
      }

      return reply.send(document);
    }
  );
};
