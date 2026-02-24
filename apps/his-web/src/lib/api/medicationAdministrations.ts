/**
 * Medication Administrations API Client
 * 
 * Provides functions for interacting with the medication administrations API endpoints
 */

import { apiClient } from './client';

// Types
export type MedicationAdministration = {
  id: string;
  accountId: string;
  orderId: string;
  stayId: string | null;
  encounterId: string | null;
  patientId: string;
  patientName?: string;
  status: 'scheduled' | 'administered' | 'refused' | 'delayed' | 'cancelled';
  scheduledAt: string | null;
  effectiveAt: string | null;
  administeredBy: string | null;
  administeredByName?: string;
  doseGiven: string | null;
  doseUnit: string | null;
  route: string | null;
  site: string | null;
  reason: string | null;
  notes: string | null;
  patientConfirmation?: {
    patientId: string;
    confirmedByName: string;
    confirmedBySpecies: string;
  };
  createdAt: string;
  updatedAt: string;
};

export type MedicationAdministrationCreateInput = {
  orderId: string;
  stayId?: string;
  encounterId?: string;
  status: string;
  scheduledAt?: string;
  effectiveAt?: string;
  doseGiven?: string;
  doseUnit?: string;
  route?: string;
  site?: string;
  reason?: string;
  notes?: string;
  patientConfirmation?: {
    patientId: string;
    confirmedByName: string;
    confirmedBySpecies: string;
  };
};

export type ListMedicationAdministrationsParams = {
  page?: number;
  pageSize?: number;
  stayId?: string;
  orderId?: string;
};

export type ListMedicationAdministrationsResponse = {
  data: MedicationAdministration[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List medication administrations with pagination and filters
 */
export async function listMedicationAdministrations(params: ListMedicationAdministrationsParams = {}): Promise<ListMedicationAdministrationsResponse> {
  return apiClient<ListMedicationAdministrationsResponse>('/medication-administrations', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      stayId: params.stayId,
      orderId: params.orderId
    }
  });
}

/**
 * Record a medication administration
 */
export async function recordMedicationAdministration(input: MedicationAdministrationCreateInput): Promise<MedicationAdministration> {
  return apiClient<MedicationAdministration>('/medication-administrations', { method: 'POST', body: input });
}
