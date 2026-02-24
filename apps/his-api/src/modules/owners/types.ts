/**
 * Owner types - re-exported from @cvg-his/contracts
 *
 * This file serves as a bridge between the shared contracts and the API module.
 * All schemas are defined in packages/contracts to prevent drift between his-api and his-web.
 */
import {
  createOwnerBodySchema,
  updateOwnerBodySchema,
  ownerIdParamSchema,
  listOwnersQuerySchema,
  ownerResponseSchema,
  listOwnersResponseSchema,
  ownerSummaryResponseSchema,
  type CreateOwnerBody,
  type UpdateOwnerBody,
  type OwnerIdParam,
  type ListOwnersQuery,
  type OwnerResponse,
  type ListOwnersResponse,
  type OwnerSummaryResponse
} from '@cvg-his/contracts';

// Re-export schemas for use in routes
export {
  createOwnerBodySchema,
  updateOwnerBodySchema,
  ownerIdParamSchema,
  listOwnersQuerySchema,
  ownerResponseSchema,
  listOwnersResponseSchema,
  ownerSummaryResponseSchema
};

// Re-export types
export type {
  CreateOwnerBody,
  UpdateOwnerBody,
  OwnerIdParam,
  ListOwnersQuery,
  OwnerResponse,
  ListOwnersResponse,
  OwnerSummaryResponse
};

/**
 * Database record type (internal to API)
 * This represents the raw database row structure
 */
export type OwnerRecord = {
  id: string;
  accountId: string;
  unitId: string | null;
  fullName: string;
  document: string | null;
  phoneMain: string | null;
  phoneAlt: string | null;
  email: string | null;
  addressJson: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};
