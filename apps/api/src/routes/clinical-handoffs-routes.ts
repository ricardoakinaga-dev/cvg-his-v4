import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  ClinicalHandoffsService,
  EncountersService
} from '@cvg-his-v2/module-encounters';
import type {
  AcknowledgeClinicalHandoffRequest,
  MarkClinicalHandoffPendingRequest,
  ResolveClinicalHandoffPendingRequest,
  ReturnClinicalHandoffToClinicRequest,
  SendClinicalHandoffRequest,
  SendClinicalHandoffToFinanceRequest
} from '@cvg-his-v2/shared-contracts';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AuthenticatedPrincipal,
  ClinicalHandoffPriority,
  ClinicalHandoffStatus
} from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface ClinicalHandoffsRoutesHandlers {
  clinicalHandoffs: ClinicalHandoffsService;
  encounters: EncountersService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal;
}

const validStatuses = new Set<ClinicalHandoffStatus>([
  'ready_to_send',
  'sent_to_reception',
  'acknowledged_by_reception',
  'waiting_pending_resolution',
  'returned_to_clinic',
  'sent_to_finance'
]);

const validPriorities = new Set<ClinicalHandoffPriority>([
  'low',
  'medium',
  'high',
  'critical'
]);

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

async function waitForPersistence(
  clinicalHandoffs: ClinicalHandoffsService,
  encounters: EncountersService
): Promise<void> {
  await Promise.all([
    clinicalHandoffs.waitForPersistence(),
    encounters.waitForPersistence()
  ]);
}

export async function handleClinicalHandoffsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: ClinicalHandoffsRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/clinical-handoffs')) {
    return false;
  }

  const { clinicalHandoffs, encounters, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/clinical-handoffs' && method === 'GET') {
    const principal = requirePrincipal(request, 'encounters.read');
    const status = url.searchParams.get('handoffStatus') ?? url.searchParams.get('status');
    const priority = url.searchParams.get('priority');

    if (status && !validStatuses.has(status as ClinicalHandoffStatus)) {
      throw new ValidationError('Invalid clinical handoff status filter', { status });
    }
    if (priority && !validPriorities.has(priority as ClinicalHandoffPriority)) {
      throw new ValidationError('Invalid clinical handoff priority filter', { priority });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'list',
      entityType: 'clinical-handoff',
      entityId: 'all',
      payloadSummary: 'Clinical handoffs listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: clinicalHandoffs.list(principal.user.accountId, {
        handoffStatus: status ? (status as ClinicalHandoffStatus) : undefined,
        encounterId: (url.searchParams.get('encounterId') ?? undefined) as never,
        ownerId: (url.searchParams.get('ownerId') ?? undefined) as never,
        patientId: (url.searchParams.get('patientId') ?? undefined) as never,
        priority: priority ? (priority as ClinicalHandoffPriority) : undefined
      })
    });
  }

  if (pathname === '/clinical-handoffs/send-to-reception' && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const payload = (await readJsonBody(request)) as SendClinicalHandoffRequest;
    const handoff = clinicalHandoffs.sendToReception(
      principal.user.accountId,
      principal.user.id,
      payload
    );
    await waitForPersistence(clinicalHandoffs, encounters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'send_to_reception',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff sent to reception for encounter ${handoff.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, handoff);
  }

  if (pathname.endsWith('/acknowledge') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const payload = (await readJsonBody(request).catch(
      () => ({}) as AcknowledgeClinicalHandoffRequest
    )) as AcknowledgeClinicalHandoffRequest;
    const handoff = clinicalHandoffs.acknowledge(
      principal.user.accountId,
      principal.user.id,
      handoffId as never,
      payload
    );
    await waitForPersistence(clinicalHandoffs, encounters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'acknowledge',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff acknowledged for encounter ${handoff.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, handoff);
  }

  if (pathname.endsWith('/pending') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const payload = (await readJsonBody(request)) as MarkClinicalHandoffPendingRequest;
    const handoff = clinicalHandoffs.markPending(
      principal.user.accountId,
      principal.user.id,
      handoffId as never,
      payload
    );
    await waitForPersistence(clinicalHandoffs, encounters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'mark_pending',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff pending issue marked for encounter ${handoff.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, handoff);
  }

  if (pathname.includes('/pending/') && pathname.endsWith('/resolve') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const [, , handoffId, , issueId] = pathname.split('/');
    const payload = (await readJsonBody(request)) as ResolveClinicalHandoffPendingRequest;
    const handoff = clinicalHandoffs.resolvePending(
      principal.user.accountId,
      principal.user.id,
      requireNonEmptyString(handoffId, 'handoffId') as never,
      requireNonEmptyString(issueId, 'issueId') as never,
      payload
    );
    await waitForPersistence(clinicalHandoffs, encounters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'resolve_pending',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff pending issue resolved for encounter ${handoff.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, handoff);
  }

  if (pathname.endsWith('/return-to-clinic') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const payload = (await readJsonBody(request)) as ReturnClinicalHandoffToClinicRequest;
    const handoff = clinicalHandoffs.returnToClinic(
      principal.user.accountId,
      principal.user.id,
      handoffId as never,
      payload
    );
    await waitForPersistence(clinicalHandoffs, encounters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'return_to_clinic',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff returned to clinic for encounter ${handoff.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, handoff);
  }

  if (pathname.endsWith('/send-to-finance') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
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
    await waitForPersistence(clinicalHandoffs, encounters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'send_to_finance',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff sent to finance for encounter ${handoff.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, handoff);
  }

  if (method === 'GET') {
    const principal = requirePrincipal(request, 'encounters.read');
    const handoffId = requireNonEmptyString(pathname.split('/')[2], 'handoffId');
    const handoff = clinicalHandoffs.getOrThrow(handoffId as never);
    if (handoff.accountId !== principal.user.accountId) {
      throw new NotFoundError('Clinical handoff not found', { handoffId });
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'clinical-handoffs',
      action: 'read',
      entityType: 'clinical-handoff',
      entityId: handoff.id,
      payloadSummary: `Clinical handoff ${handoff.id} inspected`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, handoff);
  }

  return false;
}
