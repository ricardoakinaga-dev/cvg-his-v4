/**
 * LGPD route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LgpdService } from '@cvg-his-v2/module-lgpd';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface LgpdRoutesHandlers {
  lgpd: LgpdService | undefined;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

/**
 * Handle all LGPD-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handleLgpdRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: LgpdRoutesHandlers
): Promise<boolean> {
  const { lgpd, audit, requirePrincipal } = handlers;

  // POST /lgpd/consent — grant consent
  if (pathname === '/lgpd/consent' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'lgpd.consent.manage');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const payload = (await readJsonBody(request)) as {
      subjectId: string;
      subjectType: 'owner' | 'patient' | 'user';
      purpose: string;
      origin?: string;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
    };
    const record = await lgpdSvc.grantConsent({
      accountId: principal.user.accountId,
      subjectId: payload.subjectId,
      subjectType: payload.subjectType,
      purpose: payload.purpose as never,
      origin: payload.origin as never,
      grantedBy: principal.user.id,
      expiresAt: payload.expiresAt,
      metadata: payload.metadata
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'lgpd',
      action: 'consent_granted',
      entityType: 'consent',
      entityId: record.id,
      payloadSummary: `Consent granted for ${payload.purpose}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(record));
    return true;
  }

  // POST /lgpd/consent/revoke — revoke consent
  if (pathname === '/lgpd/consent/revoke' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'lgpd.consent.manage');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const payload = (await readJsonBody(request)) as {
      subjectId: string;
      subjectType: 'owner' | 'patient' | 'user';
      purpose: string;
    };
    const record = await lgpdSvc.revokeConsent({
      accountId: principal.user.accountId,
      subjectId: payload.subjectId,
      subjectType: payload.subjectType,
      purpose: payload.purpose as never,
      revokedBy: principal.user.id
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'lgpd',
      action: 'consent_revoked',
      entityType: 'consent',
      entityId: record.id,
      payloadSummary: `Consent revoked for ${payload.purpose}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(record));
    return true;
  }

  // GET /lgpd/consent — list consents
  if (pathname === '/lgpd/consent' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'lgpd.consent.read');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 200;
      response.end(JSON.stringify({ consents: [] }));
      return true;
    }
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const subjectId = url.searchParams.get('subjectId');
    const subjectType = url.searchParams.get('subjectType') as
      | 'owner'
      | 'patient'
      | 'user'
      | null;
    const activeOnly = url.searchParams.get('activeOnly') === 'true';

    if (!subjectId || !subjectType) {
      response.statusCode = 400;
      response.end(
        JSON.stringify({
          code: 'BAD_REQUEST',
          message: 'subjectId and subjectType are required'
        })
      );
      return true;
    }

    const consents = activeOnly
      ? await lgpdSvc.getActiveCons(principal.user.accountId, subjectId, subjectType)
      : await lgpdSvc.getConsents(principal.user.accountId, subjectId, subjectType);
    response.statusCode = 200;
    response.end(JSON.stringify({ consents }));
    return true;
  }

  // GET /lgpd/consent/status — consent status by purpose
  if (pathname === '/lgpd/consent/status' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'lgpd.consent.read');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 200;
      response.end(JSON.stringify({ active: {} }));
      return true;
    }
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const subjectId = url.searchParams.get('subjectId');
    const subjectType = url.searchParams.get('subjectType') as
      | 'owner'
      | 'patient'
      | 'user'
      | null;

    if (!subjectId || !subjectType) {
      response.statusCode = 400;
      response.end(
        JSON.stringify({
          code: 'BAD_REQUEST',
          message: 'subjectId and subjectType are required'
        })
      );
      return true;
    }

    const purposes: readonly string[] = [
      'marketing',
      'analytics',
      'clinical',
      'financial',
      'operational',
      'notifications'
    ];
    const active: Record<string, boolean> = {};
    for (const purpose of purposes) {
      active[purpose] = await lgpdSvc.isConsentActive(
        principal.user.accountId,
        subjectId,
        subjectType,
        purpose as never
      );
    }
    response.statusCode = 200;
    response.end(JSON.stringify({ subjectId, subjectType, active }));
    return true;
  }

  // POST /lgpd/requests — create DSR
  if (pathname === '/lgpd/requests' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'lgpd.requests.manage');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const payload = (await readJsonBody(request)) as {
      subjectId: string;
      subjectType: 'owner' | 'patient' | 'user';
      requestType: string;
      notes?: string;
    };
    const dsrRequest = await lgpdSvc.createDsrRequest({
      accountId: principal.user.accountId,
      subjectId: payload.subjectId,
      subjectType: payload.subjectType,
      requestType: payload.requestType as never,
      requestedBy: principal.user.id,
      notes: payload.notes
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'lgpd',
      action: 'dsr_created',
      entityType: 'data_subject_request',
      entityId: dsrRequest.id,
      payloadSummary: `DSR created: ${payload.requestType}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(dsrRequest));
    return true;
  }

  // GET /lgpd/requests — list DSRs
  if (pathname === '/lgpd/requests' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'lgpd.requests.read');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 200;
      response.end(JSON.stringify({ requests: [] }));
      return true;
    }
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const subjectId = url.searchParams.get('subjectId');
    const subjectType = url.searchParams.get('subjectType') as
      | 'owner'
      | 'patient'
      | 'user'
      | null;
    const status = url.searchParams.get('status');

    if (subjectId && subjectType) {
      const requests = await lgpdSvc.getDsrRequestsBySubject(
        principal.user.accountId,
        subjectId,
        subjectType
      );
      response.statusCode = 200;
      response.end(JSON.stringify({ requests }));
      return true;
    }

    if (status) {
      const requests = await lgpdSvc.getDsrRequestsByStatus(
        principal.user.accountId,
        status as never
      );
      response.statusCode = 200;
      response.end(JSON.stringify({ requests }));
      return true;
    }

    const requests = await lgpdSvc.getDsrRequests(principal.user.accountId);
    response.statusCode = 200;
    response.end(JSON.stringify({ requests }));
    return true;
  }

  // POST /lgpd/requests/complete — complete DSR
  if (pathname === '/lgpd/requests/complete' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'lgpd.requests.manage');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const payload = (await readJsonBody(request)) as {
      requestId: string;
      resultJson?: Record<string, unknown>;
    };
    const dsrRequest = await lgpdSvc.completeDsrRequest(
      principal.user.accountId,
      payload.requestId,
      principal.user.id,
      payload.resultJson
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'lgpd',
      action: 'dsr_completed',
      entityType: 'data_subject_request',
      entityId: dsrRequest.id,
      payloadSummary: `DSR completed: ${dsrRequest.requestType}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(dsrRequest));
    return true;
  }

  // POST /lgpd/requests/reject — reject DSR
  if (pathname === '/lgpd/requests/reject' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'lgpd.requests.manage');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const payload = (await readJsonBody(request)) as {
      requestId: string;
      reason: string;
      rejectionReason?: string;
    };
    const dsrRequest = await lgpdSvc.rejectDsrRequest(
      principal.user.accountId,
      payload.requestId,
      principal.user.id,
      payload.reason ?? payload.rejectionReason ?? 'Solicitacao rejeitada pelo operador'
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'lgpd',
      action: 'dsr_rejected',
      entityType: 'data_subject_request',
      entityId: dsrRequest.id,
      payloadSummary: `DSR rejected: ${dsrRequest.requestType}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(dsrRequest));
    return true;
  }

  // POST /lgpd/export — build personal data export
  if (pathname === '/lgpd/export' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'lgpd.requests.manage');
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const payload = (await readJsonBody(request)) as {
      subjectId: string;
      subjectType: 'owner' | 'patient' | 'user';
      dataProviders?: Record<string, unknown>;
    };

    const exportData = await lgpdSvc.buildPersonalDataExport(
      principal.user.accountId,
      payload.subjectId,
      payload.subjectType
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'lgpd',
      action: 'personal_data_exported',
      entityType: payload.subjectType,
      entityId: payload.subjectId,
      payloadSummary: `Personal data export generated for ${payload.subjectType}`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 200;
    response.end(JSON.stringify(exportData));
    return true;
  }

  return false;
}
