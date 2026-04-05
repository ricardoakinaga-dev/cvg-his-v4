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
