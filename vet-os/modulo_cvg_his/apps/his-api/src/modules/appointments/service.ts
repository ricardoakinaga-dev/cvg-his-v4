import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createAppointmentsRepo } from './repo.js';
import type { CreateAppointmentBody, ListAppointmentsQuery, UpdateAppointmentBody } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type AppointmentContext = {
  db: DbClient;
  requestContext: RequestContext;
};

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access appointments.');
  }

  return actor;
}

type AppointmentsServiceDeps = {
  repo?: ReturnType<typeof createAppointmentsRepo>;
  appendAudit?: typeof append;
};

export function createAppointmentsService(context: AppointmentContext, deps: AppointmentsServiceDeps = {}) {
  const repo = deps.repo ?? createAppointmentsRepo(context.db);
  const appendAudit = deps.appendAudit ?? append;

  return {
    async create(input: CreateAppointmentBody) {
      const actor = ensureActor(context.requestContext);

      // Validate endAt > startAt
      if (input.endAt <= input.startAt) {
        const error = new Error('End time must be after start time.');
        Object.assign(error, { statusCode: 400 });
        throw error;
      }

      const created = await repo.create({
        accountId: actor.accountId,
        patientId: input.patientId,
        ownerId: input.ownerId,
        professionalUserId: input.professionalUserId,
        startAt: input.startAt,
        endAt: input.endAt,
        type: input.type,
        notes: input.notes
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'appointment',
        entityId: created.id,
        action: 'appointment.create',
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

    async update(id: string, patch: UpdateAppointmentBody) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);

      if (!before) {
        return null;
      }

      // Validate time range if both are being updated
      const newStartAt = patch.startAt ?? before.startAt;
      const newEndAt = patch.endAt ?? before.endAt;
      if (newEndAt <= newStartAt) {
        const error = new Error('End time must be after start time.');
        Object.assign(error, { statusCode: 400 });
        throw error;
      }

      // Prevent updating cancelled/completed appointments
      if (before.status === 'cancelled' || before.status === 'completed') {
        const error = new Error('Cannot update a cancelled or completed appointment.');
        Object.assign(error, { statusCode: 409 });
        throw error;
      }

      const after = await repo.updateById(actor.accountId, id, patch);

      if (!after) {
        return null;
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'appointment',
        entityId: id,
        action: 'appointment.update',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return after;
    },

    async list(query: ListAppointmentsQuery) {
      const actor = ensureActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        professionalUserId: query.professionalUserId,
        patientId: query.patientId,
        status: query.status,
        type: query.type,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo
      });
    },

    async cancel(id: string) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);

      if (!before) {
        return null;
      }

      if (before.status === 'cancelled' || before.status === 'completed') {
        const error = new Error('Cannot cancel a cancelled or completed appointment.');
        Object.assign(error, { statusCode: 409 });
        throw error;
      }

      const after = await repo.cancel(actor.accountId, id);

      if (!after) {
        return null;
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'appointment',
        entityId: id,
        action: 'appointment.cancel',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return after;
    }
  };
}
