/**
 * Stock API Client
 * 
 * Provides functions for interacting with the stock management API endpoints
 */

import { apiClient } from './client';

// Types
export type StockLot = {
  id: string;
  accountId: string;
  productId: string;
  lotNumber: string;
  expiryDate: string | null;
  quantity: string;
  cost: string | null;
  location: string | null;
  supplier: string | null;
  notes: string | null;
  active: string;
  createdAt: string;
  updatedAt: string;
  productName?: string;
  productSku?: string;
};

export type StockMovement = {
  id: string;
  accountId: string;
  productId: string;
  lotId: string | null;
  movementType: 'entrada' | 'saida' | 'ajuste' | 'consumo' | 'devolucao' | 'transferencia';
  quantity: string;
  unitCost: string | null;
  totalCost: string | null;
  balanceAfter: string | null;
  lotBalanceAfter: string | null;
  encounterId: string | null;
  inpatientStayId: string | null;
  performedByUserId: string;
  reason: string | null;
  notes: string | null;
  documentRef: string | null;
  createdAt: string;
  productName?: string;
  productSku?: string;
  lotNumber?: string;
  performedByName?: string;
};

export type KardexEntry = {
  id: string;
  createdAt: string;
  movementType: string;
  lotNumber: string | null;
  quantity: string;
  balanceAfter: string | null;
  unitCost: string | null;
  totalCost: string | null;
  reason: string | null;
  documentRef: string | null;
  performedByName: string | null;
};

export type LotBalance = {
  lotId: string;
  lotNumber: string;
  expiryDate: string | null;
  quantity: string;
  active: string;
  cost: string | null;
  daysToExpiry: number | null;
  isExpired: boolean;
  isExpiringSoon: boolean;
};

export type ProductBalance = {
  productId: string;
  productName: string;
  productSku: string;
  totalQuantity: string;
  totalValue: string;
  lots: LotBalance[];
};

export type StockLotCreateInput = {
  productId: string;
  lotNumber: string;
  expiryDate?: string | null;
  quantity?: number;
  cost?: number | null;
  location?: string | null;
  supplier?: string | null;
  notes?: string | null;
};

export type StockLotUpdateInput = {
  lotNumber?: string;
  expiryDate?: string | null;
  quantity?: number;
  cost?: number | null;
  location?: string | null;
  supplier?: string | null;
  notes?: string | null;
  active?: number;
};

export type StockMovementCreateInput = {
  productId: string;
  lotId?: string | null;
  movementType: 'entrada' | 'saida' | 'ajuste' | 'consumo' | 'devolucao' | 'transferencia';
  quantity: number;
  unitCost?: number | null;
  encounterId?: string | null;
  inpatientStayId?: string | null;
  reason?: string | null;
  notes?: string | null;
  documentRef?: string | null;
};

export type ListStockLotsParams = {
  page?: number;
  pageSize?: number;
  productId?: string;
  lotNumber?: string;
  expiryWithinDays?: number;
  includeExpired?: boolean;
};

export type ListStockMovementsParams = {
  page?: number;
  pageSize?: number;
  productId?: string;
  lotId?: string;
  movementType?: string;
  encounterId?: string;
  inpatientStayId?: string;
  startDate?: string;
  endDate?: string;
};

export type KardexParams = {
  productId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

// Stock Lots API

/**
 * List stock lots with pagination and filters
 */
export async function listStockLots(params: ListStockLotsParams = {}): Promise<ListResponse<StockLot>> {
  return apiClient<ListResponse<StockLot>>('/stock/lots', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      productId: params.productId,
      lotNumber: params.lotNumber,
      expiryWithinDays: params.expiryWithinDays,
      includeExpired: params.includeExpired
    }
  });
}

/**
 * Get a stock lot by ID
 */
export async function getStockLot(id: string): Promise<StockLot> {
  return apiClient<StockLot>(`/stock/lots/${id}`);
}

/**
 * Create a new stock lot
 */
export async function createStockLot(input: StockLotCreateInput): Promise<StockLot> {
  return apiClient<StockLot>('/stock/lots', { method: 'POST', body: input });
}

/**
 * Update a stock lot
 */
export async function updateStockLot(id: string, input: StockLotUpdateInput): Promise<StockLot> {
  return apiClient<StockLot>(`/stock/lots/${id}`, { method: 'PUT', body: input });
}

/**
 * Delete a stock lot
 */
export async function deleteStockLot(id: string): Promise<void> {
  return apiClient<void>(`/stock/lots/${id}`, { method: 'DELETE' });
}

// Stock Movements API

/**
 * List stock movements with pagination and filters
 */
export async function listStockMovements(params: ListStockMovementsParams = {}): Promise<ListResponse<StockMovement>> {
  return apiClient<ListResponse<StockMovement>>('/stock/movements', {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      productId: params.productId,
      lotId: params.lotId,
      movementType: params.movementType,
      encounterId: params.encounterId,
      inpatientStayId: params.inpatientStayId,
      startDate: params.startDate,
      endDate: params.endDate
    }
  });
}

/**
 * Create a new stock movement
 */
export async function createStockMovement(input: StockMovementCreateInput): Promise<StockMovement> {
  return apiClient<StockMovement>('/stock/movements', { method: 'POST', body: input });
}

// Kardex API

/**
 * Get Kardex (product movement history)
 */
export async function getKardex(params: KardexParams): Promise<ListResponse<KardexEntry>> {
  return apiClient<ListResponse<KardexEntry>>('/stock/kardex', {
    params: {
      productId: params.productId,
      startDate: params.startDate,
      endDate: params.endDate,
      page: params.page,
      pageSize: params.pageSize
    }
  });
}

/**
 * Get product balance with lots
 */
export async function getProductBalance(productId: string): Promise<ProductBalance> {
  return apiClient<ProductBalance>(`/stock/balance/${productId}`);
}
