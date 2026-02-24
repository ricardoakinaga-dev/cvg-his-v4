/**
 * Patient types - re-exported from @cvg-his/contracts
 *
 * This file serves as a bridge between the shared contracts and the API module.
 * All schemas are defined in packages/contracts to prevent drift between his-api and his-web.
 */
import { createPatientBodySchema, updatePatientBodySchema, patientIdParamSchema, listPatientsQuerySchema, patientResponseSchema, listPatientsResponseSchema, patientSummaryResponseSchema, alertSchema } from '@cvg-his/contracts';
// Re-export schemas for use in routes
export { createPatientBodySchema, updatePatientBodySchema, patientIdParamSchema, listPatientsQuerySchema, patientResponseSchema, listPatientsResponseSchema, patientSummaryResponseSchema, alertSchema };
//# sourceMappingURL=types.js.map