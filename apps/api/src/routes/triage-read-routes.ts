import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { TriageService } from '@cvg-his-v2/module-triage';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { matchesCollectionItemActionPath } from './resource-route-path.js';

export interface TriageReadRoutesHandlers {
  readonly triage: Pick<TriageService, 'list' | 'getOrThrow' | 'listVersions'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: (encounterId: string, accountId: string) => unknown;
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

export async function handleTriageReadRoutes(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: TriageReadRoutesHandlers
): Promise<boolean> {
  const { triage, requirePrincipal, requireEncounterForAccount, appendAudit } = handlers;
  if (pathname === '/triage' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'triage.read');
    const rawEncounterId = url.searchParams.get('encounterId');
    const encounterId =
      rawEncounterId === null
        ? undefined
        : (requireNonEmptyString(rawEncounterId, 'encounterId') as never);
    if (encounterId) {
      requireEncounterForAccount(encounterId, principal.user.accountId);
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'triage',
      'list',
      'triage-record',
      encounterId ?? 'all',
      'Triage records listed',
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: triage.list(principal.user.accountId as never, encounterId as never)
      })
    );
    return true;
  }

  if (matchesCollectionItemActionPath(pathname, '/triage', 'history') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'triage.read');
    const triageId = requireNonEmptyString(pathname.split('/')[2], 'triageId');
    const record = triage.getOrThrow(triageId as never, principal.user.accountId as never);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'triage',
      'read_history',
      'triage-record-version',
      record.id,
      `Triage history inspected for encounter ${record.encounterId}`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(
      JSON.stringify({
        items: triage.listVersions(triageId as never, principal.user.accountId as never)
      })
    );
    return true;
  }

  return false;
}
