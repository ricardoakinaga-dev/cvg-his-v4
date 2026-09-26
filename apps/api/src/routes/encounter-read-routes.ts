import type { IncomingMessage, ServerResponse } from 'node:http';

import type { DiagnosticsService } from '@cvg-his-v2/module-diagnostics';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { AccountId, AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

export interface EncounterReadRoutesHandlers {
  readonly encounters: Pick<EncountersService, 'listTimelineAsync'>;
  readonly diagnostics: Pick<DiagnosticsService, 'list'>;
  readonly encounterFinancial: Pick<EncounterFinancialService, 'getSummary'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: (
    encounterId: string,
    accountId: string
  ) => ReturnType<EncountersService['getOrThrow']> | ReturnType<EncountersService['fetchOrThrow']>;
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

export interface EncounterTimelineRouteHandlers {
  readonly encounters: Pick<EncountersService, 'listTimelineAsync'>;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: (
    encounterId: string,
    accountId: string
  ) => ReturnType<EncountersService['getOrThrow']> | ReturnType<EncountersService['fetchOrThrow']>;
  readonly appendAudit: EncounterReadRoutesHandlers['appendAudit'];
}

export async function handleEncounterTimelineRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: EncounterTimelineRouteHandlers
): Promise<boolean> {
  if (
    !pathname.startsWith('/encounters/') ||
    !pathname.endsWith('/timeline') ||
    request.method !== 'GET'
  ) {
    return false;
  }

  const { encounters, requirePrincipal, requireEncounterForAccount, appendAudit } = handlers;
  const principal = await requirePrincipal(request, 'encounters.read');
  const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
  await requireEncounterForAccount(encounterId, principal.user.accountId);
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'encounters',
    'read_timeline',
    'encounter-timeline',
    encounterId,
    'Encounter timeline inspected',
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(
    JSON.stringify({
      items: await encounters.listTimelineAsync(principal.user.accountId, encounterId as never)
    })
  );
  return true;
}

export async function handleEncounterReadRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: EncounterReadRoutesHandlers
): Promise<boolean> {
  const {
    encounters,
    diagnostics,
    encounterFinancial,
    requirePrincipal,
    requireEncounterForAccount,
    appendAudit
  } = handlers;

  if (pathname.startsWith('/encounters/') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'encounters.read');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    const encounter = await requireEncounterForAccount(encounterId, principal.user.accountId);

    if (pathname.endsWith('/summary')) {
      const timeline = await encounters.listTimelineAsync(
        principal.user.accountId,
        encounterId as never
      );
      const orders = diagnostics.list(principal.user.accountId as AccountId, encounterId as never);
      let financial = null;

      try {
        financial = await encounterFinancial.getSummary(
          principal.user.accountId,
          encounterId as never
        );
      } catch {
        financial = null;
      }

      appendAudit(
        principal.user.id,
        principal.user.accountId,
        'encounters',
        'read_summary',
        'encounter',
        encounter.id,
        `Encounter ${encounter.id} summary inspected`,
        'medium',
        correlationId
      );
      response.statusCode = 200;
      response.end(
        JSON.stringify({
          encounter,
          timeline,
          diagnostics: {
            totalOrders: orders.length,
            pendingOrders: orders.filter((order) => order.status !== 'resulted').length,
            releasedResults: orders.filter((order) => order.status === 'resulted').length,
            latestOrders: orders.slice(0, 5)
          },
          financial
        })
      );
      return true;
    }

    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'encounters',
      'read',
      'encounter',
      encounter.id,
      `Encounter ${encounter.id} inspected`,
      'medium',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(encounter));
    return true;
  }

  return false;
}
