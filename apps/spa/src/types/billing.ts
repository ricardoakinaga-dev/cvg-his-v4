export type BillingStatus = 'draft' | 'estimated' | 'open' | 'settled';

export type BillingItemType = 'service' | 'supply' | 'procedure' | 'exam' | 'daily_rate' | 'other';

export interface BillingRecordSummary {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  ownerId: string;
  status: BillingStatus;
  subtotalAmount: number;
  currency: string;
  administrativeNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillingItemSummary {
  id: string;
  billingRecordId: string;
  accountId: string;
  encounterId: string;
  itemType: BillingItemType;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  totalAmount: number;
  sourceEntityType?: string;
  sourceEntityId?: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateBillingEstimateRequest {
  encounterId: string;
  administrativeNotes?: string;
}

export interface CreateBillingItemRequest {
  encounterId: string;
  itemType: BillingItemType;
  description: string;
  quantity: number;
  unitPriceAmount: number;
  sourceEntityType?: string;
  sourceEntityId?: string;
}

export interface UpdateBillingStatusRequest {
  status: BillingStatus;
  administrativeNotes?: string;
}

export interface BillingListResponse {
  items: BillingRecordSummary[];
}

export interface BillingItemListResponse {
  items: BillingItemSummary[];
}
