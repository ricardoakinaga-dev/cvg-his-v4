import type { IncomingMessage, ServerResponse } from 'node:http';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { TriageService } from '@cvg-his-v2/module-triage';
import type { CreateTriageRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import type {
  createEncounterAccountGuard,
  createEncounterQueueSynchronizer
} from '../helpers/api-server-boundaries.js';
import { readJsonBody } from '../helpers/request-body.js';

export interface TriageCreateRouteHandlers {
  readonly triage: Pick<TriageService, 'createTriage'>;
  readonly encounters: Pick<
    EncountersService,
    'transitionEncounter' | 'appendTimeline' | 'waitForPersistence'
  >;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
  readonly requireEncounterForAccount: ReturnType<typeof createEncounterAccountGuard>;
  readonly syncQueueWithEncounter: ReturnType<typeof createEncounterQueueSynchronizer>;
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

export async function handleTriageCreateRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: TriageCreateRouteHandlers
): Promise<boolean> {
  if (pathname !== '/triage' || request.method !== 'POST') {
    return false;
  }

  const {
    triage,
    encounters,
    requirePrincipal,
    requireEncounterForAccount,
    syncQueueWithEncounter,
    appendAudit
  } = handlers;
  const principal = await requirePrincipal(request, 'triage.manage');
  const payload = (await readJsonBody(request)) as CreateTriageRequest;
  const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId');
  const currentEncounter = requireEncounterForAccount(encounterId, principal.user.accountId);
  const record = await triage.createTriage(
    principal.user.id,
    payload,
    principal.user.accountId as never
  );
  if (currentEncounter.status === 'reception') {
    encounters.transitionEncounter(
      principal.user.accountId,
      currentEncounter.id,
      principal.user.id,
      {
        nextStatus: 'in_triage'
      }
    );
    await syncQueueWithEncounter(principal.user.accountId, currentEncounter.id, 'in_triage');
  }
  encounters.appendTimeline(principal.user.accountId, record.encounterId, {
    accountId: record.accountId,
    eventType: 'triage_recorded',
    summary: `Initial triage recorded with priority ${record.priority}`,
    actorUserId: principal.user.id
  });
  const encounter = encounters.transitionEncounter(
    principal.user.accountId,
    record.encounterId,
    principal.user.id,
    {
      nextStatus: record.destination
    }
  );
  await syncQueueWithEncounter(principal.user.accountId, encounter.id, encounter.status);
  await encounters.waitForPersistence();
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'triage',
    'create',
    'triage-record',
    record.id,
    `Initial triage recorded for encounter ${record.encounterId}`,
    'high',
    correlationId
  );
  response.statusCode = 201;
  response.end(JSON.stringify(record));
  return true;
}
