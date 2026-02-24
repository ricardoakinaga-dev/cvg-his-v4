/**
 * Encounters API Client
 * 
 * Provides functions for interacting with the encounters API endpoints
 */

import { apiClient } from './client';

// Types
export type Encounter = {
  id: string;
  accountId: string;
  patientId: string;
  patientName?: string;
  ownerId?: string;
  ownerName?: string;
  type: string;
  status: 'open' | 'closed' | 'cancelled';
  openedAt: string;
  closedAt: string | null;
  closedBy: string | null;
  closeReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EncounterTimeline = {
  encounter: Encounter;
  notes: Array<{
    id: string;
    type: string;
    content: string;
    authorName: string;
    createdAt: string;
    signedAt: string | null;
  }>;
  documents: Array<{
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    createdAt: string;
  }>;
  events: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
};

export type EncounterCreateInput = {
  patientId: string;
  type: string;
  notes?: string | null;
};

export type EncounterCloseInput = {
  reason?: string | null;
};

export type ListEncountersParams = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  ownerId?: string;
  status?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
};

export type ListEncountersResponse = {
  data: Encounter[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List encounters with pagination and filters
 */
export async function listEncounters(params: ListEncountersParams = {}): Promise<ListEncountersResponse> {
  return apiClient<ListEncountersResponse>('/encounters', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      patientId: params.patientId,
      ownerId: params.ownerId,
      status: params.status,
      type: params.type,
      startDate: params.startDate,
      endDate: params.endDate
    }
  });
}

/**
 * Get an encounter by ID
 */
export async function getEncounter(id: string): Promise<Encounter> {
  return apiClient<Encounter>(`/encounters/${id}`);
}

/**
 * Get encounter timeline with related data
 */
export async function getEncounterTimeline(id: string): Promise<EncounterTimeline> {
  return apiClient<EncounterTimeline>(`/encounters/${id}/timeline`);
}

/**
 * Create a new encounter
 */
export async function createEncounter(input: EncounterCreateInput): Promise<Encounter> {
  return apiClient<Encounter>('/encounters', { method: 'POST', body: input });
}

/**
 * Close an encounter
 */
export async function closeEncounter(id: string, input: EncounterCloseInput = {}): Promise<{ encounter: Encounter; billingItemCount: number; billingTotal: string }> {
  return apiClient<{ encounter: Encounter; billingItemCount: number; billingTotal: string }>(`/encounters/${id}/close`, { method: 'POST', body: input });
}
