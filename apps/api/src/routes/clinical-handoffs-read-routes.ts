import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import { ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AuthenticatedPrincipal,
  ClinicalHandoffPriority,
  ClinicalHandoffStatus,
  CorrelationId
} from '@cvg-his-v2/shared-types';
import type {
  ClinicalHandoffListFilters,
  ClinicalHandoffsService
} from '@cvg-his-v2/module-encounters';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export interface ClinicalHandoffsReadRouteHandlers {
  readonly clinicalHandoffs: Pick<ClinicalHandoffsService, 'list' | 'getOrThrow'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly appendAudit: (
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
}

export async function handleClinicalHandoffsReadRoute(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: ClinicalHandoffsReadRouteHandlers
): Promise<boolean> {
  if (pathname !== '/clinical-handoffs' || request.method !== 'GET') {
    return false;
  }

  const { clinicalHandoffs, requirePrincipal, appendAudit } = handlers;
  const principal = await requirePrincipal(request, 'encounters.read');
  const status = url.searchParams.get('handoffStatus') ?? url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const validStatuses = new Set<ClinicalHandoffStatus>([
    'ready_to_send',
    'sent_to_reception',
    'acknowledged_by_reception',
    'waiting_pending_resolution',
    'returned_to_clinic',
    'sent_to_finance'
  ]);
  const validPriorities = new Set<ClinicalHandoffPriority>(['low', 'medium', 'high', 'critical']);

  if (status && !validStatuses.has(status as ClinicalHandoffStatus)) {
    throw new ValidationError('Invalid clinical handoff status filter', { status });
  }

  if (priority && !validPriorities.has(priority as ClinicalHandoffPriority)) {
    throw new ValidationError('Invalid clinical handoff priority filter', { priority });
  }

  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'clinical-handoffs',
    'list',
    'clinical-handoff',
    'all',
    'Clinical handoffs listed',
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(
    JSON.stringify({
      items: clinicalHandoffs.list(principal.user.accountId, {
        handoffStatus: status ? (status as ClinicalHandoffStatus) : undefined,
        encounterId: (url.searchParams.get('encounterId') ?? undefined) as never,
        ownerId: (url.searchParams.get('ownerId') ?? undefined) as never,
        patientId: (url.searchParams.get('patientId') ?? undefined) as never,
        priority: priority ? (priority as ClinicalHandoffPriority) : undefined
      } satisfies ClinicalHandoffListFilters)
    })
  );
  return true;
}

export async function handleClinicalHandoffDetailReadRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: ClinicalHandoffsReadRouteHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/clinical-handoffs/') || request.method !== 'GET') {
    return false;
  }

  const { clinicalHandoffs, requirePrincipal, appendAudit } = handlers;
  const principal = await requirePrincipal(request, 'encounters.read');
  const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
  const handoff = clinicalHandoffs.getOrThrow(principal.user.accountId, handoffId as never);

  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'clinical-handoffs',
    'read',
    'clinical-handoff',
    handoff.id,
    `Clinical handoff ${handoff.id} inspected`,
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify(handoff));
  return true;
}
