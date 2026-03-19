import { append } from '@cvg-his/audit';
import type {
  CloseEncounterFinancialBody,
  ListEncounterReceivablesQuery,
  SettleEncounterReceivableBody
} from '@cvg-his/contracts';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createEncounterFinancialRepo } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type WriteActor = NonNullable<RequestContext['actor']> & { accountId: string; userId: string };

function unauthorized(message: string) {
  const error = new Error(message) as Error & { statusCode: 401 };
  error.statusCode = 401;
  return error;
}

export function createEncounterFinancialService(
  context: { db: DbClient; requestContext: RequestContext },
  deps: { repo?: ReturnType<typeof createEncounterFinancialRepo>; appendAudit?: typeof append } = {}
) {
  const repo = deps.repo ?? createEncounterFinancialRepo(context.db);
  const appendAudit = deps.appendAudit ?? append;

  function actor(): WriteActor {
    const current = context.requestContext.actor;
    if (!current?.accountId || !current.userId) throw unauthorized('Missing actor context.');
    return current as WriteActor;
  }

  return {
    async getSummary(encounterId: string) {
      const current = actor();
      return repo.getSummary(current.accountId, encounterId);
    },
    async close(encounterId: string, input: CloseEncounterFinancialBody) {
      const current = actor();
      const before = await repo.getSummary(current.accountId, encounterId);
      if (!before) return { kind: 'encounter_not_found' as const };
      const after = await repo.closeFinancial({
        accountId: current.accountId,
        encounterId,
        closedByUserId: current.userId,
        paidAmount: input.paidAmount,
        notes: input.notes ?? null,
        installments: input.installments?.map((item) => ({
          label: item.label,
          amount: Number(item.amount),
          dueAt: item.dueAt ?? null,
          notes: item.notes ?? null
        }))
      });
      if (!after) return { kind: 'encounter_not_found' as const };
      await appendAudit({
        accountId: current.accountId,
        actorUserId: current.userId,
        roles: current.roles,
        entityType: 'encounter_financial_account',
        entityId: encounterId,
        action: 'encounter_financial.close',
        beforeJson: before,
        afterJson: after,
        reason: input.notes ?? undefined,
        requestId: context.requestContext.requestId
      });
      return { kind: 'closed' as const, summary: after };
    },
    async listReceivables(query: ListEncounterReceivablesQuery) {
      const current = actor();
      return repo.listReceivables({
        accountId: current.accountId,
        status: query.status,
        search: query.search,
        encounterId: query.encounterId,
        page: query.page,
        pageSize: query.pageSize
      });
    },
    async settleReceivable(receivableId: string, input: SettleEncounterReceivableBody) {
      const current = actor();
      const beforePage = await repo.listReceivables({
        accountId: current.accountId,
        status: undefined,
        search: undefined,
        encounterId: undefined,
        page: 1,
        pageSize: 500
      });
      const before = beforePage.data.find((item) => item.id === receivableId) ?? null;
      if (!before) return { kind: 'receivable_not_found' as const };

      const receivable = await repo.settleReceivable({
        accountId: current.accountId,
        receivableId,
        amountPaid: input.amountPaid,
        paidByUserId: current.userId,
        notes: input.notes ?? null
      });
      if (!receivable) return { kind: 'receivable_not_found' as const };

      await appendAudit({
        accountId: current.accountId,
        actorUserId: current.userId,
        roles: current.roles,
        entityType: 'encounter_receivable',
        entityId: receivableId,
        action: 'encounter_receivable.settle',
        beforeJson: before,
        afterJson: receivable,
        reason: input.notes ?? undefined,
        requestId: context.requestContext.requestId
      });

      return { kind: 'settled' as const, receivable };
    }
  };
}
