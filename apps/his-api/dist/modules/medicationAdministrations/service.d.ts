import { type AppendAuditInput } from '@cvg-his/audit';
import type { MedicationAdministrationCreateDto } from '@cvg-his/domain';
import type { RequestContext } from '../../plugins/requestContext.js';
import { type MedicationAdministrationsRepo, type MedicationAdministrationRecord } from './repo.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type ServiceDependencies = {
    repo?: MedicationAdministrationsRepo;
    appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};
/**
 * Patient confirmation for safety verification
 */
export type PatientConfirmation = {
    patientId: string;
    confirmedByName: string;
    confirmedBySpecies: string;
};
export type RecordMedicationAdministrationResult = {
    kind: 'order_not_found';
} | {
    kind: 'order_not_active';
} | {
    kind: 'stay_mismatch';
} | {
    kind: 'encounter_mismatch';
} | {
    kind: 'already_recorded';
} | {
    kind: 'invalid_reason';
} | {
    kind: 'patient_mismatch';
} | {
    kind: 'recorded';
    administration: MedicationAdministrationRecord;
};
export declare function createMedicationAdministrationsService(context: ServiceContext, dependencies?: ServiceDependencies): {
    record(input: MedicationAdministrationCreateDto, patientConfirmation?: PatientConfirmation): Promise<RecordMedicationAdministrationResult>;
    list(query: {
        stayId?: string;
        orderId?: string;
        page: number;
        pageSize: number;
    }): Promise<{
        data: MedicationAdministrationRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map