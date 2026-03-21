import type { FastifyReply, preHandlerHookHandler } from 'fastify';

import { ensureAuthenticated } from './requireAuthenticated.js';

function replyAuthError(reply: FastifyReply, statusCode: 401 | 403, message: string): void {
  void reply.status(statusCode).send({ message });
}

export function requirePermission(permission: string): preHandlerHookHandler {
  return async (request, reply) => {
    const authenticated = await ensureAuthenticated(request, reply);
    if (!authenticated || reply.sent) {
      return;
    }

    const actor = request.requestContext.actor;
    if (!actor) {
      replyAuthError(reply, 401, 'Missing or invalid actor context. Provide a valid Bearer token.');
      return;
    }

    const permissions = actor.permissions ?? [];
    if (!permissions.includes('*') && !permissions.includes(permission)) {
      replyAuthError(reply, 403, `Missing required permission: ${permission}`);
      return;
    }
  };
}
