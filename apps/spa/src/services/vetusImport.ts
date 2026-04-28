import { apiRequest } from './api';

export type VetusImportStatus = 'imported' | 'linked';
export type VetusPatientSex = 'male' | 'female' | 'unknown';

export interface VetusImportOwnerInput {
  readonly legacyVetusId?: string;
  readonly fullName: string;
  readonly documentId?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly originalCreatedAt?: string;
}

export interface VetusImportPatientInput {
  readonly legacyVetusId?: string;
  readonly name: string;
  readonly species: string;
  readonly breed?: string;
  readonly sex?: VetusPatientSex;
  readonly baseWeightKg?: number;
  readonly generalNotes?: string;
  readonly originalCreatedAt?: string;
}

export interface CreateVetusImportRequest {
  readonly sourceSystem?: string;
  readonly sourceReference?: string;
  readonly reviewedBy?: string;
  readonly owner: VetusImportOwnerInput;
  readonly patient: VetusImportPatientInput;
}

export interface VetusImportSummary {
  readonly id: string;
  readonly accountId: string;
  readonly sourceSystem: string;
  readonly sourceReference: string | null;
  readonly status: VetusImportStatus;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly importedByUserId: string;
  readonly reviewedBy: string | null;
  readonly importedAt: string;
  readonly summary: string;
}

interface VetusImportListResponse {
  readonly items: readonly VetusImportSummary[];
}

export const vetusImportService = {
  async list(): Promise<VetusImportSummary[]> {
    const response = await apiRequest<VetusImportListResponse>('/vetus-imports');
    return [...(response.items ?? [])];
  },

  async create(payload: CreateVetusImportRequest): Promise<VetusImportSummary> {
    return apiRequest<VetusImportSummary>('/vetus-imports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
