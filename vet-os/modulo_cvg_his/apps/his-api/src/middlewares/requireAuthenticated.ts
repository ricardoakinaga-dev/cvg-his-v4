import type { FastifyReply, preHandlerHookHandler } from 'fastify';

import { getActiveSessionById, touchAuthSession } from '../modules/iam/service.js';

function replyAuthError(reply: FastifyReply, statusCode: 401, message: string): void {
  void reply.status(statusCode).send({ message });
}

export async function ensureAuthenticated(
  request: Parameters<preHandlerHookHandler>[0],
  reply: Parameters<preHandlerHookHandler>[1]
): Promise<boolean> {
  const actor = request.requestContext.actor;

  if (!actor?.accountId) {
    replyAuthError(reply, 401, 'Missing or invalid actor context. Provide a valid Bearer token.');
    return false;
  }

  if (actor.sessionId) {
    const session = await getActiveSessionById(request.db, {
      sessionId: actor.sessionId,
      accountId: actor.accountId
    });

    if (!session || session.revokedAt) {
      replyAuthError(reply, 401, 'Session is no longer active.');
      return false;
    }

    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      replyAuthError(reply, 401, 'Session has expired.');
      return false;
    }

    await touchAuthSession(request.db, actor.sessionId);
  }

  return true;
};

export const requireAuthenticated: preHandlerHookHandler = async (request, reply) => {
  await ensureAuthenticated(request, reply);
};
