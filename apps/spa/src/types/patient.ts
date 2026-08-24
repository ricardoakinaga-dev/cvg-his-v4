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
  temperament?: string;
  generalNotes?: string;
  legacyVetusId?: string;
  originalCreatedAt?: string;
  primaryOwnerId?: string;
  status?: PatientStatus;
}

export interface PatientsListResponse {
  items: PatientSummary[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

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
