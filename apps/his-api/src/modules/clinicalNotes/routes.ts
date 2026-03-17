import type { FastifyPluginAsync } from 'fastify';
import {
  NoteCreateSchema,
  NoteSignSchema,
  NoteUpdateSchema,
  NoteVersionSchema,
  parseOrThrow422
} from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createClinicalNotesService } from './service.js';

const encounterIdParamSchema = z.object({
  id: z.string().uuid()
});

const noteIdParamSchema = z.object({
  id: z.string().uuid()
});

const noteCreateBodySchema = z.object({
  soap: z.unknown(),
  reason: z.string().trim().min(1).optional()
});

const noteUpdateBodySchema = z.object({
  soap: z.unknown(),
  reason: z.string().trim().min(1)
});

export const clinicalNotesRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/encounters/:id/notes',
    {
      preHandler: requirePermission('note.write')
    },
    async (request, reply) => {
      const params = encounterIdParamSchema.parse(request.params);
      const body = noteCreateBodySchema.parse(request.body);
      const parsed = parseOrThrow422(NoteCreateSchema, {
        encounterId: params.id,
        soap: body.soap
      });

      const service = createClinicalNotesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create({
        ...parsed,
        reason: body.reason
      });

      if (result.kind === 'encounter_not_found') {
        return reply.status(404).send({ message: 'Encounter not found' });
      }

      return reply.status(201).send(result.note);
    }
  );

  app.patch(
    '/notes/:id',
    {
      preHandler: requirePermission('note.write')
    },
    async (request, reply) => {
      const params = noteIdParamSchema.parse(request.params);
      const body = noteUpdateBodySchema.parse(request.body);
      const noteUpdate = parseOrThrow422(NoteUpdateSchema, {
        soap: body.soap
      });
      const noteVersion = parseOrThrow422(NoteVersionSchema, {
        reason: body.reason
      });

      const service = createClinicalNotesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, {
        ...noteUpdate,
        reason: noteVersion.reason
      });

      if (result.kind === 'note_not_found') {
        return reply.status(404).send({ message: 'Clinical note not found' });
      }

      if (result.kind === 'note_not_editable') {
        return reply.status(409).send({
          message: 'Clinical note is not editable. Only draft notes can be updated.',
          note: result.note
        });
      }

      return reply.send(result.note);
    }
  );

  app.post(
    '/notes/:id/version',
    {
      preHandler: requirePermission('note.version')
    },
    async (request, reply) => {
      const params = noteIdParamSchema.parse(request.params);
      const body = noteUpdateBodySchema.parse(request.body);
      const noteUpdate = parseOrThrow422(NoteUpdateSchema, {
        soap: body.soap
      });
      const noteVersion = parseOrThrow422(NoteVersionSchema, {
        reason: body.reason
      });

      const service = createClinicalNotesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.version(params.id, {
        ...noteUpdate,
        reason: noteVersion.reason
      });

      if (result.kind === 'note_not_found') {
        return reply.status(404).send({ message: 'Clinical note not found' });
      }

      if (result.kind === 'note_not_editable') {
        return reply.status(409).send({
          message: 'Clinical note is not editable. Only draft notes can be versioned.',
          note: result.note
        });
      }

      return reply.send({
        note: result.note,
        event: result.event
      });
    }
  );

  app.post(
    '/notes/:id/sign',
    {
      preHandler: requirePermission('note.sign')
    },
    async (request, reply) => {
      const params = noteIdParamSchema.parse(request.params);
      parseOrThrow422(NoteSignSchema, { id: params.id });

      const service = createClinicalNotesService({ db: app.db, requestContext: request.requestContext });
      const result = await service.sign(params.id);

      if (result.kind === 'note_not_found') {
        return reply.status(404).send({ message: 'Clinical note not found' });
      }

      if (result.kind === 'already_signed') {
        return reply.status(409).send({
          message: 'Clinical note is already signed',
          note: result.note
        });
      }

      return reply.send({
        note: result.note,
        event: result.event
      });
    }
  );

  app.get(
    '/notes/:id',
    {
      preHandler: requirePermission('note.read')
    },
    async (request, reply) => {
      const params = noteIdParamSchema.parse(request.params);
      const service = createClinicalNotesService({ db: app.db, requestContext: request.requestContext });
      const note = await service.getById(params.id);

      if (!note) {
        return reply.status(404).send({ message: 'Clinical note not found' });
      }

      return reply.send(note);
    }
  );

  app.get(
    '/soap-templates',
    {
      preHandler: requirePermission('note.read')
    },
    async (request) => {
      const service = createClinicalNotesService({ db: app.db, requestContext: request.requestContext });
      return {
        data: service.listSoapTemplates()
      };
    }
  );
};
