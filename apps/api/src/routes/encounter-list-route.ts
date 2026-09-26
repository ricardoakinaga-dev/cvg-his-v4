import type { IncomingMessage, ServerResponse } from 'node:http';
import type { URL } from 'node:url';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { CorrelationId } from '@cvg-his-v2/shared-types';

import { paginateList } from '../request-boundaries.js';

export interface EncounterListRouteHandlers {
  readonly encounters: Pick<EncountersService, 'listAll'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<{ readonly user: { readonly id: string; readonly accountId: string } }>;
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

export async function handleEncounterListRoute(
  pathname: string,
  url: URL,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: EncounterListRouteHandlers
): Promise<boolean> {
  if (pathname !== '/encounters' || request.method !== 'GET') {
    return false;
  }

  const principal = await handlers.requirePrincipal(request, 'encounters.read');
  const encounterItems = paginateList(
    handlers.encounters.listAll(principal.user.accountId as never),
    url
  );
  handlers.appendAudit(
    principal.user.id,
    principal.user.accountId,
    'encounters',
    'list',
    'encounter',
    'all',
    'Encounters listed',
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify({ items: encounterItems }));
  return true;
}
