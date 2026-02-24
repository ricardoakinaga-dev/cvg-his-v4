/**
 * Owners API Client
 * 
 * Provides functions for interacting with the owners API endpoints
 */

import { apiClient } from './client';

// Types
export type Owner = {
  id: string;
  accountId: string;
  name: string;
  documentType: string | null;
  document: string | null;
  email: string | null;
  phoneMain: string | null;
  phoneSecondary: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OwnerSummary = {
  owner: Owner;
  patients: Array<{
    id: string;
    name: string;
    species: string;
    breed: string | null;
    active: boolean;
  }>;
  recentEncounters: Array<{
    id: string;
    date: string;
    patientName: string;
    type: string;
    status: string;
  }>;
  balance: string;
};

export type OwnerCreateInput = {
  name: string;
  documentType?: string | null;
  document?: string | null;
  email?: string | null;
  phoneMain?: string | null;
  phoneSecondary?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type OwnerUpdateInput = Partial<OwnerCreateInput>;

export type ListOwnersParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  active?: boolean;
};

export type ListOwnersResponse = {
  data: Owner[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List owners with pagination and filters
 */
export async function listOwners(params: ListOwnersParams = {}): Promise<ListOwnersResponse> {
  return apiClient<ListOwnersResponse>('/owners', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      q: params.q,
      active: params.active
    }
  });
}

/**
 * Get an owner by ID
 */
export async function getOwner(id: string): Promise<Owner> {
  return apiClient<Owner>(`/owners/${id}`);
}

/**
 * Get owner summary with related data
 */
export async function getOwnerSummary(id: string): Promise<OwnerSummary> {
  return apiClient<OwnerSummary>(`/owners/${id}/summary`);
}

/**
 * Create a new owner
 */
export async function createOwner(input: OwnerCreateInput): Promise<Owner> {
  return apiClient<Owner>('/owners', { method: 'POST', body: input });
}

/**
 * Update an owner
 */
export async function updateOwner(id: string, input: OwnerUpdateInput): Promise<Owner> {
  return apiClient<Owner>(`/owners/${id}`, { method: 'PATCH', body: input });
}
