import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import type { PatientListResponse } from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal, MasterSearchOwnerResult } from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import {
  parseCreateOwnerPatientLinkRequest,
  parseCreatePatientRequest,
  parseMergePatientRequest,
  parseUpdateOwnerPatientLinkRequest,
  parseUpdatePatientRequest
} from '../registry-request-boundaries.js';
import { parseListPagination, parsePatientListStatus } from '../request-boundaries.js';

export interface PatientsRoutesHandlers {
  patients: PatientsService;
  owners?: OwnersService;
  encounters?: EncountersService;
  audit: AuditService;
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
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
  const { patients, owners, encounters, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/master-search' && method === 'GET') {
    const principal = await requirePrincipal(request, 'patients.read');
    await requirePrincipal(request, 'owners.read');
    const query = url.searchParams.get('q') ?? '';
    const rawResults = patients.searchMaster(query);
    const owners: MasterSearchOwnerResult[] = rawResults.owners
      .filter((owner) => owner.accountId === principal.user.accountId)
      .map((owner) => ({
        id: owner.id,
        fullName: owner.fullName,
        status: owner.status
      }));
    const results = {
      owners,
      patients: rawResults.patients.filter(
        (patient) => patient.accountId === principal.user.accountId
      ),
      links: rawResults.links.filter((link) => link.accountId === principal.user.accountId)
    };

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

  if (pathname.match(/^\/patients\/[^/]+\/summary$/) && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)\/summary$/);
    if (!match) return false;
    if (!owners || !encounters) return false;

