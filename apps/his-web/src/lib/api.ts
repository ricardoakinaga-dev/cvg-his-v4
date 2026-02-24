import { clearAuthSession, getAuthSession } from './auth';
import { resolvePublicApiBaseConfig } from './publicEnv';
import { z } from 'zod';
import {
  createOwnerBodySchema as OwnerCreateSchema,
  ownerResponseSchema as OwnerReadSchema,
  createPatientBodySchema as PatientCreateSchema,
  patientResponseSchema as PatientReadSchema,
  createEncounterBodySchema as EncounterCreateSchema,
  encounterResponseSchema as EncounterReadSchema,
  ownerSummaryResponseSchema,
  patientSummaryResponseSchema,
  listEncountersResponseSchema,
  type OwnerResponse as Owner,
  type PatientResponse as Patient,
  type AlertDto,
  type OwnerSummaryResponse,
  type PatientSummaryResponse,
  ClinicalAlertSchema,
  type ClinicalAlert,
  type BedMapItem
} from '../contracts/openapi-lite';

export class ApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly requestId?: string;
  readonly url?: string;
  readonly method?: string;

  constructor(
    message: string,
    status: number,
    payload: unknown,
    meta?: { requestId?: string; url?: string; method?: string }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
    this.requestId = meta?.requestId;
    this.url = meta?.url;
    this.method = meta?.method;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

type ApiFetchInit = RequestInit & {
  auth?: boolean;
};

/**
 * ==========================================
 * PHASE 1 TYPES & HELPERS
 * ==========================================
 */
export type Paginated<T> = {
  data: T[];
  total: number;
};

export type { OwnerSummaryResponse, PatientSummaryResponse };

export type OwnerCreate = z.infer<typeof OwnerCreateSchema>;
export type PatientCreate = z.infer<typeof PatientCreateSchema>;
export type EncounterCreate = z.infer<typeof EncounterCreateSchema>;

export type { Owner, Patient, ClinicalAlert, BedMapItem };

export type SearchOwnerResult = {
  id: string;
  fullName: string;
  phoneMain: string | null;
  document: string | null;
};

export type SearchPatientResult = {
  id: string;
  name: string;
  species: string;
  ownerId: string;
  microchip: string | null;
};

export type SearchResponse = {
  q: string;
  owners: SearchOwnerResult[];
  patients: SearchPatientResult[];
};

export type AuditTrailEvent = {
  id: string;
  createdAt: string;
  action: string;
  actorRole: string | null;
  reason: string | null;
  requestId: string | null;
};

export type OwnerPatchInput = {
  fullName?: string;
  document?: string | null;
  email?: string | null;
  phoneMain?: string | null;
  phoneAlt?: string | null;
};

export type PatientPatchInput = {
  name?: string;
  species?: string;
  breed?: string;
  sex?: string;
  microchip?: string;
  alerts?: AlertDto;
};

export type EncounterStatus = 'open' | 'closed';

export type ProtocolStatus = 'draft' | 'published' | 'archived';

export type ProtocolRecordRangeType = 'age_months' | 'weight_kg';

export type ProtocolRecordRange = {
  type: ProtocolRecordRangeType;
  min: number | null;
  max: number | null;
};

export type ProtocolRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: ProtocolStatus;
  species: string | null;
  ranges: ProtocolRecordRange[];
  createdAt: string;
  updatedAt: string;
};

