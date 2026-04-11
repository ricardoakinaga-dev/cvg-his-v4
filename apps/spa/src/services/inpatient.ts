import { apiRequest } from './api';
import type {
  InpatientStaySummary,
  InpatientListResponse,
  AssignBedRequest,
  TransferBedRequest,
  SectorSummary,
  BedSummary,
  BedMapResponse,
  InpatientStatus,
  InpatientProgressSummary
} from '@/types/inpatient';

export const inpatientService = {
  async list(encounterId?: string): Promise<InpatientStaySummary[]> {
    const params = encounterId ? `?encounterId=${encodeURIComponent(encounterId)}` : '';
    const res = await apiRequest<InpatientListResponse>(`/inpatient${params}`);
    return res.items;
  },

  async assignBed(stayId: string, payload: AssignBedRequest): Promise<InpatientStaySummary> {
    return apiRequest<InpatientStaySummary>(`/inpatient/${stayId}/assign-bed`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async transferBed(stayId: string, payload: TransferBedRequest): Promise<InpatientStaySummary> {
    return apiRequest<InpatientStaySummary>(`/inpatient/${stayId}/transfer-bed`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateStatus(
    stayId: string,
    payload: {
      status: InpatientStatus;
      dischargeReason?: string;
      transferToUnit?: string;
      transferToWard?: string;
    }
  ): Promise<InpatientStaySummary> {
    return apiRequest<InpatientStaySummary>(`/inpatient/${stayId}/update-status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listProgress(stayId: string): Promise<InpatientProgressSummary[]> {
    const res = await apiRequest<{ items: InpatientProgressSummary[] }>(
      `/inpatient/${stayId}/progress`
    );
    return res.items;
  },

  async addProgress(stayId: string, note: string): Promise<InpatientProgressSummary> {
    return apiRequest<InpatientProgressSummary>(`/inpatient/${stayId}/progress`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  },

  async listSectors(): Promise<SectorSummary[]> {
    const res = await apiRequest<{ items: SectorSummary[] }>('/sectors');
    return res.items;
  },

  async createSector(payload: {
    code: string;
    name: string;
    kind: string;
  }): Promise<SectorSummary> {
    return apiRequest<SectorSummary>('/sectors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listBeds(sectorId?: string): Promise<BedSummary[]> {
    const params = sectorId ? `?sectorId=${encodeURIComponent(sectorId)}` : '';
    const res = await apiRequest<{ items: BedSummary[] }>(`/beds${params}`);
    return res.items;
  },

  async createBed(payload: {
    sectorId: string;
    code: string;
    name: string;
    supportsSpecies?: string;
  }): Promise<BedSummary> {
    return apiRequest<BedSummary>('/beds', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getBedMap(): Promise<BedMapResponse> {
    return apiRequest<BedMapResponse>('/bed-map');
  }
};
