import { apiRequest } from './api';

export type CustomerPackageStatus = 'draft' | 'active' | 'expired' | 'cancelled' | 'completed';
export type PackageItemKind = 'service' | 'product';
export type PackageConsumptionSource = 'appointment' | 'encounter' | 'counter_sale' | 'manual';

export interface PackageItemSummary {
  readonly id: string;
  readonly accountId: string;
  readonly packageId: string;
  readonly itemKind: PackageItemKind;
  readonly catalogItemId: string | null;
  readonly nameSnapshot: string;
  readonly quantityPurchased: number;
  readonly quantityConsumed: number;
  readonly unitPrice: number;
  readonly validFrom: string | null;
  readonly validUntil: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PackageConsumptionSummary {
  readonly id: string;
  readonly accountId: string;
  readonly packageId: string;
  readonly packageItemId: string;
  readonly quantity: number;
  readonly consumedByUserId: string;
  readonly consumedAt: string;
  readonly sourceType: PackageConsumptionSource;
  readonly sourceId: string | null;
  readonly notes: string | null;
}

export interface PackageBalanceItem {
  readonly packageItemId: string;
  readonly itemKind: PackageItemKind;
  readonly nameSnapshot: string;
  readonly quantityPurchased: number;
  readonly quantityConsumed: number;
  readonly quantityAvailable: number;
  readonly validUntil: string | null;
}

export interface CustomerPackageDetail {
  readonly id: string;
  readonly accountId: string;
  readonly ownerId: string;
  readonly patientId: string | null;
  readonly number: string;
  readonly status: CustomerPackageStatus;
  readonly startsAt: string;
  readonly expiresAt: string | null;
  readonly notes: string | null;
  readonly createdByUserId: string;
  readonly renewedFromPackageId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly activatedAt: string | null;
  readonly cancelledAt: string | null;
  readonly completedAt: string | null;
  readonly items: readonly PackageItemSummary[];
  readonly consumptions: readonly PackageConsumptionSummary[];
  readonly balance: readonly PackageBalanceItem[];
}

interface PackageListResponse {
  readonly items: readonly CustomerPackageDetail[];
}

export interface CreatePackagePayload {
  readonly ownerId: string;
  readonly patientId?: string | null;
  readonly startsAt?: string | null;
  readonly expiresAt?: string | null;
  readonly notes?: string | null;
}

export interface AddPackageItemPayload {
  readonly itemKind: PackageItemKind;
  readonly catalogItemId?: string | null;
  readonly nameSnapshot: string;
  readonly quantityPurchased: number;
  readonly unitPrice: number;
  readonly validFrom?: string | null;
  readonly validUntil?: string | null;
}

export interface ConsumePackageItemPayload {
  readonly quantity: number;
  readonly consumedAt?: string | null;
  readonly sourceType?: PackageConsumptionSource;
  readonly sourceId?: string | null;
  readonly notes?: string | null;
}

export interface RenewPackagePayload {
  readonly startsAt?: string | null;
  readonly expiresAt?: string | null;
  readonly notes?: string | null;
}

export const packagesService = {
  async list(): Promise<CustomerPackageDetail[]> {
    const response = await apiRequest<PackageListResponse>('/packages');
    return [...(response.items ?? [])];
  },

  async get(packageId: string): Promise<CustomerPackageDetail> {
    return apiRequest<CustomerPackageDetail>(`/packages/${encodeURIComponent(packageId)}`);
  },

  async create(payload: CreatePackagePayload): Promise<CustomerPackageDetail> {
    return apiRequest<CustomerPackageDetail>('/packages', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async addItem(packageId: string, payload: AddPackageItemPayload): Promise<PackageItemSummary> {
    return apiRequest<PackageItemSummary>(`/packages/${encodeURIComponent(packageId)}/items`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async activate(packageId: string): Promise<CustomerPackageDetail> {
    return apiRequest<CustomerPackageDetail>(`/packages/${encodeURIComponent(packageId)}/activate`, {
      method: 'POST'
    });
  },

  async consumeItem(packageItemId: string, payload: ConsumePackageItemPayload): Promise<CustomerPackageDetail> {
    return apiRequest<CustomerPackageDetail>(`/package-items/${encodeURIComponent(packageItemId)}/consume`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async renew(packageId: string, payload: RenewPackagePayload): Promise<CustomerPackageDetail> {
    return apiRequest<CustomerPackageDetail>(`/packages/${encodeURIComponent(packageId)}/renew`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async cancel(packageId: string): Promise<CustomerPackageDetail> {
    return apiRequest<CustomerPackageDetail>(`/packages/${encodeURIComponent(packageId)}/cancel`, {
      method: 'POST'
    });
  }
};
