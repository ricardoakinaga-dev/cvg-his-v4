import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { DiagnosticsService } from '@cvg-his-v2/module-diagnostics';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { EncounterFinancialService } from '@cvg-his-v2/module-financial';
import type { SchedulingService } from '@cvg-his-v2/module-scheduling';
import type {
  CloseEncounterRequest,
  CreateEncounterRequest,
  TransitionEncounterRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

type EncounterStatus = 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';

export interface EncountersRoutesHandlers {
  encounters: EncountersService;
  scheduling: SchedulingService;
  diagnostics: DiagnosticsService;
  billing: BillingService;
  encounterFinancial: EncounterFinancialService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal;
  syncQueueWithEncounter: (encounterId: string, status: EncounterStatus) => Promise<void>;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
  return true;
}

export async function handleEncountersRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: EncountersRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/encounters')) {
    return false;
  }

  const {
    encounters,
    scheduling,
    diagnostics,
    billing,
    encounterFinancial,
    audit,
    requirePrincipal,
    syncQueueWithEncounter
  } = handlers;
  const method = request.method ?? 'GET';

  if (pathname === '/encounters' && method === 'GET') {
    const principal = requirePrincipal(request, 'encounters.read');
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'list',
      entityType: 'encounter',
      entityId: 'all',
      payloadSummary: 'Encounters listed',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: encounters.listByAccount(principal.user.accountId as never)
    });
  }

  if (pathname === '/encounters' && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const payload = (await readJsonBody(request)) as CreateEncounterRequest;
    const encounter = encounters.openEncounter(
      principal.user.accountId,
      principal.user.id,
      payload
    );
    if (encounter.queueEntryId) {
      const queueEntry = await scheduling.attachEncounter(encounter.queueEntryId, encounter.id);
      encounters.appendTimeline(encounter.id, {
        accountId: encounter.accountId,
        eventType: 'queue_checked_in',
        summary: `Patient checked in with priority ${queueEntry.priority}`,
        actorUserId: principal.user.id
      });
      if (queueEntry.calledAt) {
        encounters.appendTimeline(encounter.id, {
          accountId: encounter.accountId,
          eventType: 'queue_called',
          summary: 'Queue entry had already been called',
          actorUserId: principal.user.id
        });
      }
    }
    await encounters.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'open',
      entityType: 'encounter',
      entityId: encounter.id,
      payloadSummary: `Encounter opened for patient ${encounter.patientId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 201, encounter);
  }

  if (pathname.endsWith('/timeline') && method === 'GET') {
    const principal = requirePrincipal(request, 'encounters.read');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    encounters.getForAccountOrThrow(principal.user.accountId as never, encounterId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'read_timeline',
      entityType: 'encounter-timeline',
      entityId: encounterId,
      payloadSummary: 'Encounter timeline inspected',
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, {
      items: await encounters.listTimelineAsync(encounterId as never)
    });
  }

  if (pathname.endsWith('/transition') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    encounters.getForAccountOrThrow(principal.user.accountId as never, encounterId as never);
    const payload = (await readJsonBody(request)) as TransitionEncounterRequest;
    const encounter = encounters.transitionEncounter(
      encounterId as never,
      principal.user.id,
      payload
    );
    await syncQueueWithEncounter(encounter.id, encounter.status);
    await encounters.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'transition',
      entityType: 'encounter',
      entityId: encounter.id,
      payloadSummary: `Encounter transitioned to ${encounter.status}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, encounter);
  }

  if (pathname.endsWith('/close') && method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    encounters.getForAccountOrThrow(principal.user.accountId as never, encounterId as never);
    const payload = (await readJsonBody(request)) as CloseEncounterRequest;
    const encounter = encounters.closeEncounter(encounterId as never, principal.user.id, payload);
    await syncQueueWithEncounter(encounter.id, encounter.status);
    await encounters.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'close',
      entityType: 'encounter',
      entityId: encounter.id,
      payloadSummary: `Encounter closed: ${encounter.closeReason}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, encounter);
  }

  if (method === 'GET') {
    const principal = requirePrincipal(request, 'encounters.read');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    const encounter = encounters.getForAccountOrThrow(
      principal.user.accountId as never,
      encounterId as never
    );

    if (pathname.endsWith('/summary')) {
      const timeline = await encounters.listTimelineAsync(encounterId as never);
      const orders = diagnostics.list(encounterId as never);
      const billingRecord = await billing.findByEncounter(
        encounterId as never,
        principal.user.accountId as never
      );
      const financial = billingRecord
        ? await encounterFinancial.getSummary(
            encounterId as never,
            principal.user.accountId as never
          )
        : null;
      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'encounters',
        action: 'read_summary',
        entityType: 'encounter',
        entityId: encounter.id,
        payloadSummary: `Encounter ${encounter.id} summary inspected`,
        riskLevel: 'medium',
        correlationId
      });
      return json(response, 200, {
        encounter,
        timeline,
        diagnostics: {
          totalOrders: orders.length,
          pendingOrders: orders.filter((order) => order.status !== 'resulted').length,
          releasedResults: orders.filter((order) => order.status === 'resulted').length,
          latestOrders: orders.slice(0, 5)
        },
        financial
      });
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'read',
      entityType: 'encounter',
      entityId: encounter.id,
      payloadSummary: `Encounter ${encounter.id} inspected`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, encounter);
  }

  if (method === 'DELETE') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const encounterId = requireNonEmptyString(pathname.split('/')[2], 'encounterId');
    encounters.getForAccountOrThrow(principal.user.accountId as never, encounterId as never);
    encounters.deleteEncounter(encounterId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'encounters',
      action: 'delete',
      entityType: 'encounter',
      entityId: encounterId,
      payloadSummary: `Encounter ${encounterId} deleted`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
