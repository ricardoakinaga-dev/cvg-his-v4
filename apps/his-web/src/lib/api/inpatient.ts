/**
 * Inpatient API Client
 * 
 * Provides functions for interacting with the inpatient API endpoints
 */

import { apiClient } from './client';

// Types
export type InpatientStay = {
  id: string;
  accountId: string;
  patientId: string;
  patientName?: string;
  ownerId?: string;
  ownerName?: string;
  wardId: string;
  wardName?: string;
  bedId: string;
  bedName?: string;
  status: 'active' | 'discharged';
  admittedAt: string;
  dischargedAt: string | null;
  chiefComplaint: string | null;
  reason: string | null;
  planSummary: string | null;
  dischargeSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InpatientDashboard = {
  wards: Array<{
    id: string;
    name: string;
    totalBeds: number;
    occupiedBeds: number;
    freeBeds: number;
  }>;
  totalOccupied: number;
  totalFree: number;
};

export type AdmitInput = {
  patientId: string;
  wardId: string;
  bedId: string;
  encounterId?: string;
  chiefComplaint?: string;
  reason?: string;
  planSummary?: string;
};

export type TransferInput = {
  toWardId: string;
  toBedId: string;
  reason?: string;
};

export type DischargeInput = {
  dischargeSummary?: string;
};

export type ListStaysParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  wardId?: string;
};

export type ListStaysResponse = {
  data: InpatientStay[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Admit a patient
 */
export async function admitPatient(input: AdmitInput): Promise<InpatientStay> {
  return apiClient<InpatientStay>('/inpatient/admit', { method: 'POST', body: input });
}

/**
 * List inpatient stays
 */
export async function listStays(params: ListStaysParams = {}): Promise<ListStaysResponse> {
  return apiClient<ListStaysResponse>('/inpatient/stays', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      status: params.status,
      wardId: params.wardId
    }
  });
}

/**
 * Get a stay by ID
 */
export async function getStay(id: string): Promise<InpatientStay> {
  return apiClient<InpatientStay>(`/inpatient/stays/${id}`);
}

/**
 * Transfer a patient to another bed/ward
 */
export async function transferPatient(id: string, input: TransferInput): Promise<InpatientStay> {
  return apiClient<InpatientStay>(`/inpatient/stays/${id}/transfer`, { method: 'POST', body: input });
}

/**
 * Discharge a patient
 */
export async function dischargePatient(id: string, input: DischargeInput = {}): Promise<InpatientStay> {
  return apiClient<InpatientStay>(`/inpatient/stays/${id}/discharge`, { method: 'POST', body: input });
}

/**
 * Get inpatient dashboard
 */
export async function getInpatientDashboard(wardId?: string): Promise<InpatientDashboard> {
  return apiClient<InpatientDashboard>('/inpatient/dashboard', {
    params: { wardId }
  });
}

/**
 * Get inpatient panel (compatibility route)
 */
export async function getInpatientPanel(wardId?: string): Promise<InpatientDashboard> {
  return apiClient<InpatientDashboard>('/inpatient/panel', {
    params: { wardId }
  });
}
