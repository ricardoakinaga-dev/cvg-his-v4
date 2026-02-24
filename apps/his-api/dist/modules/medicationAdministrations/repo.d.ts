import type { MedicationAdministrationCreateDto } from '@cvg-his/domain';
import type { MedicationOrderStatus } from './rules.js';
type DbClient = typeof import('@cvg-his/db').db;
export type MedicationOrderRef = {
    id: string;
    accountId: string;
    patientId: string;
    stayId: string | null;
    encounterId: string | null;
    status: MedicationOrderStatus;
};
export type PatientInfo = {
    id: string;
    name: string;
    species: string;
};
export type MedicationAdministrationRecord = {
    id: string;
    accountId: string;
    orderId: string;
    stayId: string | null;
    encounterId: string | null;
    scheduledFor: Date;
    effectiveAt: Date | null;
    delayedUntil: Date | null;
    administeredAt: Date | null;
    status: 'administered' | 'refused' | 'delayed' | 'held';
    reason: string | null;
    administeredByUserId: string;
    createdAt: Date;
};
type CreateMedicationAdministrationInput = MedicationAdministrationCreateDto & {
    accountId: string;
    administeredByUserId: string;
};
type ListMedicationAdministrationsInput = {
    accountId: string;
    stayId?: string;
    orderId?: string;
    page: number;
    pageSize: number;
};
export type MedicationAdministrationsRepo = {
    findOrderInAccount: (accountId: string, orderId: string) => Promise<MedicationOrderRef | null>;
    findPatientInfo: (accountId: string, patientId: string) => Promise<PatientInfo | null>;
    create: (input: CreateMedicationAdministrationInput) => Promise<MedicationAdministrationRecord>;
    list: (input: ListMedicationAdministrationsInput) => Promise<{
        data: MedicationAdministrationRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export declare function createMedicationAdministrationsRepo(db: DbClient): MedicationAdministrationsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map