/**
 * Prescription Executions route handlers.
 * Extracted from server.ts as part of the controlled refactoring initiative (GAP-02).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { PrescriptionExecutionsService } from '@cvg-his-v2/module-prescription-executions';
import type {
  CreatePrescriptionExecutionRequest,
  ExecutePrescriptionRequest,
  LogAdministrationEventRequest,
  ResumePrescriptionRequest,
  SuspendPrescriptionRequest
} from '@cvg-his-v2/shared-contracts';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody, readJsonBodyOrEmpty, validateRequestBody } from '../helpers/common.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PREFIXED_ID_SUFFIX_PATTERN = /^[A-Za-z0-9_-]+$/;
const ISO_DATE_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

type PrescriptionExecutionAction = 'execute' | 'suspend' | 'resume' | 'log';

export interface PrescriptionExecutionsHandlers {
  prescriptionExecutions: PrescriptionExecutionsService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

function requireObjectBody(payload: unknown): Record<string, unknown> {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return payload as Record<string, unknown>;
}

function requireIsoDateTime(value: unknown, field: string): string {
  const resolved = requireNonEmptyString(value, field);
  if (!ISO_DATE_TIME_PATTERN.test(resolved) || Number.isNaN(Date.parse(resolved))) {
    throw new ValidationError(`Field '${field}' must be a valid ISO date-time`, { field });
  }
  return resolved;
}

function requireUuid(value: unknown, field: string): string {
  const resolved = requireNonEmptyString(value, field);
  if (!UUID_PATTERN.test(resolved)) {
    throw new ValidationError(`Field '${field}' must be a valid UUID`, { field });
  }
  return resolved;
}

function requirePrefixedId(value: unknown, field: string, prefix: string): string {
  const resolved = requireNonEmptyString(value, field);
  if (
    !resolved.startsWith(prefix) ||
    !PREFIXED_ID_SUFFIX_PATTERN.test(resolved.slice(prefix.length))
  ) {
    throw new ValidationError(`Field '${field}' must use the ${prefix} identifier format`, {
      field
    });
  }
  return resolved;
}

function matchExecutionAction(
  pathname: string,
  method: string | undefined,
  action: PrescriptionExecutionAction
): string | null {
  if (method !== 'POST') return null;
  const match = pathname.match(new RegExp(`^/prescription-executions/([^/]+)/${action}$`));
  return match ? requirePrefixedId(match[1], 'executionId', 'pe_') : null;
}

function validateExpectedVersion(payload: Record<string, unknown>): void {
  if (
    payload.expectedVersion !== undefined &&
    (!Number.isInteger(payload.expectedVersion) || Number(payload.expectedVersion) < 1)
  ) {
    throw new ValidationError("Field 'expectedVersion' must be a positive integer", {
      field: 'expectedVersion'
    });
  }
}

/**
 * Handle all prescription-executions-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 */
export async function handlePrescriptionExecutionsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PrescriptionExecutionsHandlers
): Promise<boolean> {
  const { prescriptionExecutions, audit, requirePrincipal } = handlers;

  // GET /prescription-executions — list prescription executions
  if (pathname === '/prescription-executions' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'prescription-executions.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterIdParam = url.searchParams.get('encounterId');
    const patientIdParam = url.searchParams.get('patientId');
    const encounterId =
      encounterIdParam === null ? undefined : requireUuid(encounterIdParam, 'encounterId');
    const patientId =
      patientIdParam === null ? undefined : requireUuid(patientIdParam, 'patientId');
    let items;
    if (encounterId) {
      items = prescriptionExecutions.listByEncounter(
        encounterId as never,
        principal.user.accountId as never
      );
    } else if (patientId) {
      items = prescriptionExecutions.listByPatient(
        patientId as never,
        principal.user.accountId as never
      );
    } else {
      items = prescriptionExecutions.list(principal.user.accountId as never);
    }
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: 'list',
      entityType: 'prescription-execution',
      entityId: '*',
      payloadSummary: 'Prescription executions listed',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ items, total: items.length }));
    return true;
  }

  // POST /prescription-executions — create a prescription execution
  if (pathname === '/prescription-executions' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'prescription-executions.manage');
    const payload = (await readJsonBody(request)) as CreatePrescriptionExecutionRequest;
    validateRequestBody(
      requireObjectBody(payload),
      {
        clinicalEntryId: { type: 'string', required: true },
        patientId: { type: 'string', required: true },
        encounterId: { type: 'string', required: true },
        medicationName: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        dosage: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        route: { type: 'string', minLength: 1, maxLength: 255 },
        frequency: { type: 'string', minLength: 1, maxLength: 255 },
        scheduledAt: { type: 'string', required: true },
        notes: { type: 'string', minLength: 1, maxLength: 2000 }
      },
      correlationId
    );
    requirePrefixedId(payload.clinicalEntryId, 'clinicalEntryId', 'rx_');
    requireUuid(payload.patientId, 'patientId');
    requireUuid(payload.encounterId, 'encounterId');
    requireIsoDateTime(payload.scheduledAt, 'scheduledAt');
    const execution = prescriptionExecutions.create(principal.user.accountId as never, payload);
    await prescriptionExecutions.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: 'create',
      entityType: 'prescription-execution',
      entityId: execution.id,
      payloadSummary: `Prescription execution created for ${payload.medicationName}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(execution));
    return true;
  }

  // GET /prescription-executions/:executionId — get prescription execution by ID
  const detailMatch = pathname.match(/^\/prescription-executions\/([^/]+)$/);
  if (detailMatch && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'prescription-executions.read');
    const executionId = requirePrefixedId(detailMatch[1], 'executionId', 'pe_');
    const execution = prescriptionExecutions.getByIdForAccount(
      principal.user.accountId as never,
      executionId as never
    );
    const events = prescriptionExecutions.getEvents(
      principal.user.accountId as never,
      executionId as never
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: 'read',
      entityType: 'prescription-execution',
      entityId: execution.id,
      payloadSummary: 'Prescription execution detail consulted',
      riskLevel: 'low',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify({ ...execution, events }));
    return true;
  }

  // POST /prescription-executions/:executionId/execute — execute a prescription
  const executeId = matchExecutionAction(pathname, request.method, 'execute');
  if (executeId) {
    const principal = await requirePrincipal(request, 'prescription-executions.manage');
    const payload = (await readJsonBody(request)) as ExecutePrescriptionRequest;
    validateRequestBody(
      requireObjectBody(payload),
      {
        status: {
          type: 'string',
          required: true,
          enum: ['administered', 'not-administered']
        },
        notes: { type: 'string', minLength: 1, maxLength: 2000 },
        vitalsSnapshot: { type: 'object' },
        expectedVersion: { type: 'number' }
      },
      correlationId
    );
    validateExpectedVersion(payload as unknown as Record<string, unknown>);
    prescriptionExecutions.getByIdForAccount(principal.user.accountId as never, executeId as never);
    const execution = prescriptionExecutions.execute(
      principal.user.accountId as never,
      executeId as never,
      principal.user.id as never,
      payload
    );
    await prescriptionExecutions.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: payload.status,
      entityType: 'prescription-execution',
      entityId: execution.id,
      payloadSummary: `Prescription execution ${payload.status}`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(execution));
    return true;
  }

  // POST /prescription-executions/:executionId/suspend — suspend a prescription execution
  const suspendId = matchExecutionAction(pathname, request.method, 'suspend');
  if (suspendId) {
    const principal = await requirePrincipal(request, 'prescription-executions.manage');
    const payload = (await readJsonBody(request)) as SuspendPrescriptionRequest;
    validateRequestBody(
      requireObjectBody(payload),
      {
        reason: { type: 'string', required: true, minLength: 1, maxLength: 2000 },
        expectedVersion: { type: 'number' }
      },
      correlationId
    );
    validateExpectedVersion(payload as unknown as Record<string, unknown>);
    prescriptionExecutions.getByIdForAccount(principal.user.accountId as never, suspendId as never);
    const execution = prescriptionExecutions.suspend(
      principal.user.accountId as never,
      suspendId as never,
      principal.user.id as never,
      payload
    );
    await prescriptionExecutions.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: 'suspend',
      entityType: 'prescription-execution',
      entityId: execution.id,
      payloadSummary: 'Prescription execution suspended',
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(execution));
    return true;
  }

  // POST /prescription-executions/:executionId/resume — resume a prescription execution
  const resumeId = matchExecutionAction(pathname, request.method, 'resume');
  if (resumeId) {
    const principal = await requirePrincipal(request, 'prescription-executions.manage');
    const payload = (await readJsonBodyOrEmpty(request)) as ResumePrescriptionRequest;
    validateRequestBody(
      requireObjectBody(payload),
      {
        expectedVersion: { type: 'number' }
      },
      correlationId
    );
    validateExpectedVersion(payload as unknown as Record<string, unknown>);
    prescriptionExecutions.getByIdForAccount(principal.user.accountId as never, resumeId as never);
    const execution = prescriptionExecutions.resume(
      principal.user.accountId as never,
      resumeId as never,
      principal.user.id as never,
      payload.expectedVersion
    );
    await prescriptionExecutions.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: 'resume',
      entityType: 'prescription-execution',
      entityId: execution.id,
      payloadSummary: 'Prescription execution resumed',
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 200;
    response.end(JSON.stringify(execution));
    return true;
  }

  // POST /prescription-executions/:executionId/log — log an administration event
  const logId = matchExecutionAction(pathname, request.method, 'log');
  if (logId) {
    const principal = await requirePrincipal(request, 'prescription-executions.manage');
    const payload = (await readJsonBody(request)) as LogAdministrationEventRequest;
    validateRequestBody(
      requireObjectBody(payload),
      {
        eventType: { type: 'string', required: true, minLength: 1, maxLength: 100 },
        notes: { type: 'string', minLength: 1, maxLength: 2000 },
        vitalsSnapshot: { type: 'object' }
      },
      correlationId
    );
    prescriptionExecutions.getByIdForAccount(principal.user.accountId as never, logId as never);
    const event = prescriptionExecutions.logEvent(
      principal.user.accountId as never,
      logId as never,
      principal.user.id as never,
      payload
    );
    await prescriptionExecutions.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescription-executions',
      action: 'log_event',
      entityType: 'administration-event',
      entityId: event.id,
      payloadSummary: `Event logged: ${payload.eventType}`,
      riskLevel: 'medium',
      correlationId
    });
    response.statusCode = 201;
    response.end(JSON.stringify(event));
    return true;
  }

  return false;
}
