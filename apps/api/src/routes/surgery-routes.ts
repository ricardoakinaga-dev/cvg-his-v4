import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { SurgeryService } from '@cvg-his-v2/module-surgery';
import type {
  CreateSurgeryCaseRequest,
  UpdateSurgeryStatusRequest
} from '@cvg-his-v2/shared-contracts';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface SurgeryRoutesHandlers {
  surgery: SurgeryService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

export async function handleSurgeryRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: SurgeryRoutesHandlers
): Promise<boolean> {
  const { surgery, audit, requirePrincipal } = handlers;

  if (pathname === '/surgeries' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'surgery.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    const items = surgery.list(encounterId ?? undefined);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'surgery',
      action: 'list',
      entityType: 'surgery-case',
      entityId: encounterId ?? 'all',
      payloadSummary: 'Surgery cases listed',
      riskLevel: 'medium',
      correlationId
    });

    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  if (pathname === '/surgeries' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'surgery.manage');
    const payload = (await readJsonBody(request)) as CreateSurgeryCaseRequest;
    const surgeryCase = surgery.requestCase(payload);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'surgery',
      action: 'create',
      entityType: 'surgery-case',
      entityId: surgeryCase.id,
      payloadSummary: `Surgery case created: ${surgeryCase.procedureName}`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 201;
    response.end(JSON.stringify(surgeryCase));
    return true;
  }

  const detailMatch = pathname.match(/^\/surgeries\/([^/]+)$/);
  if (detailMatch && request.method === 'GET') {
    const principal = requirePrincipal(request, 'surgery.read');
    const surgeryCaseId = requireNonEmptyString(detailMatch[1], 'surgeryCaseId');
    const surgeryCase = surgery.getOrThrow(surgeryCaseId as never);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'surgery',
      action: 'read',
      entityType: 'surgery-case',
      entityId: surgeryCase.id,
      payloadSummary: `Surgery case read: ${surgeryCase.procedureName}`,
      riskLevel: 'medium',
      correlationId
    });

    response.statusCode = 200;
    response.end(JSON.stringify(surgeryCase));
    return true;
  }

  const statusMatch = pathname.match(/^\/surgeries\/([^/]+)\/status$/);
  if (statusMatch && request.method === 'POST') {
    const principal = requirePrincipal(request, 'surgery.manage');
    const surgeryCaseId = requireNonEmptyString(statusMatch[1], 'surgeryCaseId');
    const payload = (await readJsonBody(request)) as UpdateSurgeryStatusRequest;
    const surgeryCase = surgery.updateStatus(surgeryCaseId as never, payload);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'surgery',
      action: 'update_status',
      entityType: 'surgery-case',
      entityId: surgeryCase.id,
      payloadSummary: `Surgery case moved to ${surgeryCase.status}`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 200;
    response.end(JSON.stringify(surgeryCase));
    return true;
  }

  return false;
}
