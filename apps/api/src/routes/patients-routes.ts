import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateOwnerPatientLinkRequest,
  CreatePatientRequest,
  UpdatePatientRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface PatientsRoutesHandlers {
  patients: PatientsService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

export async function handlePatientsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PatientsRoutesHandlers
): Promise<boolean> {
  const { patients, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/master-search' && method === 'GET') {
    const principal = requirePrincipal(request, 'patients.read');
    const query = url.searchParams.get('q') ?? '';
    const results = patients.searchMaster(query);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'search',
      entityType: 'master-search',
      entityId: query || 'all',
      payloadSummary: `Master registry search executed for "${query || 'all'}"`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, results);
  }

  // GET /patients - List patients
  if (pathname === '/patients' && method === 'GET') {
    const principal = requirePrincipal(request, 'patients.read');
    const query = url.searchParams.get('q') ?? undefined;
    const ownerId = url.searchParams.get('ownerId') ?? undefined;
    const species = url.searchParams.get('species') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;

    let items = patients.list(query);

    if (ownerId) {
      items = items.filter((patient) => patient.primaryOwnerId === ownerId);
    }

    if (species) {
      items = items.filter((patient) => patient.species.toLowerCase() === species.toLowerCase());
    }

    if (status === 'active' || status === 'inactive' || status === 'deceased') {
      items = items.filter((p) => p.status === status);
    }

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'list',
      entityType: 'patient',
      entityId: query ?? 'all',
      payloadSummary: 'Patient registry listed',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, { items });
  }

  // POST /patients - Create patient
  if (pathname === '/patients' && method === 'POST') {
    const principal = requirePrincipal(request, 'patients.manage');
    const body = (await readJsonBody(request)) as CreatePatientRequest;

    const patient = patients.create(principal.user.accountId, {
      name: body.name,
      species: body.species,
      breed: body.breed,
      sex: body.sex,
      size: body.size,
      birthDateApproximate: body.birthDateApproximate,
      baseWeightKg: body.baseWeightKg,
      primaryOwnerId: body.primaryOwnerId,
      status: body.status
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'create',
      entityType: 'patient',
      entityId: patient.id,
      payloadSummary: `Patient ${patient.name} created`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, patient);
  }

  // GET /patients/:id - Get patient by ID
  if (pathname.startsWith('/patients/') && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'patients.read');
    const patientId = match[1];

    const patient = patients.getOrThrow(patientId as never);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'read',
      entityType: 'patient',
      entityId: patient.id,
      payloadSummary: `Patient ${patient.name} inspected`,
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, patient);
  }

  // PATCH /patients/:id - Update patient
  if (pathname.startsWith('/patients/') && method === 'PATCH') {
    const match = pathname.match(/^\/patients\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'patients.manage');
    const patientId = match[1];
    const body = (await readJsonBody(request)) as UpdatePatientRequest;

    const patient = patients.update(patientId as never, {
      name: body.name,
      species: body.species,
      breed: body.breed,
      sex: body.sex,
      size: body.size,
      birthDateApproximate: body.birthDateApproximate,
      baseWeightKg: body.baseWeightKg,
      primaryOwnerId: body.primaryOwnerId,
      status: body.status
    });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'update',
      entityType: 'patient',
      entityId: patient.id,
      payloadSummary: `Patient ${patient.name} updated`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 200, patient);
  }

  // DELETE /patients/:id - Soft delete patient
  if (pathname.startsWith('/patients/') && method === 'DELETE') {
    const match = pathname.match(/^\/patients\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'patients.manage');
    const patientId = match[1];

    const patient = patients.update(patientId as never, { status: 'inactive' });

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'delete_patient',
      entityType: 'patient',
      entityId: patientId,
      payloadSummary: `Patient soft-deleted: ${patient.name}`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 204;
    response.end();
    return true;
  }

  // GET /patients/:id/owner - Get owner of patient
  if (pathname.match(/^\/patients\/[^/]+\/owner$/) && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)\/owner$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'patients.read');
    const patientId = match[1];

    const patient = patients.getOrThrow(patientId as never);
    // We need access to owners service to get the owner
    // For now, return a placeholder - this will be enhanced with actual owner lookup
    const ownerId = patient.primaryOwnerId;

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'get_patient_owner',
      entityType: 'patient',
      entityId: patientId,
      payloadSummary: `Owner retrieved for patient: ${patient.name}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, { ownerId });
  }

  if (pathname === '/owner-patient-links' && method === 'GET') {
    const principal = requirePrincipal(request, 'patients.read');
    const ownerId = url.searchParams.get('ownerId') ?? undefined;
    const patientId = url.searchParams.get('patientId') ?? undefined;

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'list_links',
      entityType: 'owner-patient-link',
      entityId: patientId ?? ownerId ?? 'all',
      payloadSummary: 'Owner-patient links listed',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, {
      items: patients.listLinks({
        ownerId: ownerId as never,
        patientId: patientId as never
      })
    });
  }

  if (pathname === '/owner-patient-links' && method === 'POST') {
    const principal = requirePrincipal(request, 'patients.manage');
    const payload = (await readJsonBody(request)) as CreateOwnerPatientLinkRequest;
    const link = patients.createLink(principal.user.accountId, payload);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'create_link',
      entityType: 'owner-patient-link',
      entityId: link.id,
      payloadSummary: `Owner-patient link created for patient ${link.patientId}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, link);
  }

  return false;
}
