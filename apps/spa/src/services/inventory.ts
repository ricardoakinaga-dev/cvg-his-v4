import { apiRequest } from './api';
import type { InventoryItemSummary, InventoryItemsListResponse } from '@/types/inventory';

export interface CreateInventoryItemPayload {
  sku: string;
  name: string;
  unit: string;
  onHandQuantity: number;
  reorderLevel: number;
  unitCostAmount: number;
}

export interface UpdateInventoryItemPayload {
  name?: string;
  unit?: string;
  onHandQuantity?: number;
  reorderLevel?: number;
  unitCostAmount?: number;
}

export const inventoryService = {
  async list(search?: string): Promise<InventoryItemSummary[]> {
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await apiRequest<InventoryItemsListResponse>(`/inventory${params}`);
    return (response.items ?? []) as InventoryItemSummary[];
  },

  async getById(id: string): Promise<InventoryItemSummary> {
    return apiRequest<InventoryItemSummary>(`/inventory/${id}`);
  },

  async create(payload: CreateInventoryItemPayload): Promise<InventoryItemSummary> {
    return apiRequest<InventoryItemSummary>('/inventory', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: UpdateInventoryItemPayload): Promise<InventoryItemSummary> {
    return apiRequest<InventoryItemSummary>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
