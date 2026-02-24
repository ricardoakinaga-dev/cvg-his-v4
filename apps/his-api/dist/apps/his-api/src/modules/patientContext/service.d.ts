import type { FastifyRequest } from 'fastify';
import type { PatientContextResponse, PatientContextInfo, StayContextInfo } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
export declare function createPatientContextService(db: DbClient): {
    /**
     * Get full patient context by patient ID
     */
    getPatientContext(accountId: string, patientId: string): Promise<PatientContextResponse | null>;
    /**
     * Get patient context by stay ID
     */
    getPatientContextByStay(accountId: string, stayId: string): Promise<PatientContextResponse | null>;
    /**
     * Get just the patient info (lighter weight)
     */
    getPatientInfo(accountId: string, patientId: string): Promise<PatientContextInfo | null>;
    /**
     * Get just the stay info
     */
    getStayInfo(accountId: string, stayId: string): Promise<StayContextInfo | null>;
};
/**
 * Helper to extract account ID from request
 */
export declare function getAccountIdFromRequest(request: FastifyRequest): string;
export {};
//# sourceMappingURL=service.d.ts.map