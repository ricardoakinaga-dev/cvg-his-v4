/**
 * Wards API Client
 * 
 * Provides functions for interacting with the wards API endpoints
 */

import { apiClient } from './client';

// Types
export type Ward = {
  id: string;
  accountId: string;
  name: string;
  code: string;
  type: 'clinical' | 'surgery' | 'icu' | 'isolation';
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WardCreateInput = {
  name: string;
  code: string;
  type?: string;
  description?: string | null;
  active?: boolean;
};

export type WardUpdateInput = Partial<WardCreateInput>;

export type ListWardsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
};

export type ListWardsResponse = {
  data: Ward[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List wards with pagination and filters
 */
export async function listWards(params: ListWardsParams = {}): Promise<ListWardsResponse> {
  return apiClient<ListWardsResponse>('/wards', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      q: params.q
    }
  });
}

/**
 * Create a new ward
 */
export async function createWard(input: WardCreateInput): Promise<Ward> {
  return apiClient<Ward>('/wards', { method: 'POST', body: input });
}

/**
 * Update a ward
 */
export async function updateWard(id: string, input: WardUpdateInput): Promise<Ward> {
  return apiClient<Ward>(`/wards/${id}`, { method: 'PATCH', body: input });
}