export type EncounterRecord = {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  status: EncounterStatus;
  openedByUserId: string;
  closedByUserId: string | null;
  openedAt: string;
  closedAt: string | null;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListEncountersApiResponse = {
  data: EncounterRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type EncounterTimelineNote = {
  id: string;
  encounterId: string;
  type: string;
  status: string;
  versionNumber: number;
  signedAt: string | null;
  signedByUserId: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  currentSoapJson: Record<string, unknown> | null;
};

export type EncounterTimelineVersion = {
  id: string;
  noteId: string;
  encounterId: string;
  versionNumber: number;
  soapJson: Record<string, unknown>;
  reason: string | null;
  createdByUserId: string;
  createdAt: string;
};

export type EncounterTimelineDocument = {
  encounterDocumentId: string;
  encounterId: string;
  documentId: string;
  attachedByUserId: string;
  attachedAt: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  createdAt: string;
};

export type EncounterTimelineEvent = {
  kind:
  | 'encounter.opened'
  | 'encounter.closed'
  | 'note.created'
  | 'note.signed'
  | 'note.version.created'
  | 'document.attached';
  entityId: string;
  happenedAt: string;
  data: Record<string, unknown>;
};

export type EncounterTimelineResponse = {
  encounter: EncounterRecord;
  notes: EncounterTimelineNote[];
  versions: EncounterTimelineVersion[];
  documents: EncounterTimelineDocument[];
  timeline: EncounterTimelineEvent[];
};

export type EncounterCreateInput = {
  patientId: string;
  reason?: string;
};

export type SoapPayload = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

export type SoapTemplate = {
  key: 'gastro' | 'cardio' | 'trauma';
  label: string;
  soap: SoapPayload;
};

export type SoapTemplatesResponse = {
  data: SoapTemplate[];
};

export type ClinicalNoteRecord = {
  id: string;
  encounterId: string;
  type: 'SOAP';
  status: 'draft' | 'signed';
  versionNumber: number;
  signedAt: string | null;
  signedByUserId: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: string;
  updatedAt: string;
  soap: SoapPayload | null;
};

export type NoteMutationInput = {
  soap: SoapPayload;
  reason: string;
};

export type NoteCreateInput = {
  soap: SoapPayload;
  reason?: string;
};

export type DocumentCreateInput = {
  filename: string;
  mimeType: string;
  size: number;
};

export type DocumentRecord = {
  id: string;
  accountId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  createdAt: string;
};

export type EncounterDocumentRelation = {
  id: string;
  encounterId: string;
  documentId: string;
  attachedByUserId: string;
  createdAt: string;
  alreadyAttached: boolean;
};

export type WardRecord = {
  id: string;
  accountId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WardListResponse = {
  data: WardRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type BedMapBed = {
  bed: {
    id: string;
    name: string;
    code: string | null;
  };
  status: 'free' | 'occupied';
  stay: null | {
    id: string;
    patientId: string;
    patientName: string | null;
    species: string | null;
    admittedAt: string;
    reason: string | null;
  };
};

export type BedMapResponse = {
  ward: {
    id: string;
    name: string;
  };
  beds: BedMapBed[];
};

// Bed Management Types
export type BedRecord = {
  id: string;
  accountId: string;
  wardId: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BedListResponse = {
  data: BedRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type BedCreateInput = {
  wardId: string;
  name: string;
  code?: string;
};

export type BedUpdateInput = {
  name?: string;
  code?: string | null;
  isActive?: boolean;
};

export function listBeds(input: {
  page?: number;
  pageSize?: number;
  wardId?: string;
  q?: string;
}): Promise<BedListResponse> {
  const queryString = toQueryString({
    page: input.page,
    pageSize: input.pageSize,
    wardId: input.wardId,
    q: input.q
  });

  return apiFetch<BedListResponse>(`/beds${queryString}`, { method: 'GET' });
}

export function createBed(payload: BedCreateInput): Promise<BedRecord> {
  return apiFetch<BedRecord>('/beds', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateBed(bedId: string, payload: BedUpdateInput): Promise<BedRecord> {
  return apiFetch<BedRecord>(`/beds/${bedId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export type InpatientStayRecord = {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  encounterId: string | null;
  wardId: string;
  bedId: string;
  status: 'active' | 'discharged' | 'transferred';
  admittedAt: string;
  dischargedAt: string | null;
  admittedByUserId: string;
  dischargedByUserId: string | null;
  chiefComplaint: string | null;
  reason: string | null;
  planSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdmitInpatientInput = {
  patientId: string;
  wardId: string;
  bedId: string;
  encounterId?: string;
  chiefComplaint?: string;
  reason?: string;
  planSummary?: string;
};

export type TransferInpatientInput = {
  toWardId: string;
  toBedId: string;
  reason?: string;
};

export type DischargeInpatientInput = {
  reason: string;
};

export type MedicationOrderStatus = 'active' | 'stopped';

export type MedicationOrderRecord = {
  id: string;
  accountId: string;
  encounterId: string | null;
  stayId: string | null;
  patientId: string;
  medicationName: string;
  doseValue: string;
  doseUnit: string;
  route: string;
  frequencyType: 'q8h' | 'q12h' | 'sid' | 'bid' | 'tid' | 'custom';
  prescriptionText: string | null;
  durationValue: number | null;
  durationUnit: 'days' | 'hours' | null;
  startAt: string;
  endAt: string | null;
  status: MedicationOrderStatus;
  stopReason: string | null;
  createdByUserId: string;
  stoppedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicationOrdersListResponse = {
  data: MedicationOrderRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type MedicationOrderCreateInput = {
  patientId: string;
  stayId?: string;
  encounterId?: string;
  medicationName: string;
  doseValue: number;
  doseUnit: string;
  route: 'IV' | 'IM' | 'VO' | 'SC' | 'TOP' | 'INH' | 'SL' | 'RECTAL' | 'OTIC' | 'OPHTHALMIC' | 'OTHER';
  frequencyType: MedicationOrderRecord['frequencyType'];
  prescriptionText?: string;
  startAt: string;
  endAt?: string;
  durationValue?: number;
  durationUnit?: 'days' | 'hours';
};

export type MedicationOrderUpdateInput = {
  doseValue?: number;
  doseUnit?: string;
  route?: MedicationOrderCreateInput['route'];
  frequencyType?: MedicationOrderRecord['frequencyType'];
  prescriptionText?: string | null;
  endAt?: string;
  durationValue?: number;
  durationUnit?: 'days' | 'hours';
};

export type MedicationOrderStopInput = {
  stopReason: string;
};

export type MedicationAdministrationRecord = {
  id: string;
  accountId: string;
  orderId: string;
  stayId: string | null;
  encounterId: string | null;
  scheduledFor: string;
  effectiveAt: string | null;
  delayedUntil: string | null;
  administeredAt: string | null;
  status: 'administered' | 'refused' | 'delayed' | 'held';
  reason: string | null;
  administeredByUserId: string;
  createdAt: string;
};

export type MedicationAdministrationsListResponse = {
  data: MedicationAdministrationRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type MedicationDueDoseItem = {
  orderId: string;
  stayId: string | null;
  encounterId: string | null;
  timezone?: string;
  patient: {
    id: string;
    name: string;
  };
  medication: {
    name: string;
    doseValue: string;
    doseUnit: string;
    route: string;
    frequencyType: string;
  };
  scheduledFor: string;
  nextDueAt: string;
};

export type MedicationDueDosesResponse = {
  now: string;
  windowMin: number;
  overdue: MedicationDueDoseItem[];
  upcoming: MedicationDueDoseItem[];
  total: number;
};

export type MedicationAdministrationCreateInput = {
  orderId: string;
  stayId?: string;
  encounterId?: string;
  scheduledFor: string;
  effectiveAt?: string;
  delayedUntil?: string;
  status: 'administered' | 'refused' | 'delayed' | 'held';
  reason?: string;
};

export type MedicationLogsResponse = {
  stayId: string;
  orders: Array<{
    id: string;
    medicationName: string;
    dose: string;
    route: string;
    frequencyType: string;
    status: MedicationOrderStatus;
    nextDueAt: string | null;
  }>;
  administrations: Array<{
    id: string;
    orderId: string;
    scheduledFor: string;
    status: 'administered' | 'refused' | 'delayed' | 'held';
    effectiveAt: string | null;
    delayedUntil: string | null;
    administeredAt: string | null;
    reason: string | null;
    byUserId: string;
  }>;
};

export function resolveApiBaseUrl(): string {
  // Legacy function for components that construct their own URLs.
  // Generally, use the apiClient instead.
  return resolvePublicApiBaseConfig().baseUrl;
}

import { apiClient } from './api/client';

export async function apiFetch<T = unknown>(path: string, init: ApiFetchInit = {}): Promise<T> {
  // Wrapper redirecting legacy apiFetch to the new apiClient
  return apiClient<T>(path, {
    method: init.method,
    headers: init.headers,
    body: init.body ? (typeof init.body === 'string' ? JSON.parse(init.body) : init.body) : undefined,
  });
}

function toQueryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }

    query.set(key, String(value));
  }

  const result = query.toString();
  return result.length > 0 ? `?${result}` : '';
}

export function searchGlobal(input: {
  q: string;
  page?: number;
  pageSize?: number;
}): Promise<SearchResponse> {
  const queryString = toQueryString({
    q: input.q,
    limit: input.pageSize
  });
  return apiFetch<SearchResponse>(`/general/search${queryString}`, { method: 'GET' });
}

export type PatientContextResponse = {
  patient: {
    id: string;
    ownerId: string;
    ownerName?: string;
    name: string;
    species: string;
    breed: string | null;
    sex: string | null;
    birthDate: string | null;
    ageMonths?: number | null;
    weightKg: string | null;
    microchip: string | null;
    alerts: {
      aggressive?: boolean;
      allergies?: string[];
      anesthesia_risk?: 'low' | 'medium' | 'high' | null;
      chronic_conditions?: string[];
      notes?: string | null;
    };
    highlightedAlerts: {
      aggressive: boolean;
      allergiesCount: number;
      anesthesiaRisk: 'low' | 'medium' | 'high' | null;
      chronicConditionsCount: number;
      hasNotes: boolean;
    };
    bedName?: string | null;
    wardName?: string | null;
    stayStatus?: 'active' | 'discharged' | 'transferred' | null;
    createdAt: string;
    updatedAt: string;
  };
  stay: any | null;
  encounter: any | null;
  navigation: any;
};

export function getPatientContext(patientId: string): Promise<PatientContextResponse> {
  return apiFetch<PatientContextResponse>(`/patient-context/by-patient/${patientId}`, { method: 'GET' });
}

/**
 * ==========================================
 * PHASE 1 API METHODS (Owners & Patients)
 * ==========================================
 */

export async function listOwners(input: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<Owner>> {
  const queryString = toQueryString(input);
  const response = await apiFetch<unknown>(`/owners${queryString}`, { method: 'GET' });

  // Validate Response
  const schema = z.object({
    data: z.array(OwnerReadSchema),
    total: z.number()
  });

  const parsed = schema.safeParse(response);
  if (!parsed.success) {
    console.error('API Response Validation Failed (listOwners):', parsed.error);
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export async function createOwner(payload: OwnerCreate): Promise<Owner> {
  // Validate Request
  const payloadParse = OwnerCreateSchema.safeParse(payload);
  if (!payloadParse.success) {
    throw new ApiError('Invalid Request Payload', 400, payloadParse.error);
  }

  const response = await apiFetch<unknown>('/owners', {
    method: 'POST',
    body: JSON.stringify(payloadParse.data)
  });

  // Validate Response
  const parsed = OwnerReadSchema.safeParse(response);
  if (!parsed.success) {
    console.error('API Response Validation Failed (createOwner):', parsed.error);
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export async function getOwner(ownerId: string): Promise<Owner> {
  const response = await apiFetch<unknown>(`/owners/${ownerId}`, { method: 'GET' });

  const parsed = OwnerReadSchema.safeParse(response);
  if (!parsed.success) {
    console.error('API Response Validation Failed (getOwner):', parsed.error);
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export async function listPatients(input: {
  q?: string;
  ownerId?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<Patient>> {
  const queryString = toQueryString(input);
  const response = await apiFetch<unknown>(`/patients${queryString}`, { method: 'GET' });

  const schema = z.object({
    data: z.array(PatientReadSchema),
    total: z.number()
  });

  const parsed = schema.safeParse(response);
  if (!parsed.success) {
    console.error('API Response Validation Failed (listPatients):', parsed.error);
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export async function createPatient(payload: PatientCreate): Promise<Patient> {
  const payloadParse = PatientCreateSchema.safeParse(payload);
  if (!payloadParse.success) {
    throw new ApiError('Invalid Request Payload', 400, payloadParse.error);
  }

  const response = await apiFetch<unknown>('/patients', {
    method: 'POST',
    body: JSON.stringify(payloadParse.data)
  });

  const parsed = PatientReadSchema.safeParse(response);
  if (!parsed.success) {
    console.error('API Response Validation Failed (createPatient):', parsed.error);
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export async function getPatient(patientId: string): Promise<Patient> {
  const response = await apiFetch<unknown>(`/patients/${patientId}`, { method: 'GET' });

  const parsed = PatientReadSchema.safeParse(response);
  if (!parsed.success) {
    console.error('API Response Validation Failed (getPatient):', parsed.error);
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export async function getOwnerSummary(ownerId: string): Promise<OwnerSummaryResponse> {
  const response = await apiFetch<unknown>(`/owners/${ownerId}/summary`, { method: 'GET' });
  const parsed = ownerSummaryResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export function updateOwner(ownerId: string, payload: OwnerPatchInput): Promise<unknown> {
  return apiFetch(`/owners/${ownerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function getPatientSummary(patientId: string): Promise<PatientSummaryResponse> {
  const response = await apiFetch<unknown>(`/patients/${patientId}/summary`, { method: 'GET' });
  const parsed = patientSummaryResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new ApiError('Invalid API Response', 500, parsed.error);
  }

  return parsed.data;
}

export function updatePatient(patientId: string, payload: PatientPatchInput): Promise<unknown> {
  return apiFetch(`/patients/${patientId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function listEncounters(params: {
  patientId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<ListEncountersApiResponse> {
  const query = toQueryString(params);
  return apiFetch<unknown>(`/encounters${query}`, { method: 'GET' }).then((response) => {
    const parsed = listEncountersResponseSchema.safeParse(response);
    if (!parsed.success) {
      throw new ApiError('Invalid API Response', 500, parsed.error);
    }

    return {
      data: parsed.data.data.map((encounter) => ({
        id: encounter.id,
        accountId: encounter.accountId,
        patientId: encounter.patientId,
        ownerId: encounter.ownerId,
        status: encounter.status,
        openedByUserId: encounter.openedByUserId,
        closedByUserId: encounter.closedByUserId ?? null,
        openedAt: encounter.openedAt.toISOString(),
        closedAt: encounter.closedAt ? encounter.closedAt.toISOString() : null,
        reason: encounter.reason ?? null,
        createdAt: encounter.createdAt.toISOString(),
        updatedAt: encounter.updatedAt.toISOString()
      })),
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      total: parsed.data.total
    };
  });
}

export function createEncounter(payload: EncounterCreateInput): Promise<EncounterRecord> {
  return apiFetch<EncounterRecord>('/encounters', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getEncounter(encounterId: string): Promise<EncounterRecord> {
  return apiFetch<EncounterRecord>(`/encounters/${encounterId}`, { method: 'GET' });
}

export function getEncounterTimeline(encounterId: string): Promise<EncounterTimelineResponse> {
  return apiFetch<EncounterTimelineResponse>(`/encounters/${encounterId}/timeline`, {
    method: 'GET'
  });
}

export function getSoapTemplates(): Promise<SoapTemplatesResponse> {
  return apiFetch<SoapTemplatesResponse>('/soap-templates', { method: 'GET' });
}

export function createClinicalNote(
  encounterId: string,
  payload: NoteCreateInput
): Promise<ClinicalNoteRecord> {
  return apiFetch<ClinicalNoteRecord>(`/encounters/${encounterId}/notes`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getClinicalNote(noteId: string): Promise<ClinicalNoteRecord> {
  return apiFetch<ClinicalNoteRecord>(`/notes/${noteId}`, {
    method: 'GET'
  });
}

export function updateClinicalNote(noteId: string, payload: NoteMutationInput): Promise<ClinicalNoteRecord> {
  return apiFetch<ClinicalNoteRecord>(`/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function versionClinicalNote(
  noteId: string,
  payload: NoteMutationInput
): Promise<{
  note: ClinicalNoteRecord;
  event: unknown;
}> {
  return apiFetch(`/notes/${noteId}/version`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function signClinicalNote(noteId: string): Promise<{
  note: ClinicalNoteRecord;
  event: unknown;
}> {
  return apiFetch(`/notes/${noteId}/sign`, {
    method: 'POST'
  });
}

export function createDocument(payload: DocumentCreateInput): Promise<DocumentRecord> {
  return apiFetch<DocumentRecord>('/documents', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function attachDocumentToEncounter(
  encounterId: string,
  documentId: string
): Promise<EncounterDocumentRelation> {
  return apiFetch<EncounterDocumentRelation>(`/encounters/${encounterId}/documents`, {
    method: 'POST',
    body: JSON.stringify({ documentId })
  });
}

export function getWards(input: { page?: number; pageSize?: number; q?: string } = {}): Promise<WardListResponse> {
  const queryString = toQueryString({
    page: input.page,
    pageSize: input.pageSize,
    q: input.q
  });

  return apiFetch<WardListResponse>(`/wards${queryString}`, { method: 'GET' });
}

export function getBedMap(wardId: string): Promise<BedMapResponse> {
  const queryString = toQueryString({ wardId });
  return apiFetch<BedMapResponse>(`/beds/map${queryString}`, { method: 'GET' });
}

export function admitInpatient(payload: AdmitInpatientInput): Promise<InpatientStayRecord> {
  return apiFetch<InpatientStayRecord>('/inpatient/admit', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function transferInpatient(
  stayId: string,
  payload: TransferInpatientInput
): Promise<InpatientStayRecord> {
  return apiFetch<InpatientStayRecord>(`/inpatient/stays/${stayId}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function dischargeInpatient(
  stayId: string,
  payload: DischargeInpatientInput
): Promise<InpatientStayRecord> {
  return apiFetch<InpatientStayRecord>(`/inpatient/stays/${stayId}/discharge`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export type InpatientStaysListResponse = {
  data: InpatientStayRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export function listInpatientStays(input: {
  status?: InpatientStayRecord['status'];
  wardId?: string;
  page?: number;
  pageSize?: number;
}): Promise<InpatientStaysListResponse> {
  const queryString = toQueryString({
    status: input.status,
    wardId: input.wardId,
    page: input.page,
    pageSize: input.pageSize
  });

  return apiFetch<InpatientStaysListResponse>(`/inpatient/stays${queryString}`, {
    method: 'GET'
  });
}

export function getInpatientStay(stayId: string): Promise<InpatientStayRecord> {
  return apiFetch<InpatientStayRecord>(`/inpatient/stays/${stayId}`, {
    method: 'GET'
  });
}

// Inpatient Dashboard Types
export type InpatientDashboardStats = {
  totalWards: number;
  totalBeds: number;
  occupiedBeds: number;
  freeBeds: number;
  activeStays: number;
};

export type InpatientDashboardWard = {
  id: string;
  name: string;
  code: string | null;
  totalBeds: number;
  occupiedBeds: number;
};

export type InpatientDashboardPatient = {
  stayId: string;
  patientId: string;
  patientName: string | null;
  species: string | null;
  breed: string | null;
  ownerId: string;
  ownerName: string | null;
};

export type InpatientDashboardBed = {
  bedId: string;
  bedName: string;
  bedCode: string | null;
  wardId: string;
  status: 'free' | 'occupied';
  patient: InpatientDashboardPatient | null;
  admittedAt: string | null;
  chiefComplaint: string | null;
};

export type InpatientDashboardResponse = {
  stats: InpatientDashboardStats;
  wards: InpatientDashboardWard[];
  beds: InpatientDashboardBed[];
};

export function getInpatientDashboard(wardId?: string): Promise<InpatientDashboardResponse> {
  const queryString = toQueryString({ wardId });
  return apiFetch<InpatientDashboardResponse>(`/inpatient/dashboard${queryString}`, {
    method: 'GET'
  });
}

export function listMedicationOrders(input: {
  encounterId?: string;
  stayId?: string;
  status?: MedicationOrderStatus;
  page?: number;
  pageSize?: number;
}): Promise<MedicationOrdersListResponse> {
  const queryString = toQueryString({
    encounterId: input.encounterId,
    stayId: input.stayId,
    status: input.status,
    page: input.page,
    pageSize: input.pageSize
  });

  return apiFetch<MedicationOrdersListResponse>(`/medication-orders${queryString}`, {
    method: 'GET'
  });
}

export function createMedicationOrder(payload: MedicationOrderCreateInput): Promise<MedicationOrderRecord> {
  return apiFetch<MedicationOrderRecord>('/medication-orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateMedicationOrder(
  orderId: string,
  payload: MedicationOrderUpdateInput
): Promise<MedicationOrderRecord> {
  return apiFetch<MedicationOrderRecord>(`/medication-orders/${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function stopMedicationOrder(
  orderId: string,
  payload: MedicationOrderStopInput
): Promise<MedicationOrderRecord> {
  return apiFetch<MedicationOrderRecord>(`/medication-orders/${orderId}/stop`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function listMedicationAdministrations(input: {
  stayId?: string;
  orderId?: string;
  page?: number;
  pageSize?: number;
}): Promise<MedicationAdministrationsListResponse> {
  const queryString = toQueryString({
    stayId: input.stayId,
    orderId: input.orderId,
    page: input.page,
    pageSize: input.pageSize
  });

  return apiFetch<MedicationAdministrationsListResponse>(
    `/medication-administrations${queryString}`,
    {
      method: 'GET'
    }
  );
}

export function createMedicationAdministration(
  payload: MedicationAdministrationCreateInput
): Promise<MedicationAdministrationRecord> {
  return apiFetch<MedicationAdministrationRecord>('/medication-administrations', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function getMedicationDueDoses(input: {
  stayId?: string;
  windowMin?: number;
}): Promise<MedicationDueDosesResponse> {
  const queryString = toQueryString({
    stayId: input.stayId,
    windowMin: input.windowMin
  });

  return apiFetch<MedicationDueDosesResponse>(`/medication-doses/due${queryString}`, {
    method: 'GET'
  });
}

export function getMedicationLogs(stayId: string): Promise<MedicationLogsResponse> {
  const queryString = toQueryString({ stayId });
  return apiFetch<MedicationLogsResponse>(`/medication-logs${queryString}`, {
    method: 'GET'
  });
}



export type AlertsListResponse = {
  data: ClinicalAlert[];
  total: number;
};

export function getAlerts(input: {
  stayId?: string;
  type?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<AlertsListResponse> {
  const queryString = toQueryString({
    stayId: input.stayId,
    type: input.type,
    status: input.status,
    page: input.page,
    pageSize: input.pageSize
  });

  return apiFetch<AlertsListResponse>(`/alerts${queryString}`, {
    method: 'GET'
  });
}

export type HandoverShiftPeriod = 'day' | 'night' | 'custom';
export type HandoverStatus = 'draft' | 'published';
export type HandoverBuildStatus = 'pending' | 'building' | 'ready' | 'failed';

export type HandoverRecord = {
  id: string;
  accountId: string;
  wardId: string;
  status: HandoverStatus;
  shiftDate: string;
  shiftPeriod: HandoverShiftPeriod;
  publishedAt: string | null;
  publishedByUserId: string | null;
  buildStatus: HandoverBuildStatus;
  buildError: string | null;
  documentId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HandoverItemRecord = {
  id: string;
  accountId: string;
  handoverId: string;
  stayId: string;
  patientSnapshotJson: Record<string, unknown>;
  problemsJson: unknown[];
  planJson: unknown[];
  criticalMedsJson: unknown[];
  alertsJson: Record<string, unknown>;
  pendingJson: unknown[];
  escalationJson: Record<string, unknown>;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HandoverWithItemsResponse = {
  handover: HandoverRecord;
  items: HandoverItemRecord[];
};

export type CreateHandoverDraftItemInput = {
  stayId: string;
  patient_snapshot_json?: Record<string, unknown>;
  problems_json: Array<string | Record<string, unknown>>;
  plan_json: Array<string | Record<string, unknown>>;
  critical_meds_json?: Array<string | Record<string, unknown>>;
  alerts_json?: Record<string, unknown>;
  pending_json?: Array<string | Record<string, unknown>>;
  escalation_json: Record<string, unknown>;
  notes?: string;
};

export type CreateHandoverDraftInput = {
  wardId: string;
  shiftDate: string;
  shiftPeriod: HandoverShiftPeriod;
  items: CreateHandoverDraftItemInput[];
};

export type PublishHandoverResponse = HandoverWithItemsResponse & {
  queue: string;
  jobId: string;
};

export type HandoverDocumentRecord = {
  id: string;
  accountId: string;
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdByUserId: string;
  createdAt: string;
};

export type AuditEventRecord = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_roles: string[] | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: unknown;
  after_json: unknown;
  reason: string | null;
  request_id: string | null;
};

export type AuditEventsResponse = {
  page: number;
  pageSize: number;
  total: number;
  data: AuditEventRecord[];
};

export function createHandoverDraft(
  payload: CreateHandoverDraftInput
): Promise<HandoverWithItemsResponse> {
  return apiFetch<HandoverWithItemsResponse>('/handovers/draft', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function publishHandover(handoverId: string): Promise<PublishHandoverResponse> {
  return apiFetch<PublishHandoverResponse>(`/handovers/${handoverId}/publish`, {
    method: 'POST'
  });
}

export function getHandoverById(handoverId: string): Promise<HandoverWithItemsResponse> {
  return apiFetch<HandoverWithItemsResponse>(`/handovers/${handoverId}`, {
    method: 'GET'
  });
}

export function getLatestHandoverByWard(wardId: string): Promise<HandoverWithItemsResponse> {
  const queryString = toQueryString({ wardId });
  return apiFetch<HandoverWithItemsResponse>(`/handovers/latest${queryString}`, {
    method: 'GET'
  });
}

export function getHandoverDocument(handoverId: string): Promise<HandoverDocumentRecord> {
  return apiFetch<HandoverDocumentRecord>(`/handovers/${handoverId}/document`, {
    method: 'GET'
  });
}

export function getAuditEvents(input: {
  entityType?: string;
  entityId?: string;
  page?: number;
  pageSize?: number;
}): Promise<AuditEventsResponse> {
  const queryString = toQueryString({
    entity_type: input.entityType,
    entity_id: input.entityId,
    page: input.page,
    pageSize: input.pageSize
  });

  return apiFetch<AuditEventsResponse>(`/audit${queryString}`, {
    method: 'GET'
  });
}

// ==========================================
// PROTOCOLS API
// ==========================================

export type ProtocolsListResponse = {
  data: ProtocolRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type ProtocolCreateInput = {
  slug: string;
  title: string;
  description?: string;
  species?: string;
  ranges?: ProtocolRecordRange[];
};

export type ProtocolUpdateInput = {
  slug?: string;
  title?: string;
  description?: string | null;
  species?: string | null;
  ranges?: ProtocolRecordRange[];
};

export function listProtocols(input: {
  q?: string;
  status?: ProtocolStatus;
  page?: number;
  pageSize?: number;
}): Promise<ProtocolsListResponse> {
  const queryString = toQueryString({
    q: input.q,
    status: input.status,
    page: input.page,
    pageSize: input.pageSize
  });

  return apiFetch<ProtocolsListResponse>(`/protocols${queryString}`, {
    method: 'GET'
  });
}

export function getProtocol(protocolId: string): Promise<ProtocolRecord> {
  return apiFetch<ProtocolRecord>(`/protocols/${protocolId}`, {
    method: 'GET'
  });
}

export function createProtocol(payload: ProtocolCreateInput): Promise<ProtocolRecord> {
  return apiFetch<ProtocolRecord>('/protocols', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProtocol(protocolId: string, payload: ProtocolUpdateInput): Promise<ProtocolRecord> {
  return apiFetch<ProtocolRecord>(`/protocols/${protocolId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

// ==========================================
// LABORATORY API
// ==========================================

export type LabTestRecord = {
  id: string;
  name: string;
  code: string | null;
  category: string | null;
  isActive: boolean;
};

export type LabOrderRecord = {
  id: string;
  patientId: string;
  status: 'draft' | 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  requestingProviderId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LabTestsListResponse = {
  data: LabTestRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type LabOrdersListResponse = {
  data: LabOrderRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type LabOrderCreateInput = {
  patientId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  notes?: string;
  items: Array<{
    testId: string;
    notes?: string;
  }>;
};

export function listLabTests(input?: { q?: string; page?: number; pageSize?: number }): Promise<LabTestsListResponse> {
  const query = toQueryString(input || {});
  return apiFetch<LabTestsListResponse>(`/laboratory/tests${query}`, { method: 'GET' });
}

export function listLabOrders(input?: { patientId?: string; status?: string; page?: number; pageSize?: number }): Promise<LabOrdersListResponse> {
  const query = toQueryString(input || {});
  return apiFetch<LabOrdersListResponse>(`/laboratory/orders${query}`, { method: 'GET' });
}

export function createLabOrder(payload: LabOrderCreateInput): Promise<{ order: LabOrderRecord; items: any[] }> {
  return apiFetch<{ order: LabOrderRecord; items: any[] }>('/laboratory/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ==========================================
// IMAGING API
// ==========================================

export type ImagingModalityRecord = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
};

export type ImagingOrderRecord = {
  id: string;
  patientId: string;
  modalityId: string;
  status: 'draft' | 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  clinicalIndication: string | null;
  createdAt: string;
};

export type ImagingModalitiesListResponse = {
  data: ImagingModalityRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type ImagingOrdersListResponse = {
  data: ImagingOrderRecord[];
  page: number;
  pageSize: number;
  total: number;
};

export type ImagingOrderCreateInput = {
  patientId: string;
  modalityId: string;
  priority?: 'routine' | 'urgent' | 'stat';
  clinicalIndication?: string;
};

export function listImagingModalities(input?: { q?: string; page?: number; pageSize?: number }): Promise<ImagingModalitiesListResponse> {
  const query = toQueryString(input || {});
  return apiFetch<ImagingModalitiesListResponse>(`/imaging/modalities${query}`, { method: 'GET' });
}

export function listImagingOrders(input?: { patientId?: string; status?: string; page?: number; pageSize?: number }): Promise<ImagingOrdersListResponse> {
  const query = toQueryString(input || {});
  return apiFetch<ImagingOrdersListResponse>(`/imaging/orders${query}`, { method: 'GET' });
}

export function createImagingOrder(payload: ImagingOrderCreateInput): Promise<ImagingOrderRecord> {
  return apiFetch<ImagingOrderRecord>('/imaging/orders', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
