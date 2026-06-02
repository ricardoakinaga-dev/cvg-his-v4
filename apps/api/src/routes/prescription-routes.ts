import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type {
  CreatePrescriptionRequest,
  UpdatePrescriptionRequest,
  ArchivePrescriptionRequest
} from '@cvg-his-v2/module-prescriptions';
import { PrescriptionsService } from '@cvg-his-v2/module-prescriptions';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface PrescriptionRoutesHandlers {
  prescriptions: PrescriptionsService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

export async function handlePrescriptionRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PrescriptionRoutesHandlers
): Promise<boolean> {
  const isPrescriptionPath = pathname.startsWith('/prescriptions');
  if (!isPrescriptionPath) {
    return false;
  }

  const { prescriptions, audit, requirePrincipal } = handlers;

  const documentMatch = pathname.match(/^\/prescriptions\/([^/]+)\/document$/);
  if (documentMatch && request.method === 'POST') {
    const principal = requirePrincipal(request, 'prescriptions.read');
    const prescriptionId = requireNonEmptyString(documentMatch[1], 'prescriptionId');
    const payload = await readJsonBody(request);
    const document = prescriptions.renderDocument(prescriptionId as never, payload as never);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescriptions',
      action: 'render_document',
      entityType: 'prescription',
      entityId: prescriptionId,
      payloadSummary: 'Prescription document rendered',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, document);
  }

  // GET /prescriptions
  if (pathname === '/prescriptions' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'prescriptions.read');
    const url = new URL(request.url ?? pathname, 'http://localhost');
    const patientId = url.searchParams.get('patientId') ?? undefined;
    const encounterId = url.searchParams.get('encounterId') ?? undefined;

    let items;
    if (encounterId) {
      items = prescriptions.listByEncounter(encounterId as never);
    } else if (patientId) {
      items = prescriptions.listByPatient(patientId as never);
    } else {
      items = prescriptions.listByAccount(principal.user.accountId as never);
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescriptions',
      action: 'list',
      entityType: 'prescription',
      entityId: patientId ?? encounterId ?? 'account',
      payloadSummary: `Prescriptions listed (count=${items.length})`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, { items });
  }

  // POST /prescriptions
  if (pathname === '/prescriptions' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'prescriptions.write');
    const payload = (await readJsonBody(request)) as CreatePrescriptionRequest;
    const rx = prescriptions.create(principal.user.accountId, principal.user.id, payload);
    await prescriptions.waitForPersistence();

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'prescriptions',
      action: 'create',
      entityType: 'prescription',
      entityId: rx.id,
      payloadSummary: `Prescription created: ${rx.medicationName}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, rx);
  }

  const idMatch = pathname.match(/^\/prescriptions\/([^/]+)$/);
  if (idMatch) {
    const prescriptionId = requireNonEmptyString(idMatch[1], 'prescriptionId');

    // GET /prescriptions/:id
    if (request.method === 'GET') {
      const principal = requirePrincipal(request, 'prescriptions.read');
      const rx = prescriptions.getById(prescriptionId as never);

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'prescriptions',
        action: 'read',
        entityType: 'prescription',
        entityId: rx.id,
        payloadSummary: `Prescription read: ${rx.medicationName}`,
        riskLevel: 'low',
        correlationId
      });

      return json(response, 200, rx);
    }

    // PATCH /prescriptions/:id
    if (request.method === 'PATCH') {
      const principal = requirePrincipal(request, 'prescriptions.write');
      const payload = (await readJsonBody(request)) as UpdatePrescriptionRequest;
      const rx = prescriptions.update(prescriptionId as never, principal.user.id, payload);
      await prescriptions.waitForPersistence();

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'prescriptions',
        action: 'update',
        entityType: 'prescription',
        entityId: rx.id,
        payloadSummary: `Prescription updated: ${rx.medicationName}`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 200, rx);
    }

    // DELETE /prescriptions/:id
    if (request.method === 'DELETE') {
      const principal = requirePrincipal(request, 'prescriptions.write');
      const payload = (await readJsonBody(request)) as ArchivePrescriptionRequest;
      const rx = prescriptions.archive(prescriptionId as never, principal.user.id, payload);
      await prescriptions.waitForPersistence();

      appendAudit(audit, {
        actorId: principal.user.id,
        accountId: principal.user.accountId,
        module: 'prescriptions',
        action: 'archive',
        entityType: 'prescription',
        entityId: rx.id,
        payloadSummary: `Prescription archived: ${rx.medicationName}`,
        riskLevel: 'high',
        correlationId
      });

      return json(response, 200, rx);
    }
  }

  return false;
}
