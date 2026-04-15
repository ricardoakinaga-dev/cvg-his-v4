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
  SuspendPrescriptionRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';

export interface PrescriptionExecutionsHandlers {
  prescriptionExecutions: PrescriptionExecutionsService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
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
    const principal = requirePrincipal(request, 'prescription-executions.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const encounterId = url.searchParams.get('encounterId');
    const patientId = url.searchParams.get('patientId');
    let items;
    if (encounterId) {
      items = prescriptionExecutions.listByEncounter(encounterId as never);
    } else if (patientId) {
      items = prescriptionExecutions.listByPatient(patientId as never);
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
    const principal = requirePrincipal(request, 'prescription-executions.manage');
    const payload = (await readJsonBody(request)) as CreatePrescriptionExecutionRequest;
    validateRequestBody(
      payload as unknown as Record<string, unknown>,
      {
        clinicalEntryId: { type: 'string', required: true },
        patientId: { type: 'string', required: true },
        encounterId: { type: 'string', required: true },
        medicationName: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        dosage: { type: 'string', required: true, minLength: 1, maxLength: 255 },
        scheduledAt: { type: 'string', required: true }
      },
      correlationId
    );
    const execution = prescriptionExecutions.create(
      principal.user.accountId as never,
      payload
    );
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
  if (
    pathname.startsWith('/prescription-executions/') &&
    request.method === 'GET' &&
    !pathname.includes('/execute') &&
    !pathname.includes('/log') &&
    !pathname.includes('/suspend') &&
    !pathname.includes('/resume')
  ) {
    const principal = requirePrincipal(request, 'prescription-executions.read');
    const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
    const execution = prescriptionExecutions.getById(executionId as never);
    const events = prescriptionExecutions.getEvents(executionId as never);
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
  if (
    pathname.startsWith('/prescription-executions/') &&
    pathname.endsWith('/execute') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'prescription-executions.manage');
    const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
    const payload = (await readJsonBody(request)) as ExecutePrescriptionRequest;
    const execution = prescriptionExecutions.execute(
      executionId as never,
      principal.user.id as never,
      payload
    );
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
  if (
    pathname.startsWith('/prescription-executions/') &&
    pathname.endsWith('/suspend') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'prescription-executions.manage');
    const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
    const payload = (await readJsonBody(request)) as SuspendPrescriptionRequest;
    const execution = prescriptionExecutions.suspend(
      executionId as never,
      principal.user.id as never,
      payload
    );
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
  if (
    pathname.startsWith('/prescription-executions/') &&
    pathname.endsWith('/resume') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'prescription-executions.manage');
    const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
    const execution = prescriptionExecutions.resume(
      executionId as never,
      principal.user.id as never
    );
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
  if (
    pathname.startsWith('/prescription-executions/') &&
    pathname.endsWith('/log') &&
    request.method === 'POST'
  ) {
    const principal = requirePrincipal(request, 'prescription-executions.manage');
    const executionId = requireNonEmptyString(pathname.split('/')[2], 'executionId');
    const payload = (await readJsonBody(request)) as LogAdministrationEventRequest;
    const event = prescriptionExecutions.logEvent(
      executionId as never,
      principal.user.id as never,
      payload
    );
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
