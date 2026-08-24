import { apiRequest } from './api';
import type {
  InventoryConsumptionSummary,
  InventoryConsumptionsListResponse,
  InventoryItemSummary,
  InventoryItemsListResponse,
  InventoryLotSummary,
  InventoryLotsListResponse,
  InventoryPurchaseSummary,
  InventoryPurchasesListResponse,
  InventoryStockMovementListResponse,
  InventoryStockMovementSummary
} from '@/types/inventory';

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

export interface CreateInventoryStockAdjustmentPayload {
  inventoryItemId: string;
  quantityDelta: number;
  reason: string;
  reference?: string;
}

export interface CreateInventoryPurchasePayload {
  supplierName: string;
  invoiceNumber: string;
  lines: Array<{
    inventoryItemId: string;
    quantity: number;
    unitCostAmount: number;
    lotNumber: string;
    expiryDate?: string | null;
    manufactureDate?: string | null;
    location?: string | null;
  }>;
}

export interface ReceiveInventoryPurchasePayload {
  lines: Array<{
    lineId: string;
    quantity: number;
    expiryDate?: string | null;
    manufactureDate?: string | null;
    location?: string | null;
  }>;
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

  async listConsumptions(encounterId?: string): Promise<InventoryConsumptionSummary[]> {
    const params = encounterId ? `?encounterId=${encodeURIComponent(encounterId)}` : '';
    const response = await apiRequest<InventoryConsumptionsListResponse>(
      `/inventory/consumptions${params}`
    );
    return response.items ?? [];
  },

  async listLots(): Promise<InventoryLotSummary[]> {
    const response = await apiRequest<InventoryLotsListResponse>('/inventory/lots');
    return response.items ?? [];
  },

  async listPurchases(): Promise<InventoryPurchaseSummary[]> {
    const response = await apiRequest<InventoryPurchasesListResponse>('/inventory/purchases');
    return response.items ?? [];
  },

  async createPurchase(payload: CreateInventoryPurchasePayload): Promise<InventoryPurchaseSummary> {
    return apiRequest<InventoryPurchaseSummary>('/inventory/purchases', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async approvePurchase(purchaseId: string): Promise<InventoryPurchaseSummary> {
    return apiRequest<InventoryPurchaseSummary>(`/inventory/purchases/${encodeURIComponent(purchaseId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({})
    });
  },

  async receivePurchase(
    purchaseId: string,
    payload: ReceiveInventoryPurchasePayload
  ): Promise<InventoryPurchaseSummary> {
    return apiRequest<InventoryPurchaseSummary>(`/inventory/purchases/${encodeURIComponent(purchaseId)}/receive`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listStockMovements(inventoryItemId?: string): Promise<InventoryStockMovementSummary[]> {
    const params = inventoryItemId ? `?inventoryItemId=${encodeURIComponent(inventoryItemId)}` : '';
    const response = await apiRequest<InventoryStockMovementListResponse>(`/inventory/movements${params}`);
    return response.items ?? [];
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
  },

  async createStockAdjustment(
    payload: CreateInventoryStockAdjustmentPayload
  ): Promise<InventoryStockMovementSummary> {
    return apiRequest<InventoryStockMovementSummary>('/inventory/adjustments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
