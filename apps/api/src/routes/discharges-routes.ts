/**
 * Discharges route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { DischargesService } from '@cvg-his-v2/module-discharges';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { CreateDischargeRequest, UpdateDischargeRequest } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';

export interface DischargesHandlers {
  discharges: DischargesService;
  encounters?: EncountersService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

/**
 * Handle all discharges-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleDischargesRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: DischargesHandlers
): Promise<boolean> {
  const { discharges, encounters, audit, requirePrincipal } = handlers;

  // GET /discharges — list all discharges for account
  if (pathname === '/discharges' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'encounters.read');
    const items = await discharges.list(principal.user.accountId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'list',
      entityType: 'discharge',
      entityId: '*',
      payloadSummary: 'Discharges listed',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items, total: items.length }));
    return true;
  }

  // POST /discharges — create a new discharge
  if (pathname === '/discharges' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const payload = (await readJsonBody(request)) as CreateDischargeRequest;
    validateRequestBody(
      payload as unknown as Record<string, unknown>,
      {
        encounterId: { type: 'string', required: true, minLength: 1 },
        dischargeType: {
          type: 'string',
          required: true,
          enum: ['ambulatory', 'inpatient', 'transfer', 'death']
        }
      },
      correlationId
    );
    encounters?.getForAccountOrThrow(
      principal.user.accountId as never,
      payload.encounterId as never
    );
    const discharge = await discharges.create(
      principal.user.accountId as never,
      principal.user.id as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'create',
      entityType: 'discharge',
      entityId: discharge.id,
      payloadSummary: `Discharge created for encounter ${payload.encounterId}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(discharge));
    return true;
  }

  // GET /discharges/:dischargeId — get discharge by ID
  if (pathname.startsWith('/discharges/') && request.method === 'GET' && !pathname.includes('?')) {
    const principal = requirePrincipal(request, 'encounters.read');
    const dischargeId = requireNonEmptyString(pathname.split('/')[2], 'dischargeId');
    const discharge = await discharges.getById(
      dischargeId as never,
      principal.user.accountId as never
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'read',
      entityType: 'discharge',
      entityId: discharge.id,
      payloadSummary: 'Discharge detail consulted',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(discharge));
    return true;
  }

  // PATCH /discharges/:dischargeId — update a discharge
  if (pathname.startsWith('/discharges/') && request.method === 'PATCH') {
    const principal = requirePrincipal(request, 'encounters.manage');
    const dischargeId = requireNonEmptyString(pathname.split('/')[2], 'dischargeId');
    const body = await readJsonBody(request);
    const { expectedVersion, ...payload } = body as UpdateDischargeRequest & {
      expectedVersion?: number;
    };
    const discharge = await discharges.update(
      dischargeId as never,
      payload,
      expectedVersion,
      principal.user.accountId as never
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'discharges',
      action: 'update',
      entityType: 'discharge',
      entityId: discharge.id,
      payloadSummary: 'Discharge updated',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(discharge));
    return true;
  }

  return false;
}
