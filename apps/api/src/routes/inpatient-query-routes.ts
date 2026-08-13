import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { InpatientService } from '@cvg-his-v2/module-inpatient';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';

export interface InpatientQueryRoutesHandlers {
  inpatient: InpatientService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

export async function handleInpatientQueryRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: InpatientQueryRoutesHandlers
): Promise<boolean> {
  if (pathname !== '/inpatient' || request.method !== 'GET') {
    return false;
  }

  const principal = handlers.requirePrincipal(request, 'inpatient.read');
  const url = new URL(request.url ?? pathname, 'http://localhost');
  const encounterId = url.searchParams.get('encounterId') ?? undefined;
  const patientId = url.searchParams.get('patientId') ?? undefined;
  const includeDischarged = url.searchParams.get('includeDischarged') === 'true';
  appendAudit(handlers.audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'inpatient',
    action: 'list',
    entityType: 'inpatient-stay',
    entityId: encounterId ?? patientId ?? 'all',
    payloadSummary: 'Inpatient stays listed',
    riskLevel: 'medium',
    correlationId
  });
  response.statusCode = 200;
  response.end(
    JSON.stringify({
      items: handlers.inpatient.list({
        accountId: principal.user.accountId as never,
        encounterId,
        patientId,
        includeDischarged
      })
    })
  );
  return true;
}
