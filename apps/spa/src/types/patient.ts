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
  primaryOwnerId?: string;
  status?: PatientStatus;
}

export interface PatientsListResponse {
  items: PatientSummary[];
}

export interface OwnerPatientLinkSummary {
  id: string;
  accountId: string;
  ownerId: string;
  patientId: string;
  relationshipType: 'primary' | 'secondary' | 'financial';
  financialResponsible: boolean;
  createdAt: string;
}
