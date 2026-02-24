/**
 * Tenant Helpers - Re-exports from tenantGuardrail for convenience
 * 
 * This module provides a cleaner import path for tenant-related utilities.
 * The actual implementation is in tenantGuardrail.ts
 */

export {
  requireAccountId,
  requireTenantMatch,
  tenantGuardrail,
  withTenantFilter,
  isTenantError,
  MissingTenantContextError,
  TenantMismatchError
} from './tenantGuardrail.js';
