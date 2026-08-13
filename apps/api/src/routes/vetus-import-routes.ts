import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type {
  AuthenticatedPrincipal,
  OwnerContact,
  OwnerSummary,
  PatientSummary
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

type VetusImportStatus = 'imported' | 'linked';

interface VetusImportOwnerInput {
  legacyVetusId?: string;
  fullName: string;
  documentId?: string;
  phone?: string;
  email?: string;
  originalCreatedAt?: string;
}

interface VetusImportPatientInput {
  legacyVetusId?: string;
  name: string;
  species: string;
  breed?: string;
  sex?: 'male' | 'female' | 'unknown';
  baseWeightKg?: number;
  generalNotes?: string;
  originalCreatedAt?: string;
}

export interface CreateVetusImportRequest {
  sourceSystem?: string;
  sourceReference?: string;
  reviewedBy?: string;
  owner: VetusImportOwnerInput;
  patient: VetusImportPatientInput;
}

export interface VetusImportSummary {
  id: string;
  accountId: string;
  sourceSystem: string;
  sourceReference: string | null;
  status: VetusImportStatus;
  ownerId: string;
  ownerName: string;
  patientId: string;
  patientName: string;
  importedByUserId: string;
  reviewedBy: string | null;
  importedAt: string;
  summary: string;
}

export interface VetusImportRoutesHandlers {
  owners: OwnersService;
  patients: PatientsService;
  audit: AuditService;
  importLogStore: Map<string, VetusImportSummary>;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiredText(value: unknown, field: string): string {
  const normalized = optionalText(value);
  if (!normalized) {
    throw new ValidationError(`${field} is required`);
  }
  return normalized;
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${field} is required`);
  }
  return value as Record<string, unknown>;
}

function normalizeSex(value: unknown): 'male' | 'female' | 'unknown' {
  const normalized = optionalText(value)?.toLowerCase();
  if (normalized === 'male' || normalized === 'macho') return 'male';
  if (normalized === 'female' || normalized === 'femea' || normalized === 'fêmea') return 'female';
  return 'unknown';
}

function normalizeWeight(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value !== 'string') return undefined;
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildImportNote(payload: CreateVetusImportRequest, importedAt: string): string {
  return [
    `Importacao assistida ${payload.sourceSystem ?? 'Vetus'}`,
    optionalText(payload.sourceReference) ? `referencia ${payload.sourceReference}` : null,
    optionalText(payload.reviewedBy) ? `revisado por ${payload.reviewedBy}` : null,
    `em ${importedAt}`
  ].filter(Boolean).join(' · ');
}

function mergeText(current: string | undefined, addition: string): string {
  if (!current?.trim()) return addition;
  if (current.includes(addition)) return current;
  return `${current}\n${addition}`;
}

function ownerContacts(input: VetusImportOwnerInput): OwnerContact[] {
  const contacts: OwnerContact[] = [];
  const phone = optionalText(input.phone);
  const email = optionalText(input.email);

  if (phone) {
    contacts.push({ label: 'Telefone Vetus', value: phone, type: 'phone', primary: true });
  }

  if (email) {
    contacts.push({
      label: 'E-mail Vetus',
      value: email,
      type: 'email',
      primary: contacts.length === 0
    });
  }

  return contacts;
}

function requireOwnerContact(input: VetusImportOwnerInput): void {
  if (!optionalText(input.phone) && !optionalText(input.email)) {
    throw new ValidationError('owner.phone or owner.email is required');
  }
}

function validatePayload(input: unknown): CreateVetusImportRequest {
  const payload = requireRecord(input, 'payload');
  const owner = requireRecord(payload.owner, 'owner');
  const patient = requireRecord(payload.patient, 'patient');

  return {
    sourceSystem: optionalText(payload.sourceSystem),
    sourceReference: optionalText(payload.sourceReference),
    reviewedBy: optionalText(payload.reviewedBy),
    owner: {
      legacyVetusId: optionalText(owner.legacyVetusId),
      fullName: requiredText(owner.fullName, 'owner.fullName'),
      documentId: optionalText(owner.documentId),
      phone: optionalText(owner.phone),
      email: optionalText(owner.email),
      originalCreatedAt: optionalText(owner.originalCreatedAt)
    },
    patient: {
      legacyVetusId: optionalText(patient.legacyVetusId),
      name: requiredText(patient.name, 'patient.name'),
      species: requiredText(patient.species, 'patient.species'),
      breed: optionalText(patient.breed),
      sex: normalizeSex(patient.sex),
      baseWeightKg: normalizeWeight(patient.baseWeightKg),
      generalNotes: optionalText(patient.generalNotes),
      originalCreatedAt: optionalText(patient.originalCreatedAt)
    }
  };
}

function findOwner(
  owners: OwnersService,
  accountId: string,
  input: VetusImportOwnerInput
): OwnerSummary | undefined {
  const legacyVetusId = optionalText(input.legacyVetusId);
  const documentId = optionalText(input.documentId);
  const fullName = requiredText(input.fullName, 'owner.fullName').toLowerCase();

  return owners.listByAccount(accountId as never).find((owner) => {
    if (legacyVetusId && owner.legacyVetusId === legacyVetusId) return true;
    if (documentId && owner.documentId === documentId) return true;
    return owner.fullName.toLowerCase() === fullName;
  });
}

function findPatient(
  patients: PatientsService,
  accountId: string,
  ownerId: string,
  input: VetusImportPatientInput
): PatientSummary | undefined {
  const legacyVetusId = optionalText(input.legacyVetusId);
  const name = requiredText(input.name, 'patient.name').toLowerCase();

  return patients.listByAccount(accountId as never).find((patient) => {
    if (patient.primaryOwnerId !== ownerId) return false;
    if (legacyVetusId && patient.legacyVetusId === legacyVetusId) return true;
    return patient.name.toLowerCase() === name;
  });
}

async function upsertOwner(
  principal: AuthenticatedPrincipal,
  owners: OwnersService,
  payload: CreateVetusImportRequest,
  importNote: string
): Promise<{ owner: OwnerSummary; created: boolean }> {
  requireOwnerContact(payload.owner);
  const existing = findOwner(owners, principal.user.accountId, payload.owner);
  const contacts = ownerContacts(payload.owner);

  if (existing) {
    const owner = owners.update(existing.id, {
      legacyVetusId: existing.legacyVetusId ?? optionalText(payload.owner.legacyVetusId),
      originalCreatedAt: existing.originalCreatedAt ?? optionalText(payload.owner.originalCreatedAt),
      administrativeNotes: mergeText(existing.administrativeNotes, importNote),
      contacts: existing.contacts.length ? existing.contacts : contacts
    }, principal.user.accountId as never);
    await owners.waitForPersistence();
    return { owner, created: false };
  }

  const owner = owners.create(principal.user.accountId, {
    fullName: requiredText(payload.owner.fullName, 'owner.fullName'),
    documentId: optionalText(payload.owner.documentId),
    contacts,
    financialResponsible: true,
    administrativeNotes: importNote,
    legacyVetusId: optionalText(payload.owner.legacyVetusId),
    originalCreatedAt: optionalText(payload.owner.originalCreatedAt)
  });
  await owners.waitForPersistence();
  return { owner, created: true };
}

async function upsertPatient(
  principal: AuthenticatedPrincipal,
  patients: PatientsService,
  ownerId: string,
  payload: CreateVetusImportRequest,
  importNote: string
): Promise<{ patient: PatientSummary; created: boolean }> {
  const existing = findPatient(patients, principal.user.accountId, ownerId, payload.patient);
  const patientNotes = mergeText(optionalText(payload.patient.generalNotes), importNote);

  if (existing) {
    const patient = patients.update(existing.id, {
      legacyVetusId: existing.legacyVetusId ?? optionalText(payload.patient.legacyVetusId),
      originalCreatedAt: existing.originalCreatedAt ?? optionalText(payload.patient.originalCreatedAt),
      breed: existing.breed ?? optionalText(payload.patient.breed),
      baseWeightKg: existing.baseWeightKg ?? normalizeWeight(payload.patient.baseWeightKg),
      generalNotes: mergeText(existing.generalNotes, patientNotes)
    }, principal.user.accountId as never);
    await patients.waitForPersistence();
    return { patient, created: false };
  }

  const patient = patients.create(principal.user.accountId, {
    name: requiredText(payload.patient.name, 'patient.name'),
    species: requiredText(payload.patient.species, 'patient.species'),
    breed: optionalText(payload.patient.breed),
    sex: normalizeSex(payload.patient.sex),
    baseWeightKg: normalizeWeight(payload.patient.baseWeightKg),
    generalNotes: patientNotes,
    legacyVetusId: optionalText(payload.patient.legacyVetusId),
    originalCreatedAt: optionalText(payload.patient.originalCreatedAt),
    primaryOwnerId: ownerId,
    status: 'active'
  });
  await patients.waitForPersistence();
  return { patient, created: true };
}

export async function handleVetusImportRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: VetusImportRoutesHandlers
): Promise<boolean> {
  const { owners, patients, audit, importLogStore, requirePrincipal } = handlers;
  const method = request.method ?? 'GET';

  if (pathname === '/vetus-imports' && method === 'GET') {
    const principal = requirePrincipal(request, 'patients.read');
    const items = Array.from(importLogStore.values())
      .filter((item) => item.accountId === principal.user.accountId)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt));

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'vetus-imports',
      action: 'list',
      entityType: 'vetus-import',
      entityId: 'all',
      payloadSummary: 'Vetus assisted imports listed',
      riskLevel: 'medium',
      correlationId
    });

    return json(response, 200, { items });
  }

  if (pathname === '/vetus-imports' && method === 'POST') {
    const principal = requirePrincipal(request, 'patients.manage');
    requirePrincipal(request, 'owners.manage');
    const payload = validatePayload(await readJsonBody(request));
    const importedAt = nowIso();
    const sourceSystem = optionalText(payload.sourceSystem) ?? 'Vetus';
    const sourceReference = optionalText(payload.sourceReference) ?? null;
    const reviewedBy = optionalText(payload.reviewedBy) ?? null;
    const importNote = buildImportNote({ ...payload, sourceSystem }, importedAt);

    const ownerResult = await upsertOwner(principal, owners, payload, importNote);
    const patientResult = await upsertPatient(
      principal,
      patients,
      ownerResult.owner.id,
      payload,
      importNote
    );

    const status: VetusImportStatus =
      ownerResult.created || patientResult.created ? 'imported' : 'linked';
    const summary: VetusImportSummary = {
      id: createCorrelationId('vetusimport'),
      accountId: principal.user.accountId,
      sourceSystem,
      sourceReference,
      status,
      ownerId: ownerResult.owner.id,
      ownerName: ownerResult.owner.fullName,
      patientId: patientResult.patient.id,
      patientName: patientResult.patient.name,
      importedByUserId: principal.user.id,
      reviewedBy,
      importedAt,
      summary: `${ownerResult.created ? 'Cliente criado' : 'Cliente vinculado'}; ${patientResult.created ? 'animal criado' : 'animal vinculado'}`
    };
    importLogStore.set(summary.id, summary);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'vetus-imports',
      action: 'create',
      entityType: 'vetus-import',
      entityId: summary.id,
      payloadSummary: `Vetus assisted import ${summary.id} linked owner ${summary.ownerId} and patient ${summary.patientId}`,
      riskLevel: 'high',
      correlationId
    });

    return json(response, 201, summary);
  }

  return false;
}
