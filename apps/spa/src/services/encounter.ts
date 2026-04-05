import { apiRequest } from './api';
import type {
  EncounterSummary,
  CreateEncounterRequest,
  TransitionEncounterRequest,
  CloseEncounterRequest,
  EncountersListResponse,
  EncounterTimelineResponse
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
  }
};
