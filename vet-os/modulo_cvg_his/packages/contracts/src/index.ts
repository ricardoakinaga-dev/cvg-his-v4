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
export * from './agendaConfig.js';
export * from './appointments.js';
export * from './owners.js';
export * from './patients.js';
export * from './encounterBilling.js';
export * from './encounterFinancial.js';
export * from './encounters.js';
export * from './exams.js';
export * from './integration.js';
export * from './products.js';
export * from './services.js';

/**
 * ==========================================
 * FULL API CONTRACT
 * ==========================================
 */

import { appointmentsContract, AppointmentsContract } from './appointments.js';
import {
  availabilityContract,
  typeConfigContract,
  AvailabilityContract,
  TypeConfigContract
} from './agendaConfig.js';
import { ownersContract, OwnersContract } from './owners.js';
import { patientsContract, PatientsContract } from './patients.js';
import { encounterBillingContract } from './encounterBilling.js';
import { encounterFinancialContract } from './encounterFinancial.js';
import { encountersContract, EncountersContract } from './encounters.js';
import { examOrdersContract, examResultsContract, ExamOrdersContract, ExamResultsContract } from './exams.js';
import { integrationContract, IntegrationContract } from './integration.js';
import { productsContract, ProductsContract } from './products.js';
import { servicesContract, ServicesContract } from './services.js';

/**
 * Complete API contract definition
 */
