import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { TriageService } from '@cvg-his-v2/module-triage';
import type { CreateTriageRequest, UpdateTriageRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

type EncounterStatus = 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';

export interface TriageRoutesHandlers {
  triage: TriageService;
  encounters: EncountersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  syncQueueWithEncounter: (encounterId: string, status: EncounterStatus) => Promise<void>;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export async function handleTriageRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: TriageRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/triage')) {
    return false;
  }

  const { triage, encounters, audit, requirePrincipal, syncQueueWithEncounter } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/triage' && method === 'GET') {
    const principal = requirePrincipal(request, 'triage.read');
    const encounterId = url.searchParams.get('encounterId') ?? undefined;
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'triage',
      action: 'list',
      entityType: 'triage-record',
      entityId: encounterId ?? 'all',
      payloadSummary: 'Triage records listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: triage.listByAccount(principal.user.accountId as never, encounterId as never)
    });
  }

  if (pathname === '/triage' && method === 'POST') {
    const principal = requirePrincipal(request, 'triage.manage');
    const payload = (await readJsonBody(request)) as CreateTriageRequest;
    const encounterId = requireNonEmptyString(payload.encounterId, 'encounterId');
    const currentEncounter = encounters.getOrThrow(encounterId as never);
    if (currentEncounter.accountId !== principal.user.accountId) {
      throw new NotFoundError('Encounter not found', { encounterId });
    }
    if (currentEncounter.status === 'reception') {
      encounters.transitionEncounter(currentEncounter.id, principal.user.id, {
        nextStatus: 'in_triage'
      });
      await syncQueueWithEncounter(currentEncounter.id, 'in_triage');
    }
    const record = await triage.createTriage(
      principal.user.id,
      payload,
      principal.user.accountId as never
    );
    encounters.appendTimeline(record.encounterId, {
      accountId: record.accountId,
      eventType: 'triage_recorded',
      summary: `Initial triage recorded with priority ${record.priority}`,
      actorUserId: principal.user.id
    });
    const encounter = encounters.transitionEncounter(record.encounterId, principal.user.id, {
      nextStatus: record.destination
    });
    await syncQueueWithEncounter(encounter.id, encounter.status);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'triage',
      action: 'create',
      entityType: 'triage-record',
      entityId: record.id,
      payloadSummary: `Initial triage recorded for encounter ${record.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, record);
  }

  if (pathname.endsWith('/history') && method === 'GET') {
    const principal = requirePrincipal(request, 'triage.read');
    const triageId = requireNonEmptyString(pathname.split('/')[2], 'triageId');
    const record = triage.getForAccountOrThrow(
      principal.user.accountId as never,
      triageId as never
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'triage',
      action: 'read_history',
      entityType: 'triage-record-version',
      entityId: record.id,
      payloadSummary: `Triage history inspected for encounter ${record.encounterId}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, { items: triage.listVersions(triageId as never) });
  }

  if (method === 'PATCH') {
    const principal = requirePrincipal(request, 'triage.manage');
    const triageId = requireNonEmptyString(pathname.split('/')[2], 'triageId');
    const payload = (await readJsonBody(request)) as UpdateTriageRequest;
    const before = triage.getForAccountOrThrow(
      principal.user.accountId as never,
      triageId as never
    );
    const record = await triage.updateTriage(
      triageId as never,
      payload,
      principal.user.id,
      principal.user.accountId as never
    );
    encounters.appendTimeline(record.encounterId, {
      accountId: record.accountId,
      eventType: 'triage_recorded',
      summary: `Triage updated from ${before.priority}/${before.destination} to ${record.priority}/${record.destination}`,
      actorUserId: principal.user.id
    });
    const encounter = encounters.getOrThrow(record.encounterId);
    if (encounter.status !== 'closed' && encounter.status !== record.destination) {
      const transitioned = encounters.transitionEncounter(record.encounterId, principal.user.id, {
        nextStatus: record.destination
      });
      await syncQueueWithEncounter(transitioned.id, transitioned.status);
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'triage',
      action: 'update',
      entityType: 'triage-record',
      entityId: record.id,
      payloadSummary: `Triage updated for encounter ${record.encounterId}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, record);
  }

  return false;
}
