import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';

type SensitiveReadAuditInput = {
  requestContext: RequestContext;
  entityType: string;
  entityId: string;
  action: string;
  reason: string;
  afterJson?: Record<string, unknown> | null;
};

export async function appendSensitiveReadAudit(input: SensitiveReadAuditInput): Promise<void> {
  const actor = input.requestContext.actor;

  if (!actor?.accountId) {
    return;
  }

  await append({
    accountId: actor.accountId,
    actorUserId: actor.userId,
    roles: actor.roles ?? [],
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    afterJson: input.afterJson ?? null,
    reason: input.reason,
    requestId: input.requestContext.requestId
  });
}
