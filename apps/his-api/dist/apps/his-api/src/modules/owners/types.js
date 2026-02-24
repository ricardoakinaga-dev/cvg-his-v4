/**
 * Owner types - re-exported from @cvg-his/contracts
 *
 * This file serves as a bridge between the shared contracts and the API module.
 * All schemas are defined in packages/contracts to prevent drift between his-api and his-web.
 */
import { createOwnerBodySchema, updateOwnerBodySchema, ownerIdParamSchema, listOwnersQuerySchema, ownerResponseSchema, listOwnersResponseSchema, ownerSummaryResponseSchema } from '@cvg-his/contracts';
// Re-export schemas for use in routes
export { createOwnerBodySchema, updateOwnerBodySchema, ownerIdParamSchema, listOwnersQuerySchema, ownerResponseSchema, listOwnersResponseSchema, ownerSummaryResponseSchema };
//# sourceMappingURL=types.js.map