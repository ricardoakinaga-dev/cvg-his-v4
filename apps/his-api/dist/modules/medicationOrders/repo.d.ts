import type { MedicationOrderCreateDto, MedicationOrderUpdateDto } from '@cvg-his/domain';
import type { MedicationOrderRecord, MedicationOrderStatus } from './types.js';
type DbClient = typeof import('@cvg-his/db').db;
type CreateMedicationOrderInput = MedicationOrderCreateDto & {
    accountId: string;
    createdByUserId: string;
};
type UpdateMedicationOrderInput = {
    accountId: string;
    orderId: string;
    patch: MedicationOrderUpdateDto;
};
type StopMedicationOrderInput = {
    accountId: string;
    orderId: string;
    stopReason: string;
    stoppedByUserId: string;
};
type ListMedicationOrdersInput = {
    accountId: string;
    encounterId?: string;
    stayId?: string;
    status?: MedicationOrderStatus;
    page: number;
    pageSize: number;
};
type InpatientStayRef = {
    id: string;
    patientId: string;
};
type EncounterRef = {
    id: string;
    patientId: string;
};
type PatientRef = {
    id: string;
};
export type MedicationOrdersRepo = {
    findPatientInAccount: (accountId: string, patientId: string) => Promise<PatientRef | null>;
    findStayInAccount: (accountId: string, stayId: string) => Promise<InpatientStayRef | null>;
    findEncounterInAccount: (accountId: string, encounterId: string) => Promise<EncounterRef | null>;
    create: (input: CreateMedicationOrderInput) => Promise<MedicationOrderRecord>;
    findById: (accountId: string, orderId: string) => Promise<MedicationOrderRecord | null>;
    updateById: (input: UpdateMedicationOrderInput) => Promise<MedicationOrderRecord | null>;
    stopById: (input: StopMedicationOrderInput) => Promise<MedicationOrderRecord | null>;
    list: (input: ListMedicationOrdersInput) => Promise<{
        data: MedicationOrderRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export declare function createMedicationOrdersRepo(db: DbClient): MedicationOrdersRepo;
export {};
//# sourceMappingURL=repo.d.ts.map