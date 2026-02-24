type DbClient = typeof import('@cvg-his/db').db;
export type InpatientStayStatus = 'active' | 'discharged' | 'transferred';
export type InpatientStayRecord = {
    id: string;
    accountId: string;
    patientId: string;
    ownerId: string;
    encounterId: string | null;
    wardId: string;
    bedId: string;
    status: InpatientStayStatus;
    admittedAt: Date;
    dischargedAt: Date | null;
    admittedByUserId: string;
    dischargedByUserId: string | null;
    chiefComplaint: string | null;
    reason: string | null;
    planSummary: string | null;
    createdAt: Date;
    updatedAt: Date;
};
export type InpatientPatientRef = {
    patientId: string;
    ownerId: string;
};
export type InpatientBedRef = {
    bedId: string;
    wardId: string;
    isActive: boolean;
};
type AdmitInput = {
    accountId: string;
    patientId: string;
    ownerId: string;
    encounterId?: string;
    wardId: string;
    bedId: string;
    admittedByUserId: string;
    chiefComplaint?: string;
    reason?: string;
    planSummary?: string;
};
type TransferInput = {
    accountId: string;
    stayId: string;
    toWardId: string;
    toBedId: string;
    reason?: string;
};
type DischargeInput = {
    accountId: string;
    stayId: string;
    reason: string;
    dischargedByUserId: string;
};
type ListInput = {
    accountId: string;
    page: number;
    pageSize: number;
    status?: InpatientStayStatus;
    wardId?: string;
};
export type InpatientRepo = {
    findPatientInAccount: (accountId: string, patientId: string) => Promise<InpatientPatientRef | null>;
    wardExistsInAccount: (accountId: string, wardId: string) => Promise<boolean>;
    findBedInAccount: (accountId: string, bedId: string) => Promise<InpatientBedRef | null>;
    hasActiveStayInBed: (accountId: string, bedId: string, excludeStayId?: string) => Promise<boolean>;
    admit: (input: AdmitInput) => Promise<InpatientStayRecord>;
    findStayById: (accountId: string, stayId: string) => Promise<InpatientStayRecord | null>;
    transfer: (input: TransferInput) => Promise<InpatientStayRecord | null>;
    discharge: (input: DischargeInput) => Promise<InpatientStayRecord | null>;
    list: (input: ListInput) => Promise<{
        data: InpatientStayRecord[];
        page: number;
        pageSize: number;
        total: number;
    }>;
};
export declare function createInpatientRepo(db: DbClient): InpatientRepo;
export {};
//# sourceMappingURL=repo.d.ts.map