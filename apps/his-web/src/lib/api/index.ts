/**
 * API Client Module
 * 
 * Re-exports for convenient imports
 */

export {
  fetchJson,
  buildUrl,
  getApiBaseUrl,
  api,
  isApiClientError,
  ApiClientError,
  fetchPaginated,
  type ProblemJson,
  type FetchJsonOptions,
  type PaginatedResponse
} from './client';

// Domain-specific API clients
export * from './admin';
export * from './patients';
export * from './owners';
export * from './encounters';
export * from './inpatient';
export * from './beds';
export * from './wards';
export * from './handovers';
export * from './medicationOrders';
export * from './medicationAdministrations';
export * from './laboratory';
export * from './imaging';
export * from './clinicalNotes';
export * from './documents';
export * from './products';
export * from './stock';
export * from './services';
export * from './invoices';
export * from './settings';
