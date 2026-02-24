type DbClient = typeof import('@cvg-his/db').db;
export type MedicationScheduleType = 'interval' | 'fixed_times';
export type DueOrderScheduleRow = {
    scheduleId: string;
    orderId: string;
    accountId: string;
    stayId: string | null;
    wardId: string | null;
    encounterId: string | null;
    patientId: string;
    patientName: string;
    medicationName: string;
    doseValue: string;
    doseUnit: string;
    route: string;
    frequencyType: string;
    orderStartAt: Date;
    orderEndAt: Date | null;
    scheduleType: MedicationScheduleType;
    intervalMinutes: number | null;
    times: string[] | null;
    nextDueAt: Date | null;
};
export type AdministrationWindowRow = {
    orderId: string;
    scheduledFor: Date;
    status: 'administered' | 'refused' | 'delayed' | 'held';
    delayedUntil: Date | null;
};
export type MedicationDosesRepo = {
    listActiveOrderSchedules: (accountId: string, stayId?: string) => Promise<DueOrderScheduleRow[]>;
    listLastScheduledForByOrderIds: (accountId: string, orderIds: string[]) => Promise<Map<string, Date>>;
    listAdministrationRowsInWindow: (accountId: string, orderIds: string[], from: Date, to: Date) => Promise<AdministrationWindowRow[]>;
    updateScheduleNextDueAt: (accountId: string, scheduleId: string, nextDueAt: Date | null) => Promise<void>;
};
export declare function createMedicationDosesRepo(db: DbClient): MedicationDosesRepo;
export {};
//# sourceMappingURL=repo.d.ts.map