/**
 * Patients API Client
 * 
 * Provides functions for interacting with the patients API endpoints
 */

import { apiClient } from './client';

// Types
export type Patient = {
  id: string;
  accountId: string;
  ownerId: string;
  ownerName?: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string | null;
  birthDate: string | null;
  weight: string | null;
  microchip: string | null;
  color: string | null;
  coat: string | null;
  isNeutered: boolean;
  neuteredDate: string | null;
  notes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type PatientSummary = {
  patient: Patient;
  recentEncounters: Array<{
    id: string;
    date: string;
    type: string;
    status: string;
    summary: string | null;
  }>;
  allergies: Array<{
    id: string;
    allergen: string;
    reaction: string | null;
    severity: string | null;
  }>;
  vaccines: Array<{
    id: string;
    vaccineName: string;
    applicationDate: string;
    nextDoseDate: string | null;
  }>;
  alerts: Array<{
    id: string;
    alertType: string;
    message: string;
    isActive: boolean;
  }>;
};

export type PatientCreateInput = {
  ownerId: string;
  name: string;
  species: string;
  breed?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  weight?: number | null;
  microchip?: string | null;
  color?: string | null;
  coat?: string | null;
  isNeutered?: boolean;
  neuteredDate?: string | null;
  notes?: string | null;
  active?: boolean;
};

export type PatientUpdateInput = Partial<PatientCreateInput>;

export type ListPatientsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  ownerId?: string;
  species?: string;
  active?: boolean;
};

export type ListPatientsResponse = {
  data: Patient[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List patients with pagination and filters
 */
export async function listPatients(params: ListPatientsParams = {}): Promise<ListPatientsResponse> {
  return apiClient<ListPatientsResponse>('/patients', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      q: params.q,
      ownerId: params.ownerId,
      species: params.species,
      active: params.active
    }
  });
}

/**
 * Get a patient by ID
 */
export async function getPatient(id: string): Promise<Patient> {
  return apiClient<Patient>(`/patients/${id}`);
}

/**
 * Get patient summary with related data
 */
export async function getPatientSummary(id: string): Promise<PatientSummary> {
  return apiClient<PatientSummary>(`/patients/${id}/summary`);
}

/**
 * Create a new patient
 */
export async function createPatient(input: PatientCreateInput): Promise<Patient> {
  return apiClient<Patient>('/patients', { method: 'POST', body: input });
}

/**
 * Update a patient
 */
export async function updatePatient(id: string, input: PatientUpdateInput): Promise<Patient> {
  return apiClient<Patient>(`/patients/${id}`, { method: 'PATCH', body: input });
}
