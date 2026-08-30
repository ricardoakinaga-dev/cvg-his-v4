/**
 * LGPD route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LgpdService } from '@cvg-his-v2/module-lgpd';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { requireBoolean, requireEnum, requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit, appendAuditAndWait } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface LgpdRoutesHandlers {
  lgpd: LgpdService | undefined;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

const SUBJECT_TYPES = ['owner', 'patient', 'user'] as const;
const CONSENT_PURPOSES = [
  'marketing',
  'analytics',
  'clinical',
  'financial',
  'operational',
  'notifications'
] as const;
const CONSENT_ORIGINS = [
  'web_portal',
  'api',
  'mobile_app',
  'in_person',
  'phone',
  'email',
  'system_default'
] as const;
const DSR_TYPES = [
  'data_export',
  'data_deletion',
  'data_anonymization',
  'data_rectification',
  'data_access',
  'data_portability',
  'consent_revocation'
] as const;
const DSR_STATUSES = ['pending', 'in_progress', 'completed', 'rejected', 'cancelled'] as const;
const MAX_ID_LENGTH = 128;
const MAX_REASON_LENGTH = 2_000;
const LGPD_READ_PERMISSION = 'lgpd.requests.read';
const LGPD_MANAGE_PERMISSION = 'lgpd.requests.manage';

type SubjectType = (typeof SUBJECT_TYPES)[number];

function requireObjectPayload(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return payload as Record<string, unknown>;
}

function requireBoundedString(value: unknown, field: string, maxLength = MAX_ID_LENGTH): string {
  const resolved = requireNonEmptyString(value, field);
  if (resolved.length > maxLength) {
    throw new ValidationError(`Field ${field} must have at most ${maxLength} characters`);
  }
  return resolved;
}

function parseSubjectType(value: unknown): SubjectType {
  return requireEnum(value, 'subjectType', SUBJECT_TYPES);
}

function parseOptionalIsoDate(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  const resolved = requireNonEmptyString(value, field);
  const timestamp = Date.parse(resolved);
  if (!Number.isFinite(timestamp)) {
    throw new ValidationError(`Field ${field} must be a valid ISO date`);
  }
  return new Date(timestamp).toISOString();
}

function parseOptionalMetadata(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('Field metadata must be a JSON object');
  }
  return { ...(value as Record<string, unknown>) };
}

function parseBooleanQuery(value: string | null, field: string): boolean | undefined {
  if (value === null) return undefined;
  return requireBoolean(value === 'true' ? true : value === 'false' ? false : value, field);
}

/**
 * Provider implementations are independent modules.  Keep the HTTP boundary
 * fail-closed if a provider accidentally returns rows from another account.
 * Rows without an account marker remain compatible with legacy providers; the
 * authoritative consent/DSR repositories are still queried with accountId.
 */
function sanitizeTenantData(value: unknown, accountId: string): unknown {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const sanitized = sanitizeTenantData(item, accountId);
      return sanitized === undefined ? [] : [sanitized];
    });
  }

  if (value === null || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const markedAccountId =
    typeof record.accountId === 'string'
      ? record.accountId
      : typeof record.account_id === 'string'
        ? record.account_id
        : undefined;
  if (markedAccountId !== undefined && markedAccountId !== accountId) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(record)) {
    const safeChild = sanitizeTenantData(child, accountId);
    if (safeChild !== undefined) sanitized[key] = safeChild;
  }
  return sanitized;
}

function appendLgpdAudit(
  audit: AuditService,
  principal: AuthenticatedPrincipal,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  correlationId: string
): void {
  appendAudit(audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'lgpd',
    action,
    entityType,
    entityId,
    payloadSummary,
    riskLevel: 'high',
    correlationId
  });
}