export const apiContract = {
  availability: availabilityContract,
  typeConfig: typeConfigContract,
  appointments: appointmentsContract,
  owners: ownersContract,
  patients: patientsContract,
  encounterBilling: encounterBillingContract,
  encounterFinancial: encounterFinancialContract,
  encounters: encountersContract,
  examOrders: examOrdersContract,
  examResults: examResultsContract,
  integration: integrationContract,
  products: productsContract,
  services: servicesContract
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
  // Professional Availability
  {
    domain: 'availability',
    operation: 'create',
    method: 'POST',
    path: '/availability',
    description: 'Create professional availability slot'
  },
  {
    domain: 'availability',
    operation: 'getById',
    method: 'GET',
    path: '/availability/:id',
    description: 'Get availability by ID'
  },
  {
    domain: 'availability',
    operation: 'list',
    method: 'GET',
    path: '/availability',
    description: 'List availability slots'
  },
  {
    domain: 'availability',
    operation: 'update',
    method: 'PATCH',
    path: '/availability/:id',
    description: 'Update availability slot'
  },
  {
    domain: 'availability',
    operation: 'delete',
    method: 'DELETE',
    path: '/availability/:id',
    description: 'Delete availability slot'
  },

  // Appointment Type Configs
  {
    domain: 'typeConfig',
    operation: 'create',
    method: 'POST',
    path: '/appointment-types',
    description: 'Create appointment type config'
  },
  {
    domain: 'typeConfig',
    operation: 'getById',
    method: 'GET',
    path: '/appointment-types/:id',
    description: 'Get appointment type config by ID'
  },
  {
    domain: 'typeConfig',
    operation: 'list',
    method: 'GET',
    path: '/appointment-types',
    description: 'List appointment type configs'
  },
  {
    domain: 'typeConfig',
    operation: 'update',
    method: 'PATCH',
    path: '/appointment-types/:id',
    description: 'Update appointment type config'
  },
  {
    domain: 'typeConfig',
    operation: 'delete',
    method: 'DELETE',
    path: '/appointment-types/:id',
    description: 'Delete appointment type config'
  },

  // Appointments
  {
    domain: 'appointments',
    operation: 'create',
    method: 'POST',
    path: '/appointments',
    description: 'Create a new appointment'
  },
  {
    domain: 'appointments',
    operation: 'getById',
    method: 'GET',
    path: '/appointments/:id',
    description: 'Get appointment by ID'
  },
  {
    domain: 'appointments',
    operation: 'list',
    method: 'GET',
    path: '/appointments',
    description: 'List appointments with filters'
  },
  {
    domain: 'appointments',
    operation: 'update',
    method: 'PATCH',
    path: '/appointments/:id',
    description: 'Update appointment by ID'
  },
  {
    domain: 'appointments',
    operation: 'cancel',
    method: 'POST',
    path: '/appointments/:id/cancel',
    description: 'Cancel an appointment'
  },

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
    description: 'Get owner summary with patients and stats'
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
    description: 'Get patient summary with owner and stats'
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
  },

  // Products
  {
    domain: 'encounterBilling',
    operation: 'create',
    method: 'POST',
    path: '/encounters/:encounterId/billing-items',
    description: 'Create billing item for encounter'
  },
  {
    domain: 'encounterBilling',
    operation: 'list',
    method: 'GET',
    path: '/encounter-billing-items',
    description: 'List encounter billing items'
  },
  {
    domain: 'encounterBilling',
    operation: 'getSummary',
    method: 'GET',
    path: '/encounters/:encounterId/billing-summary',
    description: 'Get consolidated billing summary for encounter'
  },
  {
    domain: 'encounterBilling',
    operation: 'update',
    method: 'PATCH',
    path: '/encounter-billing-items/:id',
    description: 'Update encounter billing item'
  },
  {
    domain: 'encounterBilling',
    operation: 'remove',
    method: 'DELETE',
    path: '/encounter-billing-items/:id',
    description: 'Delete encounter billing item'
  },
  {
    domain: 'encounterFinancial',
    operation: 'getSummary',
    method: 'GET',
    path: '/encounters/:encounterId/financial-summary',
    description: 'Get financial summary and receivable status for encounter'
  },
  {
    domain: 'encounterFinancial',
    operation: 'close',
    method: 'POST',
    path: '/encounters/:encounterId/financial-close',
    description: 'Perform formal financial close of encounter account'
  },
  {
    domain: 'products',
    operation: 'create',
    method: 'POST',
    path: '/products',
    description: 'Create a new product'
  },
  {
    domain: 'products',
    operation: 'getById',
    method: 'GET',
    path: '/products/:id',
    description: 'Get product by ID'
  },
  {
    domain: 'products',
    operation: 'list',
    method: 'GET',
    path: '/products',
    description: 'List products with pagination'
  },
  {
    domain: 'products',
    operation: 'update',
    method: 'PATCH',
    path: '/products/:id',
    description: 'Update product by ID'
  },

  // Exam Orders
  { domain: 'examOrders', operation: 'create', method: 'POST', path: '/exam-orders', description: 'Create exam order' },
  { domain: 'examOrders', operation: 'getById', method: 'GET', path: '/exam-orders/:id', description: 'Get exam order by ID' },
  { domain: 'examOrders', operation: 'list', method: 'GET', path: '/exam-orders', description: 'List exam orders' },
  { domain: 'examOrders', operation: 'update', method: 'PATCH', path: '/exam-orders/:id', description: 'Update exam order' },

  // Exam Results
  { domain: 'examResults', operation: 'create', method: 'POST', path: '/exam-results', description: 'Create exam result' },
  { domain: 'examResults', operation: 'getById', method: 'GET', path: '/exam-results/:id', description: 'Get exam result by ID' },
  { domain: 'examResults', operation: 'list', method: 'GET', path: '/exam-results', description: 'List exam results' },
  { domain: 'examResults', operation: 'update', method: 'PATCH', path: '/exam-results/:id', description: 'Update exam result' },

  // Integration (R3.7)
  { domain: 'integration', operation: 'startEncounterFromAppointment', method: 'POST', path: '/appointments/:id/start-encounter', description: 'Start encounter from appointment' },
  { domain: 'integration', operation: 'createExamOrderFromEncounter', method: 'POST', path: '/encounters/:id/exam-orders', description: 'Create exam order from encounter' },
  { domain: 'integration', operation: 'getEncounterIntegratedSummary', method: 'GET', path: '/encounters/:id/summary', description: 'Get integrated encounter summary' },

  // Services
  {
    domain: 'services',
    operation: 'create',
    method: 'POST',
    path: '/services',
    description: 'Create a new service'
  },
  {
    domain: 'services',
    operation: 'getById',
    method: 'GET',
    path: '/services/:id',
    description: 'Get service by ID'
  },
  {
    domain: 'services',
    operation: 'list',
    method: 'GET',
    path: '/services',
    description: 'List services with pagination'
  },
  {
    domain: 'services',
    operation: 'update',
    method: 'PATCH',
    path: '/services/:id',
    description: 'Update service by ID'
  }
] as const;

export type ContractEndpoints = typeof contractEndpoints;
export * from './stock.js';
export * from './payments.js';
export * from './cash.js';
export * from './partners.js';
