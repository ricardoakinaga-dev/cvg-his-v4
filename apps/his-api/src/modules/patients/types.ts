/**
 * Patient types - re-exported from @cvg-his/contracts
 *
 * This file serves as a bridge between the shared contracts and the API module.
 * All schemas are defined in packages/contracts to prevent drift between his-api and his-web.
 */
import {
  createPatientBodySchema,
  updatePatientBodySchema,
  patientIdParamSchema,
  listPatientsQuerySchema,
  patientResponseSchema,
  alertSchema,
  type CreatePatientBody,
  type UpdatePatientBody,
  type PatientIdParam,
  type ListPatientsQuery,
  type PatientResponse,
  type AlertDto
} from '@cvg-his/contracts';

// Re-export schemas for use in routes
export {
  createPatientBodySchema,
  updatePatientBodySchema,
  patientIdParamSchema,
  listPatientsQuerySchema,
  patientResponseSchema,
  alertSchema
};

// Re-export types
export type {
  CreatePatientBody,
  UpdatePatientBody,
  PatientIdParam,
  ListPatientsQuery,
  PatientResponse,
  AlertDto
};

/**
 * Database record type (internal to API)
 * This represents the raw database row structure
 */
export type PatientRecord = {
  id: string;
  accountId: string;
  unitId: string | null;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  sex: string | null;
  birthDate: string | null;
  weightKg: string | null;
  microchip: string | null;
  alerts: AlertDto;
  createdAt: Date;
  updatedAt: Date;
};
