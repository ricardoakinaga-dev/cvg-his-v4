import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createAvailabilityRepo, createTypeConfigRepo } from './repo.js';
import type {
  CreateAvailabilityBody,
  UpdateAvailabilityBody,
  ListAvailabilityQuery,
  CreateTypeConfigBody,
  UpdateTypeConfigBody,
  ListTypeConfigsQuery
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type AgendaConfigContext = {
  db: DbClient;
  requestContext: RequestContext;
};

function ensureActor(context: RequestContext) {
  const actor = context.actor;
  if (!actor?.accountId) throw new Error('Actor context is required.');
  return actor;
}

// =====================
// Availability Service
// =====================

type AvailabilityDeps = {
  repo?: ReturnType<typeof createAvailabilityRepo>;
  appendAudit?: typeof append;
};

export function createAvailabilityService(context: AgendaConfigContext, deps: AvailabilityDeps = {}) {
  const repo = deps.repo ?? createAvailabilityRepo(context.db);
  const appendAudit = deps.appendAudit ?? append;

  return {
    async create(input: CreateAvailabilityBody) {
      const actor = ensureActor(context.requestContext);

      if (input.endTime <= input.startTime) {
        const error = new Error('End time must be after start time.');
        Object.assign(error, { statusCode: 400 });
        throw error;
      }

      const created = await repo.create({
        accountId: actor.accountId,
        professionalUserId: input.professionalUserId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMinutes: input.slotDurationMinutes,
        notes: input.notes
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'availability',
        entityId: created.id,
        action: 'availability.create',
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });

      return created;
    },

    async getById(id: string) {
      const actor = ensureActor(context.requestContext);
      return repo.findById(actor.accountId, id);
    },

    async list(query: ListAvailabilityQuery) {
      const actor = ensureActor(context.requestContext);
      const result = await repo.list(actor.accountId, query.professionalUserId);
      return {
        data: result.data,
        page: query.page,
        pageSize: query.pageSize,
        total: result.total
      };
    },

    async update(id: string, patch: UpdateAvailabilityBody) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return null;

      const after = await repo.updateById(actor.accountId, id, patch);
      if (!after) return null;

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'availability',
        entityId: id,
        action: 'availability.update',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return after;
    },

    async delete(id: string) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return false;

      const deleted = await repo.deleteById(actor.accountId, id);

      if (deleted) {
        await appendAudit({
          accountId: actor.accountId,
          actorUserId: actor.userId,
          roles: actor.roles,
          entityType: 'availability',
          entityId: id,
          action: 'availability.delete',
          beforeJson: before,
          afterJson: null,
          requestId: context.requestContext.requestId
        });
      }

      return deleted;
    }
  };
}

// =====================
// Type Config Service
// =====================

type TypeConfigDeps = {
  repo?: ReturnType<typeof createTypeConfigRepo>;
  appendAudit?: typeof append;
};

export function createTypeConfigService(context: AgendaConfigContext, deps: TypeConfigDeps = {}) {
  const repo = deps.repo ?? createTypeConfigRepo(context.db);
  const appendAudit = deps.appendAudit ?? append;

  return {
    async create(input: CreateTypeConfigBody) {
      const actor = ensureActor(context.requestContext);

      if (input.code) {
        const existing = await repo.findByCode(actor.accountId, input.code);
        if (existing) {
          const error = new Error('Type config code already exists for this account.');
          Object.assign(error, { statusCode: 409 });
          throw error;
        }
      }

      const created = await repo.create({
        accountId: actor.accountId,
        ...input
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'typeConfig',
        entityId: created.id,
        action: 'typeConfig.create',
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });

      return created;
    },

    async getById(id: string) {
      const actor = ensureActor(context.requestContext);
      return repo.findById(actor.accountId, id);
    },

    async list(query: ListTypeConfigsQuery) {
      const actor = ensureActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        active: query.active
      });
    },

    async update(id: string, patch: UpdateTypeConfigBody) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return null;

      const after = await repo.updateById(actor.accountId, id, patch);
      if (!after) return null;

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'typeConfig',
        entityId: id,
        action: 'typeConfig.update',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return after;
    },

    async delete(id: string) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return false;

      const deleted = await repo.deleteById(actor.accountId, id);

      if (deleted) {
        await appendAudit({
          accountId: actor.accountId,
          actorUserId: actor.userId,
          roles: actor.roles,
          entityType: 'typeConfig',
          entityId: id,
          action: 'typeConfig.delete',
          beforeJson: before,
          afterJson: null,
          requestId: context.requestContext.requestId
        });
      }

      return deleted;
    }
  };
}
