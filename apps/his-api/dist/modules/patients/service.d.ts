import type { RequestContext } from '../../plugins/requestContext.js';
import type { CreatePatientBody, ListPatientsQuery, PatientRecord, UpdatePatientBody } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type ServiceContext = {
    db: DbClient;
    requestContext: RequestContext;
};
type CreatePatientResult = {
    kind: 'owner_not_found';
} | {
    kind: 'created';
    patient: PatientRecord;
};
type UpdatePatientResult = {
    kind: 'patient_not_found';
} | {
    kind: 'owner_not_found';
} | {
    kind: 'updated';
    patient: PatientRecord;
};
export declare function createPatientsService(context: ServiceContext): {
    create(input: CreatePatientBody): Promise<CreatePatientResult>;
    getById(patientId: string): Promise<PatientRecord | null>;
    update(patientId: string, patch: UpdatePatientBody): Promise<UpdatePatientResult>;
    list(query: ListPatientsQuery): Promise<{
        data: PatientRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=service.d.ts.map