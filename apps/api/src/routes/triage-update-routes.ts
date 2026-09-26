import type { IncomingMessage, ServerResponse } from 'node:http';

import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { TriageService } from '@cvg-his-v2/module-triage';
import type { UpdateTriageRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import type { createEncounterQueueSynchronizer } from '../helpers/api-server-boundaries.js';
import { readJsonBody } from '../helpers/request-body.js';

export interface TriageUpdateRouteHandlers {
  readonly triage: Pick<TriageService, 'getOrThrow' | 'updateTriage'>;
  readonly encounters: Pick<
    EncountersService,
    'appendTimeline' | 'fetchOrThrow' | 'getOrThrow' | 'transitionEncounter' | 'waitForPersistence'
  >;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => Promise<AuthenticatedPrincipal>;
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

export async function handleTriageUpdateRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: TriageUpdateRouteHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/triage/') || request.method !== 'PATCH') {
    return false;
  }

  const { triage, encounters, requirePrincipal, syncQueueWithEncounter, appendAudit } = handlers;
  const principal = await requirePrincipal(request, 'triage.manage');
  const triageId = requireNonEmptyString(pathname.split('/')[2], 'triageId');
  const payload = (await readJsonBody(request)) as UpdateTriageRequest;
  const before = triage.getOrThrow(triageId as never, principal.user.accountId as never);
  const record = await triage.updateTriage(
    triageId as never,
    payload,
    principal.user.accountId as never,
    principal.user.id
  );
  encounters.appendTimeline(principal.user.accountId, record.encounterId, {
    accountId: record.accountId,
    eventType: 'triage_recorded',
    summary: `Triage updated from ${before.priority}/${before.destination} to ${record.priority}/${record.destination}`,
    actorUserId: principal.user.id
  });
  const encounter = await encounters.fetchOrThrow(principal.user.accountId, record.encounterId);
  if (encounter.status !== 'closed' && encounter.status !== record.destination) {
    const transitioned = encounters.transitionEncounter(
      principal.user.accountId,
      record.encounterId,
      principal.user.id,
      {
        nextStatus: record.destination
      }
    );
    await syncQueueWithEncounter(principal.user.accountId, transitioned.id, transitioned.status);
  }
  await encounters.waitForPersistence();
  appendAudit(
    principal.user.id,
    principal.user.accountId,
    'triage',
    'update',
    'triage-record',
    record.id,
    `Triage updated for encounter ${record.encounterId}`,
    'medium',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify(record));
  return true;
}
