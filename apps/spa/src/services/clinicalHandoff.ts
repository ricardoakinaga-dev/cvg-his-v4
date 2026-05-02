import { apiRequest } from './api';
import type {
  AcknowledgeClinicalHandoffRequest,
  ClinicalHandoffListFilters,
  ClinicalHandoffListResponse,
  ClinicalHandoffSummary,
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
  }
};
