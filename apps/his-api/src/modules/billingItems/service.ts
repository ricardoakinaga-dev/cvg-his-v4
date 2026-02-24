import { append, type AppendAuditInput } from '@cvg-his/audit';
import {
  createBillingItemCreatedEvent,
  createEncounterClosedEvent
} from '@cvg-his/events';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createBillingItemsRepo, type BillingItemsRepo } from './repo.js';
import type {
  BillingItemCreateInput,
  BillingItemRecord,
  BillingItemStatus,
  BillingItemUpdateInput,
  BillingItemWithService
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: BillingItemsRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type CreateBillingItemResult =
  | { kind: 'encounter_not_found' }
  | { kind: 'encounter_closed' }
  | { kind: 'created'; billingItem: BillingItemRecord };

export type UpdateBillingItemResult =
  | { kind: 'billing_item_not_found' }
  | { kind: 'already_confirmed' }
  | { kind: 'updated'; billingItem: BillingItemRecord };

export type DeleteBillingItemResult =
  | { kind: 'billing_item_not_found' }
  | { kind: 'already_confirmed' }
  | { kind: 'deleted' };

export type CloseEncounterWithBillingResult =
  | { kind: 'encounter_not_found' }
  | { kind: 'already_closed'; encounter: { id: string; status: string } }
  | {
      kind: 'closed';
      encounter: { id: string; status: string; closedAt: Date | null; closedByUserId: string | null };
      billingItems: BillingItemWithService[];
      billingTotal: string;
    };

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context in token.');
  }

  return actor as WriteActor;
}

export function createBillingItemsService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createBillingItemsRepo(context.db);
  const appendAuditFn = dependencies.appendAudit ?? append;

  return {
    async listByEncounter(
      encounterId: string,
      status?: BillingItemStatus
    ): Promise<{ items: BillingItemWithService[]; total: string; itemCount: number }> {
      const actor = ensureAccountActor(context.requestContext);

      const items = await repo.listByEncounter({
        accountId: actor.accountId,
        encounterId,
        status
      }) as BillingItemRecord[];

      const total = await repo.getTotalByEncounter({
        accountId: actor.accountId,
        encounterId
      });

      const itemCount = await repo.countByEncounter({
        accountId: actor.accountId,
        encounterId
      });

      return { items, total, itemCount };
    },

    async create(encounterId: string, input: BillingItemCreateInput): Promise<CreateBillingItemResult> {
      const actor = ensureWriteActor(context.requestContext);

      // Note: We should verify encounter exists and is open, but for now we trust the encounterId
      // In a full implementation, we'd check the encounter status here

      const billingItem = await repo.create({
        accountId: actor.accountId,
        encounterId,
        createdByUserId: actor.userId,
        input
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'billing_item',
        entityId: billingItem.id,
        action: 'BillingItemCreated',
        beforeJson: null,
        afterJson: billingItem,
        requestId: context.requestContext.requestId
      });

      // Emit event (in production, this would go to a message queue)
      const event = createBillingItemCreatedEvent({
        billingItemId: billingItem.id,
        encounterId: billingItem.encounterId,
        accountId: billingItem.accountId,
        serviceId: billingItem.serviceId,
        description: billingItem.description,
        qty: billingItem.qty,
        unitPrice: billingItem.unitPrice,
        totalPrice: billingItem.totalPrice,
        status: billingItem.status,
        createdByUserId: billingItem.createdByUserId,
        requestId: context.requestContext.requestId ?? ''
      });

      // Event is emitted (would publish to event bus in production)
      void event; // Placeholder for event bus publishing

      return {
        kind: 'created',
        billingItem
      };
    },

    async update(billingItemId: string, patch: BillingItemUpdateInput): Promise<UpdateBillingItemResult> {
      const actor = ensureWriteActor(context.requestContext);

      const before = await repo.findById({
        accountId: actor.accountId,
        billingItemId
      });

      if (!before) {
        return { kind: 'billing_item_not_found' };
      }

      if (before.status === 'confirmed') {
        return { kind: 'already_confirmed' };
      }

      const after = await repo.updateById({
        accountId: actor.accountId,
        billingItemId,
        patch
      });

      if (!after) {
        return { kind: 'billing_item_not_found' };
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'billing_item',
        entityId: billingItemId,
        action: 'BillingItemUpdated',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'updated',
        billingItem: after
      };
    },

    async delete(billingItemId: string): Promise<DeleteBillingItemResult> {
      const actor = ensureWriteActor(context.requestContext);

      const before = await repo.findById({
        accountId: actor.accountId,
        billingItemId
      });

      if (!before) {
        return { kind: 'billing_item_not_found' };
      }

      if (before.status === 'confirmed') {
        return { kind: 'already_confirmed' };
      }

      await repo.deleteById({
        accountId: actor.accountId,
        billingItemId
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'billing_item',
        entityId: billingItemId,
        action: 'BillingItemDeleted',
        beforeJson: before,
        afterJson: null,
        requestId: context.requestContext.requestId
      });

      return { kind: 'deleted' };
    },

    async confirmAll(encounterId: string): Promise<number> {
      const actor = ensureWriteActor(context.requestContext);

      const count = await repo.confirmAllByEncounter({
        accountId: actor.accountId,
        encounterId
      });

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'encounter',
        entityId: encounterId,
        action: 'BillingItemsConfirmed',
        beforeJson: { itemCount: count },
        afterJson: { status: 'confirmed' },
        requestId: context.requestContext.requestId
      });

      return count;
    }
  };
}
