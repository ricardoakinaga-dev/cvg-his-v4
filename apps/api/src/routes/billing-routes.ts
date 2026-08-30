/**
 * Billing route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type {
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  UpdateBillingStatusRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { requireEnum, requireOptionalString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

function manualSettlementDisabledResponse(correlationId: string) {
  return {
    code: 'MANUAL_SETTLEMENT_DISABLED',
    message:
      'Manual settlement is disabled. Record the receipt through the cash-receipts endpoint.',
    details: { receiptPath: '/encounters/:id/cash-receipts' },
    correlationId
  } as const;
}

function settlementIrreversibleResponse(correlationId: string, receiptPath: string) {
  return {
    code: 'BILLING_SETTLEMENT_IRREVERSIBLE',
    message: 'A settled billing record requires an explicit financial reversal',
    details: { receiptPath },
    correlationId
  } as const;
}

export interface BillingRoutesHandlers {
  billing: BillingService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  enforceAbac: (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    attrs: ResourceAttributes,
    request: IncomingMessage
  ) => void;
}

/**
 * Handle all billing-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleBillingRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: BillingRoutesHandlers
): Promise<boolean> {
  const { billing, audit, requirePrincipal, enforceAbac } = handlers;

  // GET /billing — list billing records (optionally filtered by encounter/patient/owner)
  if (pathname === '/billing' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const filters = {
      accountId: principal.user.accountId,
      encounterId: url.searchParams.get('encounterId') || undefined,
      patientId: url.searchParams.get('patientId') || undefined,
      ownerId: url.searchParams.get('ownerId') || undefined
    };
    const items = await billing.listAuthoritative(filters);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list',
      entityType: 'billing-record',
      entityId: filters.encounterId || filters.patientId || filters.ownerId || 'all',
      payloadSummary: filters.encounterId
        ? `Billing record for encounter ${filters.encounterId}`
        : 'Billing records listed',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // GET /billing/:encounterId/items — list billing items for an encounter
  if (pathname.startsWith('/billing/') && pathname.endsWith('/items') && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'billing.read');
    const encounterId = pathname.split('/')[2];
    const items = await billing.listItems(principal.user.accountId, encounterId as never);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'list_items',
      entityType: 'billing-item',
      entityId: encounterId,
      payloadSummary: `Billing items listed for encounter ${encounterId}`,
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items }));
    return true;
  }

  // GET /billing/:encounterId — get billing record for an encounter
  if (
    pathname.startsWith('/billing/') &&
    !pathname.endsWith('/items') &&
    !pathname.endsWith('/status') &&
    request.method === 'GET'
  ) {
    const principal = await requirePrincipal(request, 'billing.read');
    const encounterId = pathname.split('/')[2];
    const record = await billing.findByEncounter(principal.user.accountId, encounterId as never);
    if (!record) {
      response.statusCode = 404;
      response.end(
        JSON.stringify({
          error: 'Billing record not found',
          code: 'BILLING_RECORD_NOT_FOUND',
          encounterId
        })
      );
      return true;
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'get',
      entityType: 'billing-record',
      entityId: record.id,
      payloadSummary: `Billing record retrieved for encounter ${encounterId}`,
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(record));
    return true;
  }

  // POST /billing/estimate — create a billing estimate
  if (pathname === '/billing/estimate' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const payload = (await readJsonBody(request)) as CreateBillingEstimateRequest;
    enforceAbac(
      'billing.manage',
      principal,
      {
        resourceType: 'billing_record',
        resourceId: payload.encounterId,
        encounterId: payload.encounterId as never,
        accountId: principal.user.accountId as never,
        status: 'estimated'
      },
      request
    );
    const record = await billing.createEstimate(principal.user.accountId, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'create_estimate',
      entityType: 'billing-record',
      entityId: record.id,
      payloadSummary: `Billing estimate created for encounter ${payload.encounterId}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(record));
    return true;
  }

  // POST /billing/items — add a billing item
  if (pathname === '/billing/items' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'billing.manage');
    const payload = (await readJsonBody(request)) as CreateBillingItemRequest;
    enforceAbac(
      'billing.manage',
      principal,
      {
        resourceType: 'billing_item',
        resourceId: payload.encounterId,
        encounterId: payload.encounterId as never,
        accountId: principal.user.accountId as never,
        createdByUserId: principal.user.id as never,
        status: 'draft'
      },
      request
    );
    const item = await billing.addItem(
      principal.user.accountId,
      principal.user.id as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'add_item',
      entityType: 'billing-item',
      entityId: item.id,
      payloadSummary: `Billing item added for encounter ${payload.encounterId}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(item));
    return true;
  }

  // PATCH /billing/:encounterId/status — update billing record status
  if (
    pathname.startsWith('/billing/') &&
    pathname.endsWith('/status') &&
    request.method === 'PATCH'
  ) {
    const principal = await requirePrincipal(request, 'billing.manage');
    const encounterId = pathname.split('/')[2];
    const rawPayload = await readJsonBody(request);
    if (typeof rawPayload !== 'object' || rawPayload === null || Array.isArray(rawPayload)) {
      throw new ValidationError('Billing status request must be a JSON object');
    }
    const payloadObject = rawPayload as Record<string, unknown>;
    const allowedFields = new Set(['status', 'administrativeNotes']);
    const unexpectedField = Object.keys(payloadObject).find((field) => !allowedFields.has(field));
    if (unexpectedField) throw new ValidationError(`Unknown field '${unexpectedField}'`);
    const payload = {
      status: requireEnum(payloadObject.status, 'status', [
        'draft',
        'estimated',
        'open',
        'settled'
      ]),
      administrativeNotes: requireOptionalString(payloadObject.administrativeNotes)
    } satisfies UpdateBillingStatusRequest;
    if (payload.status === 'settled') {
      response.statusCode = 409;
      response.end(JSON.stringify(manualSettlementDisabledResponse(correlationId)));
      return true;
    }
    enforceAbac(
      'billing.manage',
      principal,
      {
        resourceType: 'billing_record',
        resourceId: encounterId,
        encounterId: encounterId as never,
        accountId: principal.user.accountId as never,
        status: payload.status
      },
      request
    );
    const existingRecord = await billing.findByEncounter(
      principal.user.accountId,
      encounterId as never
    );
    if (!existingRecord) {
      response.statusCode = 404;
      response.end(
        JSON.stringify({
          error: 'Billing record not found',
          code: 'BILLING_RECORD_NOT_FOUND',
          encounterId
        })
      );
      return true;
    }
    if (existingRecord.status === 'settled') {
      response.statusCode = 409;
      response.end(
        JSON.stringify(
          settlementIrreversibleResponse(correlationId, `/encounters/${encounterId}/cash-receipts`)
        )
      );
      return true;
    }
    const record = await billing.updateStatus(
      principal.user.accountId,
      encounterId as never,
      payload
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'billing',
      action: 'update_status',
      entityType: 'billing-record',
      entityId: record.id,
      payloadSummary: `Billing status updated for encounter ${encounterId} to ${payload.status}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(record));
    return true;
  }

  return false;
}
