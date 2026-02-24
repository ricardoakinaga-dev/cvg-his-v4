import type { CreatePatientBody, PatientRecord, UpdatePatientBody } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type CreatePatientInput = CreatePatientBody & {
    accountId: string;
    unitId?: string | null;
};
type ListPatientsInput = {
    accountId: string;
    page: number;
    pageSize: number;
    ownerId?: string;
    species?: string;
    q?: string;
};
export declare function createPatientsRepo(db: DbClient): {
    ownerExistsInAccount(accountId: string, ownerId: string): Promise<boolean>;
    create(input: CreatePatientInput): Promise<PatientRecord>;
    findById(accountId: string, patientId: string): Promise<PatientRecord | null>;
    updateById(accountId: string, patientId: string, patch: UpdatePatientBody): Promise<PatientRecord | null>;
    list(input: ListPatientsInput): Promise<{
        data: PatientRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export {};
//# sourceMappingURL=repo.d.ts.map