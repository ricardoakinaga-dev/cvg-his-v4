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

  async listEntries(encounterId: string): Promise<ClinicalEntrySummary[]> {
    const response = await apiRequest<ClinicalEntryListResponse>(
      `/medical-records/entries?encounterId=${encodeURIComponent(encounterId)}`
    );
    return response.items ?? [];
  },

  async createEntry(payload: CreateClinicalEntryRequest): Promise<ClinicalEntrySummary> {
    return apiRequest<ClinicalEntrySummary>('/medical-records/entries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateEntry(
    entryId: string,
    payload: UpdateClinicalEntryRequest
  ): Promise<ClinicalEntrySummary> {
    return apiRequest<ClinicalEntrySummary>(`/medical-records/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async archiveEntry(
    entryId: string,
    payload: ArchiveClinicalEntryRequest
  ): Promise<ClinicalEntrySummary> {
    return apiRequest<ClinicalEntrySummary>(`/medical-records/entries/${entryId}/archive`, {
      method: 'DELETE',
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
