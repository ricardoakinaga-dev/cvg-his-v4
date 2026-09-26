import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ClinicalHandoffsService, EncountersService } from '@cvg-his-v2/module-encounters';
import type { AcknowledgeClinicalHandoffRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal, CorrelationId } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { readJsonBody } from '../helpers/request-body.js';

export interface ClinicalHandoffAcknowledgeRouteHandlers {
  readonly clinicalHandoffs: Pick<ClinicalHandoffsService, 'acknowledge' | 'waitForPersistence'>;
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

export async function handleClinicalHandoffAcknowledgeRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: ClinicalHandoffAcknowledgeRouteHandlers
): Promise<boolean> {
  if (
    !pathname.startsWith('/clinical-handoffs/') ||
    !pathname.endsWith('/acknowledge') ||
    request.method !== 'POST'
  ) {
    return false;
  }

  const principal = await handlers.requirePrincipal(request, 'encounters.manage');
  const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
  const payload = (await readJsonBody(request).catch(
    () => ({}) as AcknowledgeClinicalHandoffRequest
  )) as AcknowledgeClinicalHandoffRequest;
  const handoff = handlers.clinicalHandoffs.acknowledge(
    principal.user.accountId,
    principal.user.id,
    handoffId as never,
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
    'acknowledge',
    'clinical-handoff',
    handoff.id,
    `Clinical handoff acknowledged for encounter ${handoff.encounterId}`,
    'high',
    correlationId
  );
  response.statusCode = 200;
  response.end(JSON.stringify(handoff));
  return true;
}
