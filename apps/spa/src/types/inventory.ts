export interface InventoryItemSummary {
  id: string;
  accountId: string;
  sku: string;
  name: string;
  unit: string;
  onHandQuantity: number;
  reorderLevel: number;
  unitCostAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItemsListResponse {
  items: InventoryItemSummary[];
}

export interface InventoryConsumptionSummary {
  id: string;
  accountId: string;
  inventoryItemId: string;
  encounterId: string;
  patientId: string;
  quantity: number;
  unit: string;
  costAmount: number;
  sourceEntityType:
    | 'encounter'
    | 'diagnostic_order'
    | 'surgery_case'
    | 'inpatient_stay'
    | 'prescription'
    | 'other';
  sourceEntityId?: string;
  recordedByUserId: string;
  createdAt: string;
}

export interface InventoryConsumptionsListResponse {
  items: InventoryConsumptionSummary[];
}

export interface InventoryLotSummary {
  id: string;
  accountId: string;
  inventoryItemId: string;
  sku: string;
  itemName: string;
  lotNumber: string;
  quantity: number;
  unit: string;
  location?: string;
  supplier?: string;
  manufactureDate?: string;
  expiryDate?: string;
  status: 'active' | 'expiring' | 'expired' | 'depleted';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLotsListResponse {
  items: InventoryLotSummary[];
}
