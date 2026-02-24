/**
 * @cvg-his/contracts
 *
 * Shared API contracts for CVG HIS - Contract Gate to prevent drift between his-web and his-api.
 *
 * This package serves as the single source of truth for:
 * - Request body schemas
 * - Response schemas
 * - Query parameter schemas
 * - Path parameter schemas
 *
 * Usage:
 * - his-api: Import schemas for validation in routes
 * - his-web: Import schemas for type-safe API client generation
 * - tests: Import schemas for contract testing
 */

// Common utilities
export * from './common.js';

// Domain contracts
export * from './owners.js';
export * from './patients.js';
export * from './encounters.js';

/**
 * ==========================================
 * FULL API CONTRACT
 * ==========================================
 */

import { ownersContract, OwnersContract } from './owners.js';
import { patientsContract, PatientsContract } from './patients.js';
import { encountersContract, EncountersContract } from './encounters.js';

/**
 * Complete API contract definition
 */
export const apiContract = {
  owners: ownersContract,
  patients: patientsContract,
  encounters: encountersContract
} as const;

export type ApiContract = typeof apiContract;

/**
 * ==========================================
 * CONTRACT METADATA
 * ==========================================
 */

/**
 * Endpoint metadata for documentation and testing
 */
export const contractEndpoints = [
  // Owners
  {
    domain: 'owners',
    operation: 'create',
    method: 'POST',
    path: '/owners',
    description: 'Create a new owner'
  },
  {
    domain: 'owners',
    operation: 'getById',
    method: 'GET',
    path: '/owners/:id',
    description: 'Get owner by ID'
  },
  {
    domain: 'owners',
    operation: 'list',
    method: 'GET',
    path: '/owners',
    description: 'List owners with pagination'
  },
  {
    domain: 'owners',
    operation: 'update',
    method: 'PATCH',
    path: '/owners/:id',
    description: 'Update owner by ID'
  },
  {
    domain: 'owners',
    operation: 'getSummary',
    method: 'GET',
    path: '/owners/:id/summary',
    description: 'Get owner summary with audit trail and related artifacts'
  },

  // Patients
  {
    domain: 'patients',
    operation: 'create',
    method: 'POST',
    path: '/patients',
    description: 'Create a new patient'
  },
  {
    domain: 'patients',
    operation: 'getById',
    method: 'GET',
    path: '/patients/:id',
    description: 'Get patient by ID'
  },
  {
    domain: 'patients',
    operation: 'list',
    method: 'GET',
    path: '/patients',
    description: 'List patients with pagination and filters'
  },
  {
    domain: 'patients',
    operation: 'update',
    method: 'PATCH',
    path: '/patients/:id',
    description: 'Update patient by ID'
  },
  {
    domain: 'patients',
    operation: 'getSummary',
    method: 'GET',
    path: '/patients/:id/summary',
    description: 'Get patient summary with highlighted alerts and audit trail'
  },

  // Encounters
  {
    domain: 'encounters',
    operation: 'create',
    method: 'POST',
    path: '/encounters',
    description: 'Create a new encounter'
  },
  {
    domain: 'encounters',
    operation: 'getById',
    method: 'GET',
    path: '/encounters/:id',
    description: 'Get encounter by ID'
  },
  {
    domain: 'encounters',
    operation: 'list',
    method: 'GET',
    path: '/encounters',
    description: 'List encounters with pagination'
  },
  {
    domain: 'encounters',
    operation: 'close',
    method: 'POST',
    path: '/encounters/:id/close',
    description: 'Close an open encounter'
  },
  {
    domain: 'encounters',
    operation: 'getTimeline',
    method: 'GET',
    path: '/encounters/:id/timeline',
    description: 'Get encounter timeline with notes and documents'
  }
] as const;

export type ContractEndpoints = typeof contractEndpoints;
