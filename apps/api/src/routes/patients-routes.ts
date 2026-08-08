import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import type {
  CreateOwnerPatientLinkRequest,
  MergePatientRequest,
  CreatePatientRequest,
  UpdatePatientRequest,
  UpdateOwnerPatientLinkRequest
} from '@cvg-his-v2/shared-contracts';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { NotFoundError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface PatientsRoutesHandlers {
  patients: PatientsService;
  owners?: OwnersService;
  encounters?: EncountersService;
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
  const { patients, owners, encounters, audit, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/master-search' && method === 'GET') {
    const principal = requirePrincipal(request, 'patients.read');
    const query = url.searchParams.get('q') ?? '';
    const rawResults = patients.searchMaster(query);
    const results = {
      owners: rawResults.owners.filter((owner) => owner.accountId === principal.user.accountId),
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

    const principal = requirePrincipal(request, 'patients.read');
    const patientId = match[1];
    const patient = patients.getOrThrow(patientId as never);
    if (patient.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }
    const owner = owners.getOrThrow(patient.primaryOwnerId);
    if (owner.accountId !== principal.user.accountId) {
      throw new NotFoundError('Owner not found', { ownerId: owner.id });
    }
    const relatedEncounters = encounters
      .listAll()
      .filter(
        (encounter) =>
          encounter.accountId === principal.user.accountId && encounter.patientId === patient.id
      )
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
        openEncounters: relatedEncounters.filter((encounter) => encounter.status !== 'closed').length
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
    const principal = requirePrincipal(request, 'patients.read');
    const query = url.searchParams.get('q') ?? undefined;
    const ownerId = url.searchParams.get('ownerId') ?? undefined;
    const species = url.searchParams.get('species') ?? undefined;
    const status = url.searchParams.get('status') ?? undefined;

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
    if (owners) {
      const owner = owners.getOrThrow(body.primaryOwnerId as never);
      if (owner.accountId !== principal.user.accountId) {
        throw new NotFoundError('Owner not found', { ownerId: body.primaryOwnerId });
      }
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
    const principal = requirePrincipal(request, 'patients.manage');
    const sourcePatientId = mergeMatch[1];
    const source = patients.getOrThrow(sourcePatientId as never);
    if (source.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId: sourcePatientId });
    }
    const payload = (await readJsonBody(request)) as MergePatientRequest;
    const target = patients.getOrThrow(payload.targetPatientId as never);
    if (target.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId: payload.targetPatientId });
    }
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

  // GET /patients/:id - Get patient by ID
  if (pathname.startsWith('/patients/') && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'patients.read');
    const patientId = match[1];

    const patient = patients.getOrThrow(patientId as never);
    if (patient.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }

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
    const existing = patients.getOrThrow(patientId as never);
    if (existing.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }
    if (body.primaryOwnerId && owners) {
      const owner = owners.getOrThrow(body.primaryOwnerId as never);
      if (owner.accountId !== principal.user.accountId) {
        throw new NotFoundError('Owner not found', { ownerId: body.primaryOwnerId });
      }
    }

    const patient = patients.update(patientId as never, {
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

    const principal = requirePrincipal(request, 'patients.manage');
    const patientId = match[1];

    const existing = patients.getOrThrow(patientId as never);
    if (existing.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }
    const patient = patients.update(patientId as never, { status: 'inactive' });
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

  // GET /patients/:id/owner - Get owner of patient
  if (pathname.match(/^\/patients\/[^/]+\/owner$/) && method === 'GET') {
    const match = pathname.match(/^\/patients\/([^/]+)\/owner$/);
    if (!match) return false;

    const principal = requirePrincipal(request, 'patients.read');
    const patientId = match[1];

    const patient = patients.getOrThrow(patientId as never);
    if (patient.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId });
    }
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
      items: patients
        .listLinks({ ownerId: ownerId as never, patientId: patientId as never })
        .filter((link) => link.accountId === principal.user.accountId)
    });
  }

  if (pathname === '/owner-patient-links' && method === 'POST') {
    const principal = requirePrincipal(request, 'patients.manage');
    const payload = (await readJsonBody(request)) as CreateOwnerPatientLinkRequest;
    const patient = patients.getOrThrow(payload.patientId as never);
    if (patient.accountId !== principal.user.accountId) {
      throw new NotFoundError('Patient not found', { patientId: payload.patientId });
    }
    if (owners) {
      const owner = owners.getOrThrow(payload.ownerId as never);
      if (owner.accountId !== principal.user.accountId) {
        throw new NotFoundError('Owner not found', { ownerId: payload.ownerId });
      }
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
    const principal = requirePrincipal(request, 'patients.manage');
    const payload = (await readJsonBody(request)) as UpdateOwnerPatientLinkRequest;
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
    const principal = requirePrincipal(request, 'patients.manage');
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
