import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createEncounterBillingRepo } from './repo.js';
import type { CreateEncounterBillingItemBody, ListEncounterBillingItemsQuery, UpdateEncounterBillingItemBody } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type WriteActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
  userId: string;
};

function unauthorized(message: string) {
  const error = new Error(message) as Error & { statusCode: 401 };
  error.statusCode = 401;
  return error;
}

type EncounterBillingServiceDeps = {
  repo?: ReturnType<typeof createEncounterBillingRepo>;
  appendAudit?: typeof append;
};

export function createEncounterBillingService(
  context: { db: DbClient; requestContext: RequestContext },
  deps: EncounterBillingServiceDeps = {}
) {
  const repo = deps.repo ?? createEncounterBillingRepo(context.db);
  const appendAudit = deps.appendAudit ?? append;

  function actor(): WriteActor {
    const current = context.requestContext.actor;
    if (!current?.accountId || !current.userId) throw unauthorized('Missing actor context.');
    return current as WriteActor;
  }

  async function ensureEncounterWritable(accountId: string, encounterId: string) {
    const status = await repo.findEncounterStatus(accountId, encounterId);
    if (!status) return { kind: 'encounter_not_found' as const };
    if (status === 'closed') return { kind: 'encounter_closed' as const };
    return { kind: 'ok' as const };
  }

  return {
    async create(encounterId: string, input: CreateEncounterBillingItemBody) {
      const current = actor();
      const guard = await ensureEncounterWritable(current.accountId, encounterId);
      if (guard.kind !== 'ok') return guard;
      const created = await repo.create({
        ...input,
        encounterId,
        accountId: current.accountId,
        createdByUserId: current.userId,
        updatedByUserId: current.userId
      });
      await appendAudit({
        accountId: current.accountId,
        actorUserId: current.userId,
        roles: current.roles,
        entityType: 'encounter_billing_item',
        entityId: created.id,
        action: 'encounter_billing_item.create',
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });
      return { kind: 'created' as const, item: created };
    },
    async list(query: ListEncounterBillingItemsQuery) {
      const current = actor();
      return repo.list({
        accountId: current.accountId,
        encounterId: query.encounterId,
        itemType: query.itemType,
        page: query.page,
        pageSize: query.pageSize
      });
    },
    async getSummary(encounterId: string) {
      const current = actor();
      return repo.getSummary(current.accountId, encounterId);
    },
    async update(id: string, input: UpdateEncounterBillingItemBody) {
      const current = actor();
      const before = await repo.findById(current.accountId, id);
      if (!before) return { kind: 'billing_item_not_found' as const };
      const guard = await ensureEncounterWritable(current.accountId, before.encounterId);
      if (guard.kind === 'encounter_not_found') return { kind: 'billing_item_not_found' as const };
      if (guard.kind === 'encounter_closed') return guard;
      const after = await repo.updateById(current.accountId, id, {
        ...input,
        updatedByUserId: current.userId
      });
      if (!after) return { kind: 'billing_item_not_found' as const };
      await appendAudit({
        accountId: current.accountId,
        actorUserId: current.userId,
        roles: current.roles,
        entityType: 'encounter_billing_item',
        entityId: id,
        action: 'encounter_billing_item.update',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });
      return { kind: 'updated' as const, item: after };
    },
    async remove(id: string) {
      const current = actor();
      const before = await repo.findById(current.accountId, id);
      if (!before) return { kind: 'billing_item_not_found' as const };
      const guard = await ensureEncounterWritable(current.accountId, before.encounterId);
      if (guard.kind === 'encounter_not_found') return { kind: 'billing_item_not_found' as const };
      if (guard.kind === 'encounter_closed') return guard;
      const removed = await repo.removeById(current.accountId, id);
      if (!removed) return { kind: 'billing_item_not_found' as const };
      await appendAudit({
        accountId: current.accountId,
        actorUserId: current.userId,
        roles: current.roles,
        entityType: 'encounter_billing_item',
        entityId: id,
        action: 'encounter_billing_item.remove',
        beforeJson: before,
        afterJson: null,
        requestId: context.requestContext.requestId
      });
      return { kind: 'removed' as const, item: removed };
    }
  };
}
