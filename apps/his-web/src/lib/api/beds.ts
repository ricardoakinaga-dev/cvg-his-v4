/**
 * Beds API Client
 * 
 * Provides functions for interacting with the beds API endpoints
 */

import { apiClient } from './client';

// Types
export type Bed = {
  id: string;
  accountId: string;
  wardId: string;
  wardName?: string;
  name: string;
  type: 'regular' | 'icu' | 'isolation' | 'surgery';
  status: 'available' | 'occupied' | 'maintenance' | 'reserved';
  currentStayId: string | null;
  currentPatientId: string | null;
  currentPatientName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BedCreateInput = {
  wardId: string;
  name: string;
  type?: string;
  status?: string;
  active?: boolean;
};

export type BedUpdateInput = Partial<BedCreateInput>;

export type ListBedsParams = {
  page?: number;
  pageSize?: number;
  wardId?: string;
  q?: string;
};

export type ListBedsResponse = {
  data: Bed[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List beds with pagination and filters
 */
export async function listBeds(params: ListBedsParams = {}): Promise<ListBedsResponse> {
  return apiClient<ListBedsResponse>('/beds', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      wardId: params.wardId,
      q: params.q
    }
  });
}

/**
 * Create a new bed
 */
export async function createBed(input: BedCreateInput): Promise<Bed> {
  return apiClient<Bed>('/beds', { method: 'POST', body: input });
}

/**
 * Update a bed
 */
export async function updateBed(id: string, input: BedUpdateInput): Promise<Bed> {
  return apiClient<Bed>(`/beds/${id}`, { method: 'PATCH', body: input });
}
