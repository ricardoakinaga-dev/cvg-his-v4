import { apiRequest } from './api';
import type {
  AcknowledgeClinicalHandoffRequest,
  ClinicalHandoffListFilters,
  ClinicalHandoffListResponse,
  ClinicalHandoffSummary,
  MarkClinicalHandoffPendingRequest,
  ResolveClinicalHandoffPendingRequest,
  ReturnClinicalHandoffToClinicRequest,
  SendClinicalHandoffToFinanceRequest,
  SendClinicalHandoffRequest
} from '@/types/clinicalHandoff';

function buildQuery(filters: ClinicalHandoffListFilters = {}): string {
  const params = new URLSearchParams();

  if (filters.handoffStatus) params.set('handoffStatus', filters.handoffStatus);
  if (filters.encounterId) params.set('encounterId', filters.encounterId);
  if (filters.ownerId) params.set('ownerId', filters.ownerId);
  if (filters.patientId) params.set('patientId', filters.patientId);
  if (filters.priority) params.set('priority', filters.priority);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export const clinicalHandoffService = {
  async list(filters: ClinicalHandoffListFilters = {}): Promise<ClinicalHandoffSummary[]> {
    const response = await apiRequest<ClinicalHandoffListResponse>(
      `/clinical-handoffs${buildQuery(filters)}`
    );
    return response.items ?? [];
  },

  async sendToReception(payload: SendClinicalHandoffRequest): Promise<ClinicalHandoffSummary> {
    return apiRequest<ClinicalHandoffSummary>('/clinical-handoffs/send-to-reception', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async acknowledge(
    id: string,
    payload: AcknowledgeClinicalHandoffRequest = {}
  ): Promise<ClinicalHandoffSummary> {
    return apiRequest<ClinicalHandoffSummary>(`/clinical-handoffs/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async markPending(
    id: string,
    payload: MarkClinicalHandoffPendingRequest
  ): Promise<ClinicalHandoffSummary> {
    return apiRequest<ClinicalHandoffSummary>(`/clinical-handoffs/${id}/pending`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async resolvePending(
    id: string,
    issueId: string,
    payload: ResolveClinicalHandoffPendingRequest
  ): Promise<ClinicalHandoffSummary> {
    return apiRequest<ClinicalHandoffSummary>(
      `/clinical-handoffs/${id}/pending/${issueId}/resolve`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  },

  async returnToClinic(
    id: string,
    payload: ReturnClinicalHandoffToClinicRequest
  ): Promise<ClinicalHandoffSummary> {
    return apiRequest<ClinicalHandoffSummary>(`/clinical-handoffs/${id}/return-to-clinic`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async sendToFinance(
    id: string,
    payload: SendClinicalHandoffToFinanceRequest = {}
  ): Promise<ClinicalHandoffSummary> {
    return apiRequest<ClinicalHandoffSummary>(`/clinical-handoffs/${id}/send-to-finance`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
