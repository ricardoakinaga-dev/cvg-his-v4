import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import { ConflictError, ValidationError } from '@cvg-his-v2/shared-errors';
import { hashIdempotencyPayload, type JsonValue } from '@cvg-his-v2/shared-database';
import type {
  AuthenticatedPrincipal,
  OwnerContact,
  OwnerSummary,
  PatientSummary
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type {
  VetusImportLogRepository,
  VetusImportBatchItemStatus,
  VetusImportBatchStatus,
  VetusImportBatchItemSummary,
  VetusImportBatchSummary,
  VetusImportStatus,
  VetusImportSummary
} from '../repositories/vetus-import-log-repository.js';

export type {
  VetusImportBatchItemStatus,
  VetusImportBatchStatus,
  VetusImportBatchItemSummary,
  VetusImportBatchSummary,
  VetusImportStatus,
  VetusImportSummary
} from '../repositories/vetus-import-log-repository.js';

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

export interface CreateVetusImportBatchRequest {
  sourceSystem?: string;
  sourceReference?: string;
  dryRun?: boolean;
  resumeBatchId?: string;
  items?: readonly unknown[];
}

export interface VetusImportRoutesHandlers {
  owners: OwnersService;
  patients: PatientsService;
  audit: AuditService;
  importLogStore: VetusImportLogRepository | Map<string, VetusImportSummary>;
  importBatchStore?: VetusImportLogRepository;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

type VetusImportBatchStore = VetusImportLogRepository & {
  listBatches: NonNullable<VetusImportLogRepository['listBatches']>;
  findBatch: NonNullable<VetusImportLogRepository['findBatch']>;
  findBatchBySourceReference: NonNullable<VetusImportLogRepository['findBatchBySourceReference']>;
  createBatch: NonNullable<VetusImportLogRepository['createBatch']>;
  updateBatch: NonNullable<VetusImportLogRepository['updateBatch']>;
  listBatchItems: NonNullable<VetusImportLogRepository['listBatchItems']>;
  createBatchItem: NonNullable<VetusImportLogRepository['createBatchItem']>;
  updateBatchItem: NonNullable<VetusImportLogRepository['updateBatchItem']>;
};

function getBatchStore(handlers: VetusImportRoutesHandlers): VetusImportBatchStore | null {
  const candidate = handlers.importBatchStore ?? handlers.importLogStore;
  if (candidate instanceof Map) return null;
  if (
    typeof candidate.listBatches !== 'function'
    || typeof candidate.findBatch !== 'function'
    || typeof candidate.findBatchBySourceReference !== 'function'
    || typeof candidate.createBatch !== 'function'
    || typeof candidate.updateBatch !== 'function'
    || typeof candidate.listBatchItems !== 'function'
    || typeof candidate.createBatchItem !== 'function'
    || typeof candidate.updateBatchItem !== 'function'
  ) {
    return null;
  }
  return candidate as VetusImportBatchStore;
}

async function listImportLogs(
  store: VetusImportRoutesHandlers['importLogStore'],
  accountId: string
): Promise<readonly VetusImportSummary[]> {
  if (store instanceof Map) {
    return [...store.values()]
      .filter((item) => item.accountId === accountId)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt));
  }
  return store.list(accountId);
}

async function findImportBySourceReference(
  store: VetusImportRoutesHandlers['importLogStore'],
  accountId: string,
  sourceSystem: string,
  sourceReference: string
): Promise<VetusImportSummary | null> {
  if (store instanceof Map) {
    return [...store.values()].find(
      (item) => item.accountId === accountId
        && item.sourceSystem === sourceSystem
        && item.sourceReference === sourceReference
    ) ?? null;
  }
  return store.findBySourceReference(accountId, sourceSystem, sourceReference);
}

