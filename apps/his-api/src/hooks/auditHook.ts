import type { FastifyRequest } from 'fastify';

import { append, type AppendAuditInput, type AppendedAudit } from '@cvg-his/audit';

export function auditFromRequest(request: FastifyRequest) {
  const actor = request.requestContext.actor;

  return {
    append: async (
      input: Omit<AppendAuditInput, 'accountId' | 'actorUserId' | 'roles' | 'requestId'>
    ): Promise<AppendedAudit> => {
      if (!actor?.accountId) {
        throw new Error('Missing actor accountId for audit append.');
      }

      return append({
        ...input,
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        requestId: request.requestContext.requestId
      });
    }
  };
}
