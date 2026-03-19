import {
  stockItemResponseSchema,
  listStockItemsQuerySchema,
  updateStockItemBodySchema,
  createStockLotBodySchema,
  listStockLotsQuerySchema,
  createStockMovementBodySchema,
  listStockMovementsQuerySchema,
  type StockItemResponse,
  type ListStockItemsQuery,
  type UpdateStockItemBody,
  type CreateStockLotBody,
  type ListStockLotsQuery,
  type CreateStockMovementBody,
  type ListStockMovementsQuery,
  type StockMovementType,
  type StockLotStatus
} from '@cvg-his/contracts';

export {
  stockItemResponseSchema,
  listStockItemsQuerySchema,
  updateStockItemBodySchema,
  createStockLotBodySchema,
  listStockLotsQuerySchema,
  createStockMovementBodySchema,
  listStockMovementsQuerySchema
};

export type {
  StockItemResponse,
  ListStockItemsQuery,
  UpdateStockItemBody,
  CreateStockLotBody,
  ListStockLotsQuery,
  CreateStockMovementBody,
  ListStockMovementsQuery,
  StockMovementType,
  StockLotStatus
};

import { z } from 'zod';
export const stockItemIdParamSchema = z.object({ id: z.string().uuid() });
