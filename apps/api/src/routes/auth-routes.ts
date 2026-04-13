import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

type AuditAppender = (
  actorId: string,
  accountId: string,
  module: string,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  riskLevel: 'low' | 'medium' | 'high',
  correlationId: string
) => void;

export interface AuthRoutesHandlers {
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  appendAudit: AuditAppender;
}

export function handleAuthRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AuthRoutesHandlers
): boolean {
  const { requirePrincipal, appendAudit } = handlers;

  if (pathname === '/auth/session' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'auth.session.read');
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'session_read',
      'session',
      principal.session.sessionId,
      'Current session inspected',
      'low',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        session: principal.session,
        access: principal.access,
        principal
      })
    );
    return true;
  }

  return false;
}