async function appendLgpdAuditAndWait(
  audit: AuditService,
  principal: AuthenticatedPrincipal,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  correlationId: string
): Promise<void> {
  await appendAuditAndWait(audit, {
    actorId: principal.user.id,
    accountId: principal.user.accountId,
    module: 'lgpd',
    action,
    entityType,
    entityId,
    payloadSummary,
    riskLevel: 'high',
    correlationId
  });
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
    const principal = await requirePrincipal(request, LGPD_MANAGE_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const body = requireObjectPayload(await readJsonBody(request));
    const subjectId = requireBoundedString(body.subjectId, 'subjectId');
    const subjectType = parseSubjectType(body.subjectType);
    const purpose = requireEnum(body.purpose, 'purpose', CONSENT_PURPOSES);
    const origin = body.origin === undefined ? undefined : requireEnum(body.origin, 'origin', CONSENT_ORIGINS);
    const expiresAt = parseOptionalIsoDate(body.expiresAt, 'expiresAt');
    const metadata = parseOptionalMetadata(body.metadata);
    const record = await lgpdSvc.grantConsent({
      accountId: principal.user.accountId,
      subjectId,
      subjectType,
      purpose,
      origin,
      grantedBy: principal.user.id,
      expiresAt,
      metadata
    });
    appendLgpdAudit(audit, principal, 'consent_granted', 'consent', record.id, `Consent granted purpose=${purpose}`, correlationId);
    response.statusCode = 201;
    response.end(JSON.stringify(record));
    return true;
  }

  // POST /lgpd/consent/revoke — revoke consent
  if (pathname === '/lgpd/consent/revoke' && request.method === 'POST') {
    const principal = await requirePrincipal(request, LGPD_MANAGE_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const body = requireObjectPayload(await readJsonBody(request));
    const subjectId = requireBoundedString(body.subjectId, 'subjectId');
    const subjectType = parseSubjectType(body.subjectType);
    const purpose = requireEnum(body.purpose, 'purpose', CONSENT_PURPOSES);
    const record = await lgpdSvc.revokeConsent({
      accountId: principal.user.accountId,
      subjectId,
      subjectType,
      purpose,
      revokedBy: principal.user.id
    });
    appendLgpdAudit(audit, principal, 'consent_revoked', 'consent', record.id, `Consent revoked purpose=${purpose}`, correlationId);
    response.statusCode = 200;
    response.end(JSON.stringify(record));
    return true;
  }

  // GET /lgpd/consent — list consents
  if (pathname === '/lgpd/consent' && request.method === 'GET') {
    const principal = await requirePrincipal(request, LGPD_READ_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 200;
      response.end(JSON.stringify({ consents: [] }));
      return true;
    }
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const subjectId = requireBoundedString(url.searchParams.get('subjectId'), 'subjectId');
    const subjectType = parseSubjectType(url.searchParams.get('subjectType'));
    const activeOnly = parseBooleanQuery(url.searchParams.get('activeOnly'), 'activeOnly') ?? false;

    const consents = activeOnly
      ? await lgpdSvc.getActiveCons(principal.user.accountId, subjectId, subjectType)
      : await lgpdSvc.getConsents(principal.user.accountId, subjectId, subjectType);
    appendLgpdAudit(audit, principal, 'consent_read', 'consent', subjectId, `Consent records inspected subjectType=${subjectType} activeOnly=${activeOnly}`, correlationId);
    response.statusCode = 200;
    response.end(JSON.stringify({ consents }));
    return true;
  }

  // GET /lgpd/consent/status — consent status by purpose
  if (pathname === '/lgpd/consent/status' && request.method === 'GET') {
    const principal = await requirePrincipal(request, LGPD_READ_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 200;
      response.end(JSON.stringify({ active: {} }));
      return true;
    }
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const subjectId = requireBoundedString(url.searchParams.get('subjectId'), 'subjectId');
    const subjectType = parseSubjectType(url.searchParams.get('subjectType'));

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
    appendLgpdAudit(audit, principal, 'consent_status_read', 'consent-status', subjectId, `Consent status inspected subjectType=${subjectType}`, correlationId);
    response.statusCode = 200;
    response.end(JSON.stringify({ subjectId, subjectType, active }));
    return true;
  }

  // POST /lgpd/requests — create DSR
  if (pathname === '/lgpd/requests' && request.method === 'POST') {
    const principal = await requirePrincipal(request, LGPD_MANAGE_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const body = requireObjectPayload(await readJsonBody(request));
    const subjectId = requireBoundedString(body.subjectId, 'subjectId');
    const subjectType = parseSubjectType(body.subjectType);
    const requestType = requireEnum(body.requestType, 'requestType', DSR_TYPES);
    const notes = body.notes === undefined ? undefined : requireBoundedString(body.notes, 'notes', MAX_REASON_LENGTH);
    const dsrRequest = await lgpdSvc.createDsrRequest({
      accountId: principal.user.accountId,
      subjectId,
      subjectType,
      requestType,
      requestedBy: principal.user.id,
      notes
    });
    appendLgpdAudit(audit, principal, 'dsr_created', 'data_subject_request', dsrRequest.id, `DSR created type=${requestType}`, correlationId);
    response.statusCode = 201;
    response.end(JSON.stringify(dsrRequest));
    return true;
  }

  // GET /lgpd/requests — list DSRs
  if (pathname === '/lgpd/requests' && request.method === 'GET') {
    const principal = await requirePrincipal(request, LGPD_READ_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 200;
      response.end(JSON.stringify({ requests: [] }));
      return true;
    }
    const url = new URL(request.url!, `http://${request.headers.host}`);
    const subjectIdValue = url.searchParams.get('subjectId');
    const subjectTypeValue = url.searchParams.get('subjectType');
    const subjectId = subjectIdValue === null ? undefined : requireBoundedString(subjectIdValue, 'subjectId');
    const subjectType = subjectTypeValue === null ? undefined : parseSubjectType(subjectTypeValue);
    const statusValue = url.searchParams.get('status');
    const status = statusValue === null ? undefined : requireEnum(statusValue, 'status', DSR_STATUSES);

    if ((subjectId === undefined) !== (subjectType === undefined)) {
      throw new ValidationError('subjectId and subjectType must be provided together');
    }

    if (subjectId !== undefined && subjectType !== undefined) {
      const requests = await lgpdSvc.getDsrRequestsBySubject(
        principal.user.accountId,
        subjectId,
        subjectType
      );
      await appendLgpdAuditAndWait(
        audit,
        principal,
        'dsr_read',
        'data_subject_request',
        subjectId,
        `DSR records inspected subjectType=${subjectType}`,
        correlationId
      );
      response.statusCode = 200;
      response.end(JSON.stringify({ requests }));
      return true;
    }

    if (status !== undefined) {
      const requests = await lgpdSvc.getDsrRequestsByStatus(
        principal.user.accountId,
        status as never
      );
      await appendLgpdAuditAndWait(
        audit,
        principal,
        'dsr_read',
        'data_subject_request',
        'current',
        `DSR records inspected status=${status}`,
        correlationId
      );
      response.statusCode = 200;
      response.end(JSON.stringify({ requests }));
      return true;
    }

    const requests = await lgpdSvc.getDsrRequests(principal.user.accountId);
    await appendLgpdAuditAndWait(
      audit,
      principal,
      'dsr_read',
      'data_subject_request',
      'current',
      `DSR records inspected count=${requests.length}`,
      correlationId
    );
    response.statusCode = 200;
    response.end(JSON.stringify({ requests }));
    return true;
  }

  // POST /lgpd/requests/complete — complete DSR
  if (pathname === '/lgpd/requests/complete' && request.method === 'POST') {
    const principal = await requirePrincipal(request, LGPD_MANAGE_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const body = requireObjectPayload(await readJsonBody(request));
    const requestId = requireBoundedString(body.requestId, 'requestId');
    const resultJson = body.resultJson === undefined ? undefined : parseOptionalMetadata(body.resultJson);
    if (typeof lgpdSvc.getDsrRequest === 'function') {
      const existingRequest = await lgpdSvc.getDsrRequest(principal.user.accountId, requestId);
      if (!existingRequest) throw new NotFoundError('Data subject request not found');
    }
    const dsrRequest = await lgpdSvc.completeDsrRequest(
      principal.user.accountId,
      requestId,
      principal.user.id,
      resultJson
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
    const principal = await requirePrincipal(request, LGPD_MANAGE_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const body = requireObjectPayload(await readJsonBody(request));
    const requestId = requireBoundedString(body.requestId, 'requestId');
    const reasonValue = body.reason ?? body.rejectionReason;
    const reason = requireBoundedString(reasonValue, 'reason', MAX_REASON_LENGTH);
    if (typeof lgpdSvc.getDsrRequest === 'function') {
      const existingRequest = await lgpdSvc.getDsrRequest(principal.user.accountId, requestId);
      if (!existingRequest) throw new NotFoundError('Data subject request not found');
    }
    const dsrRequest = await lgpdSvc.rejectDsrRequest(
      principal.user.accountId,
      requestId,
      principal.user.id,
      reason
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
    const principal = await requirePrincipal(request, LGPD_MANAGE_PERMISSION);
    const lgpdSvc = lgpd;
    if (!lgpdSvc) {
      response.statusCode = 501;
      response.end(
        JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'LGPD service not configured' })
      );
      return true;
    }
    const body = requireObjectPayload(await readJsonBody(request));
    const subjectId = requireBoundedString(body.subjectId, 'subjectId');
    const subjectType = parseSubjectType(body.subjectType);

    const exportData = await lgpdSvc.buildPersonalDataExport(
      principal.user.accountId,
      subjectId,
      subjectType
    );
    const safeExportData = {
      ...exportData,
      data: sanitizeTenantData(exportData.data, principal.user.accountId) as Record<string, unknown>
    };
    appendLgpdAudit(audit, principal, 'personal_data_exported', subjectType, subjectId, `Personal data export generated subjectType=${subjectType}`, correlationId);

    response.statusCode = 200;
    response.end(JSON.stringify(safeExportData));
    return true;
  }

  return false;
}
