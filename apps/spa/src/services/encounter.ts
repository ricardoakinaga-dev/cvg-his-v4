import { apiRequest } from './api';
import type {
  EncounterSummary,
  CreateEncounterRequest,
  TransitionEncounterRequest,
  CloseEncounterRequest,
  EncountersListResponse,
  EncounterTimelineResponse,
  EncounterSummaryResponse,
  EncounterFinancialSummary
} from '@/types/encounter';

export const encounterService = {
  async list(): Promise<EncounterSummary[]> {
    const response = await apiRequest<EncountersListResponse>('/encounters');
    return response.items ?? [];
  },

  async getById(id: string): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>(`/encounters/${id}`);
  },

  async create(payload: CreateEncounterRequest): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>('/encounters', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async transition(id: string, payload: TransitionEncounterRequest): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>(`/encounters/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async close(id: string, payload: CloseEncounterRequest): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>(`/encounters/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getTimeline(id: string): Promise<EncounterTimelineResponse['items']> {
    const response = await apiRequest<EncounterTimelineResponse>(`/encounters/${id}/timeline`);
    return response.items ?? [];
  },

  async getSummary(id: string): Promise<EncounterSummaryResponse> {
    return apiRequest<EncounterSummaryResponse>(`/encounters/${id}/summary`);
  },

  async getFinancialSummary(id: string): Promise<EncounterFinancialSummary> {
    return apiRequest<EncounterFinancialSummary>(`/encounters/${id}/financial-summary`);
  },

  async closeFinancial(
    id: string,
    payload: {
      paidAmount: number;
      notes?: string | null;
      installments?: Array<{ label?: string; amount: number; dueAt?: string | null; notes?: string | null }>;
    }
  ): Promise<EncounterFinancialSummary> {
    return apiRequest<EncounterFinancialSummary>(`/encounters/${id}/financial-close`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
