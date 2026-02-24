/**
 * Medication Orders API Client
 * 
 * Provides functions for interacting with the medication orders API endpoints
 */

import { apiClient } from './client';

// Types
export type MedicationOrder = {
  id: string;
  accountId: string;
  patientId: string;
  patientName?: string;
  stayId: string | null;
  encounterId: string | null;
  medicationName: string;
  medicationId: string | null;
  dosage: string;
  dosageUnit: string;
  route: string;
  frequency: string;
  duration: string | null;
  startDate: string;
  endDate: string | null;
  instructions: string | null;
  prescriberId: string | null;
  prescriberName?: string;
  status: 'active' | 'stopped' | 'completed' | 'cancelled';
  stoppedAt: string | null;
  stoppedBy: string | null;
  stopReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MedicationOrderCreateInput = {
  patientId: string;
  stayId?: string;
  encounterId?: string;
  medicationName: string;
  medicationId?: string;
  dosage: string;
  dosageUnit: string;
  route: string;
  frequency: string;
  duration?: string;
  startDate: string;
  endDate?: string;
  instructions?: string;
  prescriberId?: string;
};

export type MedicationOrderUpdateInput = Partial<Omit<MedicationOrderCreateInput, 'patientId'>>;

export type MedicationOrderStopInput = {
  reason: string;
};

export type ListMedicationOrdersParams = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  stayId?: string;
  encounterId?: string;
  status?: string;
};

export type ListMedicationOrdersResponse = {
  data: MedicationOrder[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List medication orders with pagination and filters
 */
export async function listMedicationOrders(params: ListMedicationOrdersParams = {}): Promise<ListMedicationOrdersResponse> {
  return apiClient<ListMedicationOrdersResponse>('/medication-orders', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      patientId: params.patientId,
      stayId: params.stayId,
      encounterId: params.encounterId,
      status: params.status
    }
  });
}

/**
 * Get a medication order by ID
 */
export async function getMedicationOrder(id: string): Promise<MedicationOrder> {
  return apiClient<MedicationOrder>(`/medication-orders/${id}`);
}

/**
 * Create a new medication order
 */
export async function createMedicationOrder(input: MedicationOrderCreateInput): Promise<MedicationOrder> {
  return apiClient<MedicationOrder>('/medication-orders', { method: 'POST', body: input });
}

/**
 * Update a medication order
 */
export async function updateMedicationOrder(id: string, input: MedicationOrderUpdateInput): Promise<MedicationOrder> {
  return apiClient<MedicationOrder>(`/medication-orders/${id}`, { method: 'PATCH', body: input });
}

/**
 * Stop a medication order
 */
export async function stopMedicationOrder(id: string, input: MedicationOrderStopInput): Promise<MedicationOrder> {
  return apiClient<MedicationOrder>(`/medication-orders/${id}/stop`, { method: 'POST', body: input });
}
