import { apiRequest } from './api';
import type { SurgeryCaseSummary, SurgeryStatus } from '@/types/surgery';

export const surgeryService = {
  async listByEncounter(encounterId: string): Promise<SurgeryCaseSummary[]> {
    const response = await apiRequest<{ items: SurgeryCaseSummary[] }>(
      `/surgeries?encounterId=${encodeURIComponent(encounterId)}`
    );
    return response.items;
  },

  async createRequest(payload: {
    encounterId: string;
    patientId: string;
    procedureName: string;
    surgeonUserId?: string;
    surgicalTeam?: string[];
    preparationNotes?: string;
    scheduledAt?: string;
  }): Promise<SurgeryCaseSummary> {
    return apiRequest<SurgeryCaseSummary>('/surgeries', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateStatus(
    surgeryCaseId: string,
    status: SurgeryStatus,
    operativeNotes?: string
  ): Promise<SurgeryCaseSummary> {
    return apiRequest<SurgeryCaseSummary>(`/surgeries/${surgeryCaseId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status, operativeNotes })
    });
  }
};
