import { apiRequest } from './api';
import type {
  MedicalRecordSummary,
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  EntryRevisionSummary,
  CreateClinicalEntryRequest,
  UpdateClinicalEntryRequest,
  ArchiveClinicalEntryRequest,
  MedicalRecordResponse,
  ClinicalEntryListResponse,
  ClinicalTimelineResponse,
  EntryRevisionListResponse,
  MedicalRecordListSummary,
  MedicalRecordsListResponse
} from '@/types/medicalRecords';

export interface MedicalRecordsMutationOptions {
  readonly idempotencyKey?: string;
}

export interface MedicalRecordsEntryListOptions {
  readonly includeArchived?: boolean;
}

export const medicalRecordsService = {
  async listAll(): Promise<MedicalRecordListSummary[]> {
    const response = await apiRequest<MedicalRecordsListResponse>('/medical-records');
    return response.items ?? [];
  },

  async getByEncounter(encounterId: string): Promise<MedicalRecordResponse> {
    return apiRequest<MedicalRecordResponse>(
      `/medical-records?encounterId=${encodeURIComponent(encounterId)}`
    );
  },

  async listEntries(
    encounterId: string,
    options?: MedicalRecordsEntryListOptions
  ): Promise<ClinicalEntrySummary[]> {
    const query = new URLSearchParams({ encounterId });
    if (options?.includeArchived) query.set('includeArchived', 'true');
    const response = await apiRequest<ClinicalEntryListResponse>(
      `/medical-records/entries?${query.toString()}`
    );
    return response.items ?? [];
  },

  async createEntry(
    payload: CreateClinicalEntryRequest,
    options?: MedicalRecordsMutationOptions
  ): Promise<ClinicalEntrySummary> {
    return apiRequest<ClinicalEntrySummary>('/medical-records/entries', {
      method: 'POST',
      ...(options?.idempotencyKey
        ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
        : {}),
      body: JSON.stringify(payload)
    });
  },

  async updateEntry(
    entryId: string,
    payload: UpdateClinicalEntryRequest,
    options?: MedicalRecordsMutationOptions
  ): Promise<ClinicalEntrySummary> {
    return apiRequest<ClinicalEntrySummary>(`/medical-records/entries/${entryId}`, {
      method: 'PATCH',
      ...(options?.idempotencyKey
        ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
        : {}),
      body: JSON.stringify(payload)
    });
  },

  async archiveEntry(
    entryId: string,
    payload: ArchiveClinicalEntryRequest,
    options?: MedicalRecordsMutationOptions
  ): Promise<ClinicalEntrySummary> {
    return apiRequest<ClinicalEntrySummary>(`/medical-records/entries/${entryId}`, {
      method: 'DELETE',
      ...(options?.idempotencyKey
        ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
        : {}),
      body: JSON.stringify(payload)
    });
  },

  async getTimeline(encounterId: string): Promise<ClinicalTimelineEventSummary[]> {
    const response = await apiRequest<ClinicalTimelineResponse>(
      `/medical-records/timeline?encounterId=${encodeURIComponent(encounterId)}`
    );
    return response.items ?? [];
  },

  async getRevisions(entryId: string): Promise<EntryRevisionSummary[]> {
    const response = await apiRequest<EntryRevisionListResponse>(
      `/medical-records/entries/${entryId}/revisions`
    );
    return response.items ?? [];
  }
};
