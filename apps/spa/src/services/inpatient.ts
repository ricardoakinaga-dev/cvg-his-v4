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
  async list(
    filters?: string | {
      encounterId?: string;
      patientId?: string;
      includeDischarged?: boolean;
    }
  ): Promise<InpatientStaySummary[]> {
    const normalizedFilters = typeof filters === 'string' ? { encounterId: filters } : filters;
    const query = new URLSearchParams();
    if (normalizedFilters?.encounterId) query.set('encounterId', normalizedFilters.encounterId);
    if (normalizedFilters?.patientId) query.set('patientId', normalizedFilters.patientId);
    if (normalizedFilters?.includeDischarged) query.set('includeDischarged', 'true');
    const params = query.toString() ? `?${query.toString()}` : '';
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

  async listBeds(filters?: {
    sectorId?: string;
    code?: string;
    description?: string;
    active?: boolean;
  }): Promise<BedSummary[]> {
    const query = new URLSearchParams();
    if (filters?.sectorId) query.set('sectorId', filters.sectorId);
    if (filters?.code) query.set('code', filters.code);
    if (filters?.description) query.set('description', filters.description);
    if (filters?.active === false) query.set('active', 'false');
    const params = query.toString() ? `?${query.toString()}` : '';
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

  async getBedById(bedId: string): Promise<BedSummary> {
    return apiRequest<BedSummary>(`/beds/${encodeURIComponent(bedId)}`);
  },

  async updateBed(
    bedId: string,
    payload: {
      sectorId?: string;
      code?: string;
      name?: string;
      status?: BedSummary['status'];
      supportsSpecies?: string | null;
      active?: boolean;
    }
  ): Promise<BedSummary> {
    return apiRequest<BedSummary>(`/beds/${encodeURIComponent(bedId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async archiveBed(bedId: string): Promise<void> {
    await apiRequest<void>(`/beds/${encodeURIComponent(bedId)}`, {
      method: 'DELETE'
    });
  },

  async getBedMap(): Promise<BedMapResponse> {
    return apiRequest<BedMapResponse>('/bed-map');
  }
};