    const principal = await requirePrincipal(request, 'patients.read');
    const patientId = match[1];
    const patient = await patients.fetchOrThrow(principal.user.accountId, patientId as never);
    const owner = await owners.fetchOrThrow(principal.user.accountId, patient.primaryOwnerId);
    const relatedEncounters = encounters
      .listAll(principal.user.accountId)
      .filter((encounter) => encounter.patientId === patient.id)
      .sort((left, right) => right.openedAt.localeCompare(left.openedAt));

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'read_summary',
      entityType: 'patient',
      entityId: patient.id,
      payloadSummary: `Patient summary generated for ${patient.name}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, {
      patient,
      owner: {
        id: owner.id,
        fullName: owner.fullName,
        phoneMain: owner.contacts[0]?.value ?? null,
        email: owner.contacts.find((contact) => contact.type === 'email')?.value ?? null
      },
      stats: {
        totalEncounters: relatedEncounters.length,
        openEncounters: relatedEncounters.filter((encounter) => encounter.status !== 'closed')
          .length
      },
      recentEncounters: relatedEncounters.slice(0, 5).map((encounter) => ({
        id: encounter.id,
        openedAt: encounter.openedAt,
        status: encounter.status === 'closed' ? 'closed' : 'open'
      }))
    });
  }

  // GET /patients - List patients
  if (pathname === '/patients' && method === 'GET') {
    const principal = await requirePrincipal(request, 'patients.read');
    const query = url.searchParams.get('q') ?? undefined;
    const ownerId = url.searchParams.get('ownerId') ?? undefined;
    const species = url.searchParams.get('species') ?? undefined;
    const status = parsePatientListStatus(url.searchParams.get('status'));

    let items = patients
      .list(query)
      .filter((patient) => patient.accountId === principal.user.accountId);

    if (ownerId) {
      items = items.filter((patient) => patient.primaryOwnerId === ownerId);
    }

    if (species) {
      items = items.filter((patient) => patient.species.toLowerCase() === species.toLowerCase());
    }

    if (status === 'active' || status === 'inactive' || status === 'deceased') {
      items = items.filter((p) => p.status === status);
    }

    const total = items.length;
    const pagination = parseListPagination(url);
    let payload: PatientListResponse;
    if (pagination) {
      const start = (pagination.page - 1) * pagination.pageSize;
      items = items.slice(start, start + pagination.pageSize);
      payload = {
        items,
        page: pagination.page,
        pageSize: pagination.pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.pageSize))
      };
    } else {
      payload = { items };
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

    return json(response, 200, payload);
  }

  // POST /patients - Create patient
  if (pathname === '/patients' && method === 'POST') {
    const principal = await requirePrincipal(request, 'patients.manage');
    const body = parseCreatePatientRequest(await readJsonBody(request), correlationId);
    if (owners) {
      const owner = await owners.fetchOrThrow(principal.user.accountId, body.primaryOwnerId as never);
    }

    const patient = patients.create(principal.user.accountId, {
      name: body.name,
      species: body.species,
      breed: body.breed,
      sex: body.sex,
      size: body.size,
      birthDateApproximate: body.birthDateApproximate,
      baseWeightKg: body.baseWeightKg,
      isNeutered: body.isNeutered,
      microchip: body.microchip,
      pedigreeNumber: body.pedigreeNumber,
      color: body.color,
      chronicDisease: body.chronicDisease,
      allergy: body.allergy,
      temperament: body.temperament,
      generalNotes: body.generalNotes,
      legacyVetusId: body.legacyVetusId,
      originalCreatedAt: body.originalCreatedAt,
      primaryOwnerId: body.primaryOwnerId,
      status: body.status
    });
    await patients.waitForPersistence();

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

  const mergeMatch = pathname.match(/^\/patients\/([^/]+)\/merge$/);
  if (mergeMatch && method === 'POST') {
    const principal = await requirePrincipal(request, 'patients.manage');
    const sourcePatientId = mergeMatch[1];
    const source = await patients.fetchOrThrow(principal.user.accountId, sourcePatientId as never);
    const payload = parseMergePatientRequest(await readJsonBody(request), correlationId);
    const target = await patients.fetchOrThrow(principal.user.accountId, payload.targetPatientId as never);
    const merged = patients.merge(
      principal.user.accountId as never,
      sourcePatientId as never,
      payload.targetPatientId as never,
      principal.user.id,
      payload.reason
    );
    await patients.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'merge',
      entityType: 'patient',
      entityId: merged.id,
      payloadSummary: `Patient ${sourcePatientId} merged into ${target.id}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, { source: merged, target });
  }

  // GET /patients/:id/owner - Get owner of patient
  // This route must precede the generic patient GET matcher below.
  if (pathname.match(/^\/patients\/[^/]+\/owner$/) && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)\/owner$/);
    if (!match) return false;
    if (!owners) return false;

    const principal = await requirePrincipal(request, 'patients.read');
    const patientId = match[1];

    const patient = await patients.fetchOrThrow(principal.user.accountId, patientId as never);
    const owner = await owners.fetchOrThrow(principal.user.accountId, patient.primaryOwnerId);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'get_patient_owner',
      entityType: 'patient',
      entityId: patientId,
      payloadSummary: `Owner snapshot retrieved for patient: ${patient.name}`,
      riskLevel: 'low',
      correlationId
    });

    return json(response, 200, {
      ownerId: owner.id,
      owner: {
        id: owner.id,
        fullName: owner.fullName,
        documentId: owner.documentId,
        contacts: owner.contacts,
        financialResponsible: owner.financialResponsible,
        status: owner.status
      }
    });
  }

  // GET /patients/:id - Get patient by ID
  if (pathname.startsWith('/patients/') && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)$/);
    if (!match) return false;

    const principal = await requirePrincipal(request, 'patients.read');
    const patientId = match[1];

    const patient = await patients.fetchOrThrow(principal.user.accountId, patientId as never);

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

    const principal = await requirePrincipal(request, 'patients.manage');
    const patientId = match[1];
    const body = parseUpdatePatientRequest(await readJsonBody(request), correlationId);
    const existing = await patients.fetchOrThrow(principal.user.accountId, patientId as never);
    if (body.primaryOwnerId && owners) {
      const owner = await owners.fetchOrThrow(principal.user.accountId, body.primaryOwnerId as never);
    }

    const patient = patients.update(principal.user.accountId, patientId as never, {
      name: body.name,
      species: body.species,
      breed: body.breed,
      sex: body.sex,
      size: body.size,
      birthDateApproximate: body.birthDateApproximate,
      baseWeightKg: body.baseWeightKg,
      isNeutered: body.isNeutered,
      microchip: body.microchip,
      pedigreeNumber: body.pedigreeNumber,
      color: body.color,
      chronicDisease: body.chronicDisease,
      allergy: body.allergy,
      temperament: body.temperament,
      generalNotes: body.generalNotes,
      legacyVetusId: body.legacyVetusId,
      originalCreatedAt: body.originalCreatedAt,
      primaryOwnerId: body.primaryOwnerId,
      status: body.status
    });
    await patients.waitForPersistence();

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

    const principal = await requirePrincipal(request, 'patients.manage');
    const patientId = match[1];

    const existing = await patients.fetchOrThrow(principal.user.accountId, patientId as never);
    const patient = patients.update(principal.user.accountId, patientId as never, { status: 'inactive' });
    await patients.waitForPersistence();

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

  if (pathname === '/owner-patient-links' && method === 'GET') {
    const principal = await requirePrincipal(request, 'patients.read');
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
      items: patients
        .listLinks({ ownerId: ownerId as never, patientId: patientId as never })
        .filter((link) => link.accountId === principal.user.accountId)
    });
  }

  if (pathname === '/owner-patient-links' && method === 'POST') {
    const principal = await requirePrincipal(request, 'patients.manage');
    const payload = parseCreateOwnerPatientLinkRequest(await readJsonBody(request), correlationId);
    const patient = await patients.fetchOrThrow(principal.user.accountId, payload.patientId as never);
    if (owners) {
      const owner = await owners.fetchOrThrow(principal.user.accountId, payload.ownerId as never);
    }
    const link = patients.createLink(principal.user.accountId, payload);
    await patients.waitForPersistence();

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

  const linkMatch = pathname.match(/^\/owner-patient-links\/([^/]+)$/);
  if (linkMatch && method === 'PATCH') {
    const principal = await requirePrincipal(request, 'patients.manage');
    const payload = parseUpdateOwnerPatientLinkRequest(
      await readJsonBody(request),
      correlationId
    );
    const link = patients.updateLink(
      principal.user.accountId as never,
      linkMatch[1] as never,
      payload
    );
    await patients.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'update_link',
      entityType: 'owner-patient-link',
      entityId: link.id,
      payloadSummary: `Owner-patient relationship ${link.id} updated`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, link);
  }

  if (linkMatch && method === 'DELETE') {
    const principal = await requirePrincipal(request, 'patients.manage');
    patients.deleteLink(principal.user.accountId as never, linkMatch[1] as never);
    await patients.waitForPersistence();
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'patients',
      action: 'delete_link',
      entityType: 'owner-patient-link',
      entityId: linkMatch[1],
      payloadSummary: `Owner-patient relationship ${linkMatch[1]} deleted`,
      riskLevel: 'high',
      correlationId
    });
    response.statusCode = 204;
    response.end();
    return true;
  }

  return false;
}