async function saveImportLog(
  store: VetusImportRoutesHandlers['importLogStore'],
  summary: VetusImportSummary
): Promise<VetusImportSummary> {
  if (store instanceof Map) {
    store.set(summary.id, summary);
    return summary;
  }
  return store.create(summary);
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function toJsonValue(value: unknown): JsonValue {
  const serialized = JSON.stringify(value);
  if (serialized === undefined) {
    throw new ValidationError('Vetus import payload cannot be fingerprinted');
  }
  return JSON.parse(serialized) as JsonValue;
}

function hashImportPayload(value: unknown): string {
  return hashIdempotencyPayload(toJsonValue(value));
}

function hashImportRequest(payload: CreateVetusImportRequest): string {
  return hashImportPayload({
    sourceSystem: optionalText(payload.sourceSystem) ?? 'Vetus',
    sourceReference: optionalText(payload.sourceReference) ?? null,
    reviewedBy: optionalText(payload.reviewedBy) ?? null,
    owner: payload.owner,
    patient: payload.patient
  });
}

class VetusSourceReferenceConflictError extends ConflictError {
  public constructor(sourceSystem: string, sourceReference: string) {
    super(
      'Vetus source reference was already imported with a different payload',
      { sourceSystem, sourceReference }
    );
    this.name = 'VetusSourceReferenceConflictError';
  }
}

function assertSourceReferenceMatches(
  existingHash: string | null,
  requestHash: string,
  sourceSystem: string,
  sourceReference: string
): void {
  // Rows created before the fingerprint migration are legacy facts. Preserve
  // their replay behavior until an explicit, separately authorized backfill.
  if (!existingHash || existingHash === requestHash) return;
  throw new VetusSourceReferenceConflictError(sourceSystem, sourceReference);
}

function publicImportSummary(summary: VetusImportSummary): Omit<VetusImportSummary, 'requestHash'> {
  const { requestHash: _requestHash, ...publicSummary } = summary;
  return publicSummary;
}

function publicBatchSummary(
  batch: VetusImportBatchSummary
): Omit<VetusImportBatchSummary, 'requestHash'> {
  const { requestHash: _requestHash, ...publicBatch } = batch;
  return publicBatch;
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

const MAX_VETUS_BATCH_RESPONSE_BODY_BYTES = 160 * 1024;
const MAX_VETUS_BATCH_ITEM_REASON_LENGTH = 1000;

interface PreparedVetusBatchRow {
  readonly rowNumber: number;
  readonly rawRow: unknown;
  readonly normalized: CreateVetusImportRequest | null;
  readonly validationError: string | null;
}

function storedBatchPayload(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : { rawValue: value };
}

function prepareBatchRow(
  rowNumber: number,
  rawRow: unknown,
  sourceSystem: string,
  batchSourceReference: string | undefined
): PreparedVetusBatchRow {
  try {
    const parsed = validatePayload(rawRow);
    const sourceReference = parsed.sourceReference
      ?? (batchSourceReference ? `${batchSourceReference}:${rowNumber}` : undefined);
    return {
      rowNumber,
      rawRow,
      normalized: { ...parsed, sourceSystem, sourceReference },
      validationError: null
    };
  } catch (error) {
    return {
      rowNumber,
      rawRow,
      normalized: null,
      validationError: error instanceof Error ? error.message : 'Vetus row rejected'
    };
  }
}

function batchFingerprintPayload(
  sourceSystem: string,
  sourceReference: string | undefined,
  dryRun: boolean,
  rows: readonly PreparedVetusBatchRow[]
): Record<string, unknown> {
  return {
    sourceSystem,
    sourceReference: sourceReference ?? null,
    dryRun,
    items: rows.map((row) => ({
      rowNumber: row.rowNumber,
      valid: row.normalized !== null,
      payload: row.normalized
        ? batchItemPayload(row.normalized, sourceSystem)
        : storedBatchPayload(row.rawRow)
    }))
  };
}

async function assertBatchItemSourceReferences(
  rows: readonly PreparedVetusBatchRow[],
  importLogStore: VetusImportRoutesHandlers['importLogStore'],
  accountId: string
): Promise<void> {
  for (const row of rows) {
    if (!row.normalized?.sourceReference) continue;
    const existing = await findImportBySourceReference(
      importLogStore,
      accountId,
      optionalText(row.normalized.sourceSystem) ?? 'Vetus',
      row.normalized.sourceReference
    );
    if (!existing) continue;
    assertSourceReferenceMatches(
      existing.requestHash,
      hashImportRequest(row.normalized),
      optionalText(row.normalized.sourceSystem) ?? 'Vetus',
      row.normalized.sourceReference
    );
  }
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

  return owners.list().find((owner) => {
    if (owner.accountId !== accountId) return false;
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

  return patients.list().find((patient) => {
    if (patient.accountId !== accountId) return false;
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
    });
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
    });
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

async function importOne(
  principal: AuthenticatedPrincipal,
  payload: CreateVetusImportRequest,
  owners: OwnersService,
  patients: PatientsService,
  importLogStore: VetusImportRoutesHandlers['importLogStore']
): Promise<{
  summary: VetusImportSummary;
  replayed: boolean;
  ownerCreated: boolean;
  patientCreated: boolean;
}> {
  const importedAt = nowIso();
  const sourceSystem = optionalText(payload.sourceSystem) ?? 'Vetus';
  const sourceReference = optionalText(payload.sourceReference) ?? null;
  const reviewedBy = optionalText(payload.reviewedBy) ?? null;
  const requestHash = hashImportRequest(payload);

  if (sourceReference) {
    const existing = await findImportBySourceReference(
      importLogStore,
      principal.user.accountId,
      sourceSystem,
      sourceReference
    );
    if (existing) {
      assertSourceReferenceMatches(existing.requestHash, requestHash, sourceSystem, sourceReference);
      return {
        summary: existing,
        replayed: true,
        ownerCreated: false,
        patientCreated: false
      };
    }
  }

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
    requestHash,
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
  await saveImportLog(importLogStore, summary);
  return {
    summary,
    replayed: false,
    ownerCreated: ownerResult.created,
    patientCreated: patientResult.created
  };
}

function validateBatchRequest(input: unknown): CreateVetusImportBatchRequest {
  const payload = requireRecord(input, 'payload') as CreateVetusImportBatchRequest;
  if (payload.items !== undefined && !Array.isArray(payload.items)) {
    throw new ValidationError('items must be an array');
  }
  const items = payload.items ?? [];
  if (items.length > 1000) {
    throw new ValidationError('items must contain at most 1000 rows');
  }
  return {
    sourceSystem: optionalText(payload.sourceSystem),
    sourceReference: optionalText(payload.sourceReference),
    dryRun: payload.dryRun === true,
    resumeBatchId: optionalText(payload.resumeBatchId),
    items
  };
}

function batchItemPayload(
  item: CreateVetusImportRequest,
  sourceSystem: string
): Record<string, unknown> {
  return {
    ...item,
    sourceSystem: item.sourceSystem ?? sourceSystem
  };
}

function batchCounts(items: readonly VetusImportBatchItemSummary[]): Pick<
  VetusImportBatchSummary,
  'totalCount' | 'importedCount' | 'linkedCount' | 'rejectedCount' | 'rolledBackCount'
> {
  return {
    totalCount: items.length,
    importedCount: items.filter((item) => item.status === 'imported' || item.status === 'validated').length,
    linkedCount: items.filter((item) => item.status === 'linked').length,
    rejectedCount: items.filter((item) => item.status === 'rejected').length,
    rolledBackCount: items.filter((item) => item.status === 'rolled_back').length
  };
}

function projectedBatchItem(
  batch: VetusImportBatchSummary,
  row: PreparedVetusBatchRow,
  sourceSystem: string,
  dryRun: boolean,
  current?: VetusImportBatchItemSummary
): VetusImportBatchItemSummary {
  const base: VetusImportBatchItemSummary = current ?? {
    id: 'vetusbatchitem_response_budget_placeholder',
    accountId: batch.accountId,
    batchId: batch.id,
    rowNumber: row.rowNumber,
    sourceReference: null,
    status: 'pending',
    importLogId: null,
    ownerId: null,
    patientId: null,
    ownerCreated: false,
    patientCreated: false,
    reason: null,
    payload: {},
    createdAt: '2000-01-01T00:00:00.000Z',
    updatedAt: '2000-01-01T00:00:00.000Z'
  };
  const valid = row.normalized !== null;
  return {
    ...base,
    rowNumber: row.rowNumber,
    sourceReference: row.normalized?.sourceReference ?? null,
    status: valid ? (dryRun ? 'validated' : 'imported') : 'rejected',
    importLogId: valid ? 'vetusimport_response_budget_placeholder' : null,
    ownerId: valid ? '00000000-0000-0000-0000-000000000000' : null,
    patientId: valid ? '00000000-0000-0000-0000-000000000000' : null,
    ownerCreated: valid && !dryRun,
    patientCreated: valid && !dryRun,
    reason: valid ? null : 'x'.repeat(MAX_VETUS_BATCH_ITEM_REASON_LENGTH),
    payload: row.normalized
      ? batchItemPayload(row.normalized, sourceSystem)
      : storedBatchPayload(row.rawRow)
  };
}

function projectedBatchItems(
  batch: VetusImportBatchSummary,
  existingItems: readonly VetusImportBatchItemSummary[],
  rows: readonly PreparedVetusBatchRow[],
  sourceSystem: string,
  dryRun: boolean
): readonly VetusImportBatchItemSummary[] {
  const rowByNumber = new Map(rows.map((row) => [row.rowNumber, row]));
  if (existingItems.length === 0) {
    return rows.map((row) => projectedBatchItem(batch, row, sourceSystem, dryRun));
  }
  return existingItems.map((item) => {
    const row = rowByNumber.get(item.rowNumber);
    return row ? projectedBatchItem(batch, row, sourceSystem, dryRun, item) : item;
  });
}

function assertBatchResponseBudget(
  batch: VetusImportBatchSummary,
  items: readonly VetusImportBatchItemSummary[]
): void {
  const body = JSON.stringify({ batch: publicBatchSummary(batch), items });
  if (body === undefined || Buffer.byteLength(body, 'utf8') > MAX_VETUS_BATCH_RESPONSE_BODY_BYTES) {
    throw new ValidationError(
      'Vetus batch response is too large for the transactional command; split the import into smaller batches'
    );
  }
}

function projectedBatchSummary(
  batch: VetusImportBatchSummary,
  items: readonly VetusImportBatchItemSummary[],
  dryRun: boolean
): VetusImportBatchSummary {
  return {
    ...batch,
    ...batchCounts(items),
    status: dryRun
      ? 'dry_run'
      : items.some((item) => item.status === 'rejected')
        ? 'partial'
        : 'completed'
  };
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

  const batchStore = getBatchStore(handlers);
  if (pathname === '/vetus-import-batches' && method === 'GET') {
    const principal = await requirePrincipal(request, 'patients.read');
    if (!batchStore) {
      return json(response, 503, {
        error: 'vetus_import_batch_unavailable',
        message: 'Durable Vetus import batches are not configured'
      });
    }
    const batches = await batchStore.listBatches(principal.user.accountId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'vetus-imports',
      action: 'list_batches',
      entityType: 'vetus-import-batch',
      entityId: 'all',
      payloadSummary: `Vetus import batches listed: ${batches.length}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, { items: batches.map(publicBatchSummary) });
  }

  const batchDetailMatch = pathname.match(/^\/vetus-import-batches\/([^/]+)$/);
  if (batchDetailMatch && method === 'GET') {
    const principal = await requirePrincipal(request, 'patients.read');
    if (!batchStore) {
      return json(response, 503, {
        error: 'vetus_import_batch_unavailable',
        message: 'Durable Vetus import batches are not configured'
      });
    }
    const batchId = decodeURIComponent(batchDetailMatch[1] ?? '');
    const batch = await batchStore.findBatch(principal.user.accountId, batchId);
    if (!batch) return json(response, 404, { error: 'vetus_import_batch_not_found' });
    const items = await batchStore.listBatchItems(principal.user.accountId, batchId);
    return json(response, 200, { batch: publicBatchSummary(batch), items });
  }

  if (pathname === '/vetus-import-batches' && method === 'POST') {
    const principal = await requirePrincipal(request, 'patients.manage');
    await requirePrincipal(request, 'owners.manage');
    if (!batchStore) {
      return json(response, 503, {
        error: 'vetus_import_batch_unavailable',
        message: 'Durable Vetus import batches are not configured'
      });
    }
    const requestPayload = validateBatchRequest(await readJsonBody(request));
    const isResume = Boolean(requestPayload.resumeBatchId);
    let sourceSystem = requestPayload.sourceSystem ?? 'Vetus';
    let requestHash: string | null = null;
    let batch!: VetusImportBatchSummary;
    let existingItems: readonly VetusImportBatchItemSummary[] = [];
    let preparedRows: readonly PreparedVetusBatchRow[] = [];

    if (isResume) {
      const existingBatch = await batchStore.findBatch(
        principal.user.accountId,
        requestPayload.resumeBatchId as string
      );
      if (!existingBatch) return json(response, 404, { error: 'vetus_import_batch_not_found' });
      if (existingBatch.status !== 'partial') {
        throw new ValidationError('Only a partial Vetus import batch can be resumed');
      }
      if (requestPayload.dryRun) {
        throw new ValidationError('A resumed Vetus import batch cannot be a dry-run');
      }
      if (
        requestPayload.sourceSystem !== undefined
        && requestPayload.sourceSystem !== existingBatch.sourceSystem
      ) {
        throw new ValidationError('A resumed Vetus import batch cannot change sourceSystem');
      }
      if (
        requestPayload.sourceReference !== undefined
        && requestPayload.sourceReference !== existingBatch.sourceReference
      ) {
        throw new ValidationError('A resumed Vetus import batch cannot change sourceReference');
      }
      batch = existingBatch;
      sourceSystem = existingBatch.sourceSystem;
      existingItems = await batchStore.listBatchItems(principal.user.accountId, batch.id);
      const rejectedItems = existingItems.filter((item) => item.status === 'rejected');
      if (rejectedItems.length === 0) {
        throw new ValidationError('No rejected rows are available to resume');
      }
      const requestedRows = requestPayload.items ?? [];
      if (requestedRows.length > 0 && requestedRows.length !== rejectedItems.length) {
        throw new ValidationError(
          `Resume must provide exactly ${rejectedItems.length} replacement row(s)`
        );
      }
      const rows = requestedRows.length > 0
        ? requestedRows.map((rawRow, index) => ({
            rawRow,
            rowNumber: rejectedItems[index]!.rowNumber
          }))
        : rejectedItems.map((item) => ({ rawRow: item.payload, rowNumber: item.rowNumber }));
      preparedRows = rows.map(({ rawRow, rowNumber }) =>
        prepareBatchRow(rowNumber, rawRow, sourceSystem, batch.sourceReference ?? undefined)
      );
      await assertBatchItemSourceReferences(
        preparedRows,
        importLogStore,
        principal.user.accountId
      );
      const projectedItems = projectedBatchItems(
        batch,
        existingItems,
        preparedRows,
        sourceSystem,
        false
      );
      assertBatchResponseBudget(projectedBatchSummary(batch, projectedItems, false), projectedItems);
    } else {
      const rawRows = requestPayload.items ?? [];
      if (rawRows.length === 0) {
        throw new ValidationError('items must contain at least one Vetus row');
      }
      preparedRows = rawRows.map((rawRow, index) =>
        prepareBatchRow(index + 1, rawRow, sourceSystem, requestPayload.sourceReference)
      );
      requestHash = hashImportPayload(
        batchFingerprintPayload(
          sourceSystem,
          requestPayload.sourceReference,
          requestPayload.dryRun === true,
          preparedRows
        )
      );
      const timestamp = nowIso();
      batch = {
        id: createCorrelationId('vetusbatch'),
        accountId: principal.user.accountId,
        sourceSystem,
        sourceReference: requestPayload.sourceReference ?? null,
        requestHash,
        status: requestPayload.dryRun ? 'dry_run' : 'partial',
        totalCount: rawRows.length,
        importedCount: 0,
        linkedCount: 0,
        rejectedCount: 0,
        rolledBackCount: 0,
        createdByUserId: principal.user.id,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      if (requestPayload.sourceReference) {
        const existingBatch = await batchStore.findBatchBySourceReference(
          principal.user.accountId,
          sourceSystem,
          requestPayload.sourceReference
        );
        if (existingBatch) {
          assertSourceReferenceMatches(
            existingBatch.requestHash,
            requestHash,
            sourceSystem,
            requestPayload.sourceReference
          );
          const existingItems = await batchStore.listBatchItems(
            principal.user.accountId,
            existingBatch.id
          );
          assertBatchResponseBudget(existingBatch, existingItems);
          appendAudit(audit, {
            actorId: principal.user.id,
            accountId: principal.user.accountId,
            module: 'vetus-imports',
            action: 'idempotent_batch_replay',
            entityType: 'vetus-import-batch',
            entityId: existingBatch.id,
            payloadSummary: `Vetus import batch replayed from source reference ${requestPayload.sourceReference}`,
            riskLevel: 'medium',
            correlationId
          });
          return json(response, 200, {
            batch: publicBatchSummary(existingBatch),
            items: existingItems
          });
        }
      }
      await assertBatchItemSourceReferences(
        preparedRows,
        importLogStore,
        principal.user.accountId
      );
      const projectedItems = projectedBatchItems(
        batch,
        [],
        preparedRows,
        sourceSystem,
        requestPayload.dryRun === true
      );
      assertBatchResponseBudget(
        projectedBatchSummary(batch, projectedItems, requestPayload.dryRun === true),
        projectedItems
      );
      await batchStore.createBatch(batch);
    }

    const itemByRow = new Map(existingItems.map((item) => [item.rowNumber, item]));
    const isDryRun = !isResume && requestPayload.dryRun === true;
    for (const preparedRow of preparedRows) {
      const { rowNumber, rawRow, normalized } = preparedRow;
      const current = itemByRow.get(rowNumber);
      if (isResume && (!current || current.status !== 'rejected')) {
        throw new ValidationError(`Only rejected Vetus row ${rowNumber} can be resumed`);
      }
      let item: VetusImportBatchItemSummary = current ?? {
        id: createCorrelationId('vetusbatchitem'),
        accountId: principal.user.accountId,
        batchId: batch.id,
        rowNumber,
        sourceReference: null,
        status: 'pending',
        importLogId: null,
        ownerId: null,
        patientId: null,
        ownerCreated: false,
        patientCreated: false,
        reason: null,
        payload: storedBatchPayload(rawRow),
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      if (!current) await batchStore.createBatchItem(item);

      try {
        if (!normalized) {
          throw new ValidationError(preparedRow.validationError ?? 'Vetus row rejected');
        }
        const sourceReference = normalized.sourceReference;
        item = {
          ...item,
          sourceReference: sourceReference ?? null,
          payload: batchItemPayload(normalized, sourceSystem),
          reason: null,
          updatedAt: nowIso()
        };
        if (isDryRun) {
          requireOwnerContact(normalized.owner);
          const existing = sourceReference
            ? await findImportBySourceReference(
                importLogStore,
                principal.user.accountId,
                sourceSystem,
                sourceReference
              )
            : null;
          if (existing) {
            assertSourceReferenceMatches(
              existing.requestHash,
              hashImportRequest(normalized),
              sourceSystem,
              sourceReference as string
            );
          }
          item = {
            ...item,
            status: existing ? 'linked' : 'validated',
            importLogId: existing?.id ?? null,
            ownerId: existing?.ownerId ?? null,
            patientId: existing?.patientId ?? null,
            updatedAt: nowIso()
          };
        } else {
          const result = await importOne(principal, normalized, owners, patients, importLogStore);
          item = {
            ...item,
            status: result.summary.status,
            importLogId: result.summary.id,
            ownerId: result.summary.ownerId,
            patientId: result.summary.patientId,
            ownerCreated: result.ownerCreated,
            patientCreated: result.patientCreated,
            updatedAt: nowIso()
          };
        }
      } catch (error) {
        if (error instanceof VetusSourceReferenceConflictError) throw error;
        item = {
          ...item,
          status: 'rejected',
          reason: (error instanceof Error ? error.message : 'Vetus row rejected').slice(
            0,
            MAX_VETUS_BATCH_ITEM_REASON_LENGTH
          ),
          updatedAt: nowIso()
        };
      }
      await batchStore.updateBatchItem(item);
    }

    const allItems = await batchStore.listBatchItems(principal.user.accountId, batch.id);
    const counts = batchCounts(allItems);
    const updatedBatch: VetusImportBatchSummary = {
      ...batch,
      ...counts,
      status: isDryRun
        ? 'dry_run'
        : counts.rejectedCount > 0
          ? 'partial'
          : 'completed',
      updatedAt: nowIso()
    };
    const persistedBatch = await batchStore.updateBatch(updatedBatch);
    // Keep the last defensive size check before the audit write. If an
    // unexpected payload expansion is detected, the surrounding tenant UoW
    // can roll back without first adding a phantom audit event to the cache.
    assertBatchResponseBudget(updatedBatch, allItems);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'vetus-imports',
      action: isDryRun ? 'dry_run_batch' : isResume ? 'resume_batch' : 'create_batch',
      entityType: 'vetus-import-batch',
      entityId: persistedBatch.id,
      payloadSummary: `Vetus batch ${persistedBatch.id}: ${persistedBatch.importedCount} imported, ${persistedBatch.linkedCount} linked, ${persistedBatch.rejectedCount} rejected`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, isResume ? 200 : 201, {
      batch: publicBatchSummary(persistedBatch),
      items: allItems
    });
  }

  const rollbackBatchMatch = pathname.match(/^\/vetus-import-batches\/([^/]+)\/rollback$/);
  if (rollbackBatchMatch && method === 'POST') {
    const principal = await requirePrincipal(request, 'patients.manage');
    await requirePrincipal(request, 'owners.manage');
    if (!batchStore) {
      return json(response, 503, {
        error: 'vetus_import_batch_unavailable',
        message: 'Durable Vetus import batches are not configured'
      });
    }
    const batchId = decodeURIComponent(rollbackBatchMatch[1] ?? '');
    const batch = await batchStore.findBatch(principal.user.accountId, batchId);
    if (!batch) return json(response, 404, { error: 'vetus_import_batch_not_found' });
    if (batch.status === 'dry_run' || batch.status === 'rolled_back') {
      throw new ValidationError('This Vetus import batch cannot be rolled back');
    }
    // A batch may have been resumed by another API instance. Refresh both
    // participant caches, including primary links, before mutating statuses.
    await Promise.all([
      owners.hydrateFromDatabase(principal.user.accountId as never),
      patients.hydrateFromDatabase(principal.user.accountId as never)
    ]);
    const items = await batchStore.listBatchItems(principal.user.accountId, batchId);
    for (const item of items) {
      if (item.status !== 'imported' && item.status !== 'linked') continue;
      if (item.ownerCreated && item.ownerId) {
        const owner = await owners.getAuthoritativeOrThrow(
          principal.user.accountId,
          item.ownerId as never
        );
        if (owner.accountId === principal.user.accountId) {
          owners.update(owner.id, { status: 'inactive' });
        }
      }
      if (item.patientCreated && item.patientId) {
        const patient = await patients.getAuthoritativeOrThrow(
          principal.user.accountId,
          item.patientId as never
        );
        if (patient.accountId === principal.user.accountId) {
          patients.update(patient.id, { status: 'inactive' });
        }
      }
      await batchStore.updateBatchItem({
        ...item,
        status: 'rolled_back',
        reason: 'Rolled back by batch operator',
        updatedAt: nowIso()
      });
    }
    await Promise.all([owners.waitForPersistence(), patients.waitForPersistence()]);
    const updatedItems = await batchStore.listBatchItems(principal.user.accountId, batchId);
    const updatedBatch = await batchStore.updateBatch({
      ...batch,
      ...batchCounts(updatedItems),
      status: 'rolled_back',
      updatedAt: nowIso()
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'vetus-imports',
      action: 'rollback_batch',
      entityType: 'vetus-import-batch',
      entityId: batchId,
      payloadSummary: `Vetus import batch ${batchId} rolled back`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, { batch: publicBatchSummary(updatedBatch), items: updatedItems });
  }

  if (pathname === '/vetus-imports' && method === 'GET') {
    const principal = await requirePrincipal(request, 'patients.read');
    const items = (await listImportLogs(importLogStore, principal.user.accountId)).map(
      publicImportSummary
    );

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
    const principal = await requirePrincipal(request, 'patients.manage');
    await requirePrincipal(request, 'owners.manage');
    const payload = validatePayload(await readJsonBody(request));
    const result = await importOne(principal, payload, owners, patients, importLogStore);

    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'vetus-imports',
      action: result.replayed ? 'idempotent_replay' : 'create',
      entityType: 'vetus-import',
      entityId: result.summary.id,
      payloadSummary: result.replayed
        ? `Vetus import replayed from source reference ${result.summary.sourceReference}`
        : `Vetus assisted import ${result.summary.id} linked owner ${result.summary.ownerId} and patient ${result.summary.patientId}`,
      riskLevel: result.replayed ? 'medium' : 'high',
      correlationId
    });

    return json(response, result.replayed ? 200 : 201, publicImportSummary(result.summary));
  }

  return false;
}
