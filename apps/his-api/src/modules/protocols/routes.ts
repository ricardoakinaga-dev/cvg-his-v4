import type { FastifyPluginAsync } from 'fastify';
import {
  ProtocolCreateSchema,
  ProtocolUpdateSchema,
  type ProtocolCreateDto,
  type ProtocolUpdateDto,
  parseOrThrow422
} from '@cvg-his/domain';
import { z } from 'zod';

import { requirePermission } from '../../middlewares/requirePermission.js';
import { createProtocolsService } from './service.js';
import {
  listProtocolsQuerySchema,
  protocolIdParamSchema
} from './types.js';

const listProtocolAuditQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export const protocolsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/',
    {
      preHandler: requirePermission('protocol.write')
    },
    async (request, reply) => {
      const body = parseOrThrow422(ProtocolCreateSchema, request.body) as ProtocolCreateDto;
      const service = createProtocolsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.create(body);

      if (result.kind === 'slug_conflict') {
        return reply.status(409).send({ message: 'Protocol slug already exists for this account' });
      }

      return reply.status(201).send(result.protocol);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: requirePermission('protocol.read')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const service = createProtocolsService({ db: app.db, requestContext: request.requestContext });
      const protocol = await service.getById(params.id);

      if (!protocol) {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      return reply.send(protocol);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: requirePermission('protocol.write')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const body = parseOrThrow422(ProtocolUpdateSchema, request.body) as ProtocolUpdateDto;
      const service = createProtocolsService({ db: app.db, requestContext: request.requestContext });
      const result = await service.update(params.id, body);

      if (result.kind === 'protocol_not_found') {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      if (result.kind === 'slug_conflict') {
        return reply.status(409).send({ message: 'Protocol slug already exists for this account' });
      }

      return reply.send(result.protocol);
    }
  );

  app.get(
    '/:id/audit',
    {
      preHandler: requirePermission('protocol.audit.read')
    },
    async (request, reply) => {
      const params = protocolIdParamSchema.parse(request.params);
      const query = listProtocolAuditQuerySchema.parse(request.query);
      const actor = request.requestContext.actor;
      if (!actor?.accountId) {
        return reply.status(401).send({ message: 'Missing or invalid actor context. Provide a valid Bearer token.' });
      }
      const service = createProtocolsService({ db: app.db, requestContext: request.requestContext });
      const protocol = await service.getById(params.id);

      if (!protocol) {
        return reply.status(404).send({ message: 'Protocol not found' });
      }

      const offset = (query.page - 1) * query.pageSize;
      const [eventsResult, totalResult] = await Promise.all([
        request.db.$client.query(
          `
            select
              ae.id,
              ae.created_at,
              ae.actor_user_id,
              ae.actor_roles,
              ae.action,
              ae.entity_type,
              ae.entity_id,
              ae.before_json,
              ae.after_json,
              ae.reason,
              ae.request_id
            from audit_events ae
            where ae.account_id = $1
              and (
              (
                ae.entity_type = 'protocol'
                and ae.entity_id = $2
                and exists (
                  select 1
                  from protocols p
                  where p.id::text = ae.entity_id
                    and p.account_id = $1
                )
              )
              or
              (
                ae.entity_type = 'protocol_version'
                and exists (
                  select 1
                  from protocol_versions pv
                  where pv.id::text = ae.entity_id
                    and pv.account_id = $1
                    and pv.protocol_id = $2
                )
              )
            )
            order by ae.created_at desc
            limit $3 offset $4
          `,
          [actor.accountId, params.id, query.pageSize, offset]
        ),
        request.db.$client.query(
          `
            select count(*)::int as total
            from audit_events ae
            where ae.account_id = $1
              and (
              (
                ae.entity_type = 'protocol'
                and ae.entity_id = $2
                and exists (
                  select 1
                  from protocols p
                  where p.id::text = ae.entity_id
                    and p.account_id = $1
                )
              )
              or
              (
                ae.entity_type = 'protocol_version'
                and exists (
                  select 1
                  from protocol_versions pv
                  where pv.id::text = ae.entity_id
                    and pv.account_id = $1
                    and pv.protocol_id = $2
                )
              )
            )
          `,
          [actor.accountId, params.id]
        )
      ]);

      return reply.send({
        page: query.page,
        pageSize: query.pageSize,
        total: Number(totalResult.rows[0]?.total ?? 0),
        data: eventsResult.rows
      });
    }
  );

  app.get(
    '/',
    {
      preHandler: requirePermission('protocol.read')
    },
    async (request) => {
      const query = listProtocolsQuerySchema.parse(request.query);
      const service = createProtocolsService({ db: app.db, requestContext: request.requestContext });
      return service.list(query);
    }
  );
};
