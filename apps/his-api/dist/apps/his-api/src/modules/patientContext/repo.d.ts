import type { PatientContextInfo, StayContextInfo, EncounterContextInfo } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
export declare function createPatientContextRepo(db: DbClient): {
    /**
     * Get patient context by patient ID
     */
    getPatientContext(accountId: string, patientId: string): Promise<PatientContextInfo | null>;
    /**
     * Get active stay for a patient
     */
    getActiveStayForPatient(accountId: string, patientId: string): Promise<StayContextInfo | null>;
    /**
     * Get stay context by stay ID
     */
    getStayContext(accountId: string, stayId: string): Promise<StayContextInfo | null>;
    /**
     * Get open encounter for a patient
     */
    getOpenEncounterForPatient(accountId: string, patientId: string): Promise<EncounterContextInfo | null>;
    /**
     * Get patient context by stay ID (includes patient info)
     */
    getPatientContextByStay(accountId: string, stayId: string): Promise<{
        patient: PatientContextInfo;
        stay: StayContextInfo;
    } | null>;
    /**
     * Get counts for navigation badges
     */
    getNavigationCounts(accountId: string, patientId: string, stayId?: string): Promise<{
        activeOrders: number;
        pendingAdministrations: number;
        unsignedNotes: number;
    }>;
};
export {};
//# sourceMappingURL=repo.d.ts.map