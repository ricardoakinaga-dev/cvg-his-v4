import {
  createEncounterBillingItemBodySchema,
  encounterBillingEncounterParamSchema,
  encounterBillingItemIdParamSchema,
  encounterBillingItemResponseSchema,
  encounterBillingSummaryResponseSchema,
  listEncounterBillingItemsQuerySchema,
  updateEncounterBillingItemBodySchema,
  type CreateEncounterBillingItemBody,
  type EncounterBillingItemResponse,
  type EncounterBillingSummaryResponse,
  type ListEncounterBillingItemsQuery,
  type UpdateEncounterBillingItemBody
} from '@cvg-his/contracts';

export {
  createEncounterBillingItemBodySchema,
  encounterBillingEncounterParamSchema,
  encounterBillingItemIdParamSchema,
  encounterBillingItemResponseSchema,
  encounterBillingSummaryResponseSchema,
  listEncounterBillingItemsQuerySchema,
  updateEncounterBillingItemBodySchema
};

export type {
  CreateEncounterBillingItemBody,
  EncounterBillingItemResponse,
  EncounterBillingSummaryResponse,
  ListEncounterBillingItemsQuery,
  UpdateEncounterBillingItemBody
};

export type BillingItemType = 'service' | 'product';
export type EncounterStatus = 'open' | 'closed';

export type EncounterBillingItemRecord = {
  id: string;
  accountId: string;
  encounterId: string;
  itemType: BillingItemType;
  catalogItemId: string | null;
  nameSnapshot: string;
  codeSnapshot: string | null;
  unitPrice: number;
  quantity: number;
  discountAmount: number;
  lineTotal: number;
  notes: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type EncounterBillingSummaryRecord = {
  encounterId: string;
  accountId: string;
  encounterStatus: EncounterStatus;
  totals: {
    itemCount: number;
    serviceItemCount: number;
    productItemCount: number;
    subtotal: number;
    discountTotal: number;
    total: number;
  };
  items: EncounterBillingItemRecord[];
};
