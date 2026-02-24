type DbClient = typeof import('@cvg-his/db').db;
export type MedicationLogOrderRow = {
    id: string;
    medicationName: string;
    doseValue: string;
    doseUnit: string;
    route: string;
    frequencyType: string;
    status: 'active' | 'stopped';
    nextDueAt: Date | null;
};
export type MedicationLogAdministrationRow = {
    id: string;
    orderId: string;
    scheduledFor: Date;
    status: 'administered' | 'refused' | 'delayed' | 'held';
    effectiveAt: Date | null;
    delayedUntil: Date | null;
    administeredAt: Date | null;
    reason: string | null;
    byUserId: string;
    createdAt: Date;
};
export type MedicationLogsRepo = {
    listActiveOrdersByStay: (accountId: string, stayId: string) => Promise<MedicationLogOrderRow[]>;
    listRecentAdministrationsByStay: (accountId: string, stayId: string, limit: number) => Promise<MedicationLogAdministrationRow[]>;
};
export declare function createMedicationLogsRepo(db: DbClient): MedicationLogsRepo;
export {};
//# sourceMappingURL=repo.d.ts.map