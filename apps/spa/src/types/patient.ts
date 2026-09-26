import type { PatientListResponse } from '@cvg-his-v2/shared-contracts';
import type { PatientAllergy } from '@cvg-his-v2/shared-types';
export type { PatientAllergy };

export type PatientSex = 'male' | 'female' | 'unknown';
export type PatientSize = 'small' | 'medium' | 'large';
export type PatientStatus = 'active' | 'inactive' | 'deceased';

export interface PatientSummary {
  id: string;
  accountId: string;
  name: string;
  species: string;
  breed?: string;
  sex: PatientSex;
  size?: PatientSize;
  baseWeightKg?: number;
  birthDateApproximate?: string;
  isNeutered?: boolean;
  microchip?: string;
  pedigreeNumber?: string;
  color?: string;
  chronicDisease?: string;
  allergy?: string;
  allergies?: PatientAllergy[];
  temperament?: string;
  generalNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
  primaryOwnerId: string;
  status: PatientStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePatientRequest {
  name: string;
  species: string;
  breed?: string;
  sex: PatientSex;
  size?: PatientSize;
  baseWeightKg?: number;
  birthDateApproximate?: string;
  isNeutered?: boolean;
  microchip?: string;
  pedigreeNumber?: string;
  color?: string;
  chronicDisease?: string;
  allergy?: string;
  allergies?: PatientAllergy[];
  temperament?: string;
  generalNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
  primaryOwnerId: string;
  status?: PatientStatus;
}

export interface UpdatePatientRequest {
  name?: string;
  species?: string;
  breed?: string;
  sex?: PatientSex;
  size?: PatientSize;
  baseWeightKg?: number;
  birthDateApproximate?: string;
  isNeutered?: boolean;
  microchip?: string;
  pedigreeNumber?: string;
  color?: string;
  chronicDisease?: string;
  allergy?: string;
  allergies?: PatientAllergy[];
  temperament?: string;
  generalNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
  primaryOwnerId?: string;
  status?: PatientStatus;
}

type MutablePatientListItems<T> = T extends { readonly items: readonly unknown[] }
  ? Omit<T, 'items'> & { items: PatientSummary[] }
  : never;

export type PatientsListResponse = MutablePatientListItems<PatientListResponse>;

export interface PatientListFilters {
  search?: string;
  ownerId?: string;
  species?: string;
  status?: PatientStatus | 'all';
  page?: number;
  pageSize?: number;
}

export interface OwnerPatientLinkSummary {
  id: string;
  accountId: string;
  ownerId: string;
  patientId: string;
  relationshipType: 'primary' | 'secondary' | 'financial' | 'authorized' | 'spouse';
  financialResponsible: boolean;
  createdAt: string;
}

export interface PatientSummaryResponse {
  patient: PatientSummary;
  owner: {
    id: string;
    fullName: string;
    phoneMain?: string | null;
    email?: string | null;
  };
  stats: {
    totalEncounters: number;
    openEncounters: number;
  };
  recentEncounters: Array<{
    id: string;
    openedAt: string;
    status: 'open' | 'closed';
  }>;
}
