import { apiRequest } from './api';

export interface MeasurementUnitItem {
  id: string;
  accountId: string;
  code: string;
  description: string;
  decimalPlaces: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MeasurementUnitListResponse {
  items: MeasurementUnitItem[];
  totalItems: number;
}

export interface MeasurementUnitListFilters {
  search?: string;
  precision?: 'integer' | 'decimal';
  active?: boolean;
}

export interface MeasurementUnitPayload {
  code: string;
  description: string;
  decimalPlaces?: number;
  active?: boolean;
}

function buildQuery(filters?: MeasurementUnitListFilters): string {
  const query = new URLSearchParams();
  if (filters?.search) query.set('search', filters.search);
  if (filters?.precision) query.set('precision', filters.precision);
  if (filters?.active === false) query.set('active', 'false');
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const measurementUnitsService = {
  async list(filters?: MeasurementUnitListFilters): Promise<MeasurementUnitListResponse> {
    return apiRequest<MeasurementUnitListResponse>(`/measurement-units${buildQuery(filters)}`);
  },

  async create(payload: MeasurementUnitPayload): Promise<MeasurementUnitItem> {
    return apiRequest<MeasurementUnitItem>('/measurement-units', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: MeasurementUnitPayload): Promise<MeasurementUnitItem> {
    return apiRequest<MeasurementUnitItem>(`/measurement-units/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/measurement-units/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
