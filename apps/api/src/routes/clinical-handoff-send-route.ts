import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ClinicalHandoffsService, EncountersService } from '@cvg-his-v2/module-encounters';
import type { SendClinicalHandoffRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal, CorrelationId } from '@cvg-his-v2/shared-types';
import { readJsonBody } from '../helpers/request-body.js';

export interface ClinicalHandoffSendRouteHandlers {
  readonly clinicalHandoffs: Pick<
    ClinicalHandoffsService,
    'sendToReception' | 'waitForPersistence'
  >;
  readonly encounters: Pick<EncountersService, 'waitForPersistence'>;
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

export async function handleClinicalHandoffSendRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: ClinicalHandoffSendRouteHandlers
): Promise<boolean> {
  if (pathname !== '/clinical-handoffs/send-to-reception' || request.method !== 'POST') {
    return false;
  }

  const principal = await handlers.requirePrincipal(request, 'encounters.manage');
  const payload = (await readJsonBody(request)) as SendClinicalHandoffRequest;
  const handoff = handlers.clinicalHandoffs.sendToReception(
    principal.user.accountId,
    principal.user.id,
    payload
  );
  await Promise.all([
    handlers.clinicalHandoffs.waitForPersistence(),
    handlers.encounters.waitForPersistence()
  ]);
  handlers.appendAudit(
    principal.user.id,
    principal.user.accountId,
    'clinical-handoffs',
    'send_to_reception',
    'clinical-handoff',
    handoff.id,
    `Clinical handoff sent to reception for encounter ${handoff.encounterId}`,
    'high',
    correlationId
  );
  response.statusCode = 201;
  response.end(JSON.stringify(handoff));
  return true;
}
