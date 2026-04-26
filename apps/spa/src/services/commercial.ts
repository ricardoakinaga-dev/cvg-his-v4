import { apiRequest } from './api';

export interface LoyaltyBalanceSummary {
  ownerId: string | null;
  availablePoints: number;
  blockedPoints: number;
  redeemedPoints: number;
  redemptionCount: number;
}

export interface LoyaltyRedemptionSummary {
  id: string;
  ownerId: string;
  pointsUsed: number;
  rewardDescription: string;
  productQuantity: number;
  serviceQuantity: number;
  status: 'pending' | 'completed' | 'cancelled';
  redeemedAt: string;
}

export interface RedeemLoyaltyPointsPayload {
  ownerId: string;
  pointsUsed: number;
  rewardDescription: string;
  productQuantity?: number;
  serviceQuantity?: number;
  status?: LoyaltyRedemptionSummary['status'];
}

export interface PriceTableSummary {
  id: string;
  accountId?: string;
  legacyId: string | null;
  description: string;
  context: string | null;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PriceTableItemSummary {
  id: string;
  accountId: string;
  priceTableId: string;
  itemKind: 'product' | 'service';
  itemId: string;
  price: number;
  createdAt: string;
  updatedAt: string;
}

export interface PriceTableDetail extends PriceTableSummary {
  items: PriceTableItemSummary[];
}

export interface PriceTablePayload {
  legacyId?: string | null;
  description: string;
  context?: string | null;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
}

export interface PriceTableItemPayload {
  itemKind: PriceTableItemSummary['itemKind'];
  itemId: string;
  price: number;
}

export interface PosSyncJobSummary {
  id: string;
  syncKind: 'stock' | 'clients';
  status: 'queued' | 'running' | 'completed' | 'failed';
  processedCount: number;
  requestedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

export async function getLoyaltySummary(ownerId?: string): Promise<LoyaltyBalanceSummary> {
  const params = new URLSearchParams();
  if (ownerId) params.set('ownerId', ownerId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<LoyaltyBalanceSummary>(`/loyalty/summary${suffix}`);
}

export async function listLoyaltyRedemptions(ownerId?: string): Promise<readonly LoyaltyRedemptionSummary[]> {
  const params = new URLSearchParams();
  if (ownerId) params.set('ownerId', ownerId);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiRequest<{ items: LoyaltyRedemptionSummary[] }>(`/loyalty/redemptions${suffix}`);
  return payload.items;
}

export async function redeemLoyaltyPoints(payload: RedeemLoyaltyPointsPayload): Promise<LoyaltyRedemptionSummary> {
  return apiRequest<LoyaltyRedemptionSummary>('/loyalty/redemptions', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function listPriceTables(filters?: { search?: string; active?: boolean }): Promise<readonly PriceTableSummary[]> {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.active !== undefined) params.set('active', String(filters.active));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await apiRequest<{ items: PriceTableSummary[] }>(`/price-tables${suffix}`);
  return payload.items;
}

export async function getPriceTableDetail(priceTableId: string): Promise<PriceTableDetail> {
  return apiRequest<PriceTableDetail>(`/price-tables/${encodeURIComponent(priceTableId)}`);
}

export async function createPriceTable(payload: PriceTablePayload): Promise<PriceTableSummary> {
  return apiRequest<PriceTableSummary>('/price-tables', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updatePriceTable(priceTableId: string, payload: PriceTablePayload): Promise<PriceTableSummary> {
  return apiRequest<PriceTableSummary>(`/price-tables/${encodeURIComponent(priceTableId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function archivePriceTable(priceTableId: string): Promise<void> {
  await apiRequest<void>(`/price-tables/${encodeURIComponent(priceTableId)}`, {
    method: 'DELETE'
  });
}

export async function addPriceTableItem(priceTableId: string, payload: PriceTableItemPayload): Promise<PriceTableItemSummary> {
  return apiRequest<PriceTableItemSummary>(`/price-tables/${encodeURIComponent(priceTableId)}/items`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function createPosSyncJob(syncKind: PosSyncJobSummary['syncKind']): Promise<PosSyncJobSummary> {
  return apiRequest<PosSyncJobSummary>('/pos-sync/jobs', {
    method: 'POST',
    body: JSON.stringify({ syncKind, metadata: { source: 'spa' } })
  });
}

export async function listPosSyncJobs(): Promise<readonly PosSyncJobSummary[]> {
  const payload = await apiRequest<{ items: PosSyncJobSummary[] }>('/pos-sync/jobs');
  return payload.items;
}

export async function completePosSyncJob(jobId: string, processedCount: number): Promise<PosSyncJobSummary> {
  return apiRequest<PosSyncJobSummary>(`/pos-sync/jobs/${jobId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed', processedCount })
  });
}
