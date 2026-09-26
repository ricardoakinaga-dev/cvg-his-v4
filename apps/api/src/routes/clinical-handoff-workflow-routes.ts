import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ClinicalHandoffsService, EncountersService } from '@cvg-his-v2/module-encounters';
import type {
  MarkClinicalHandoffPendingRequest,
  ResolveClinicalHandoffPendingRequest,
  ReturnClinicalHandoffToClinicRequest,
  SendClinicalHandoffToFinanceRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal, CorrelationId } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { readJsonBody } from '../helpers/request-body.js';

export interface ClinicalHandoffWorkflowRouteHandlers {
  readonly clinicalHandoffs: Pick<
    ClinicalHandoffsService,
    'markPending' | 'resolvePending' | 'returnToClinic' | 'sendToFinance' | 'waitForPersistence'
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

export async function handleClinicalHandoffWorkflowRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: CorrelationId | string,
  handlers: ClinicalHandoffWorkflowRouteHandlers
): Promise<boolean> {
  const { clinicalHandoffs, encounters, requirePrincipal, appendAudit } = handlers;

  if (
    pathname.startsWith('/clinical-handoffs/') &&
    pathname.endsWith('/pending') &&
    request.method === 'POST'
  ) {
    const principal = await requirePrincipal(request, 'encounters.manage');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const payload = (await readJsonBody(request)) as MarkClinicalHandoffPendingRequest;
    const handoff = clinicalHandoffs.markPending(
      principal.user.accountId,
      principal.user.id,
      handoffId as never,
      payload
    );
    await Promise.all([clinicalHandoffs.waitForPersistence(), encounters.waitForPersistence()]);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'clinical-handoffs',
      'mark_pending',
      'clinical-handoff',
      handoff.id,
      `Clinical handoff pending issue marked for encounter ${handoff.encounterId}`,
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(handoff));
    return true;
  }

  if (
    pathname.startsWith('/clinical-handoffs/') &&
    pathname.includes('/pending/') &&
    pathname.endsWith('/resolve') &&
    request.method === 'POST'
  ) {
    const principal = await requirePrincipal(request, 'encounters.manage');
    const [, , handoffId, , issueId] = pathname.split('/');
    const payload = (await readJsonBody(request)) as ResolveClinicalHandoffPendingRequest;
    const handoff = clinicalHandoffs.resolvePending(
      principal.user.accountId,
      principal.user.id,
      requireNonEmptyString(handoffId, 'handoffId') as never,
      requireNonEmptyString(issueId, 'issueId') as never,
      payload
    );
    await Promise.all([clinicalHandoffs.waitForPersistence(), encounters.waitForPersistence()]);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'clinical-handoffs',
      'resolve_pending',
      'clinical-handoff',
      handoff.id,
      `Clinical handoff pending issue resolved for encounter ${handoff.encounterId}`,
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(handoff));
    return true;
  }

  if (
    pathname.startsWith('/clinical-handoffs/') &&
    pathname.endsWith('/return-to-clinic') &&
    request.method === 'POST'
  ) {
    const principal = await requirePrincipal(request, 'encounters.manage');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const payload = (await readJsonBody(request)) as ReturnClinicalHandoffToClinicRequest;
    const handoff = clinicalHandoffs.returnToClinic(
      principal.user.accountId,
      principal.user.id,
      handoffId as never,
      payload
    );
    await Promise.all([clinicalHandoffs.waitForPersistence(), encounters.waitForPersistence()]);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'clinical-handoffs',
      'return_to_clinic',
      'clinical-handoff',
      handoff.id,
      `Clinical handoff returned to clinic for encounter ${handoff.encounterId}`,
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(handoff));
    return true;
  }

  if (
    pathname.startsWith('/clinical-handoffs/') &&
    pathname.endsWith('/send-to-finance') &&
    request.method === 'POST'
  ) {
    const principal = await requirePrincipal(request, 'encounters.manage');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const payload = (await readJsonBody(request).catch(
      () => ({}) as SendClinicalHandoffToFinanceRequest
    )) as SendClinicalHandoffToFinanceRequest;
    const handoff = clinicalHandoffs.sendToFinance(
      principal.user.accountId,
      principal.user.id,
      handoffId as never,
      payload
    );
    await Promise.all([clinicalHandoffs.waitForPersistence(), encounters.waitForPersistence()]);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'clinical-handoffs',
      'send_to_finance',
      'clinical-handoff',
      handoff.id,
      `Clinical handoff sent to finance for encounter ${handoff.encounterId}`,
      'high',
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify(handoff));
    return true;
  }

  return false;
}
