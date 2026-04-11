/**
 * Stock Low Alert Job
 *
 * Scans inventory for items below reorder threshold and triggers:
 * - Stock reorder suggestions via EventBus
 * - Notifications to inventory managers
 *
 * @see packages/modules/inventory for stock management
 */

import type { Logger } from '@cvg-his-v2/shared-logging';

export interface StockAlertJobContext {
  readonly correlationId: string;
  readonly environment: string;
}

export interface StockAlertResult {
  readonly checkedProducts: number;
  readonly lowStockProducts: Array<{
    productId: string;
    name: string;
    currentQuantity: number;
    reorderPoint: number;
  }>;
  readonly notificationsSent: number;
}

/**
 * Default reorder points by category (can be overridden per product).
 */
export const DEFAULT_REORDER_POINTS: Record<string, number> = {
  medication: 10,
  supply: 20,
  equipment: 3,
  food: 5,
  default: 15
};
