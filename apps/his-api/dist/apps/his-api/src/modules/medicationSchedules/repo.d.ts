type DbClient = typeof import('@cvg-his/db').db;
export type MedicationOrderStatus = 'active' | 'stopped';
export type MedicationScheduleType = 'interval' | 'fixed_times';
export type MedicationOrderForSchedule = {
    id: string;
    accountId: string;
    stayId: string | null;
    wardId: string | null;
    encounterId: string | null;
    patientId: string;
    status: MedicationOrderStatus;
    startAt: Date;
    endAt: Date | null;
};
export type MedicationScheduleRecord = {
    id: string;
    accountId: string;
    orderId: string;
    scheduleType: MedicationScheduleType;
    intervalMinutes: number | null;
    times: string[] | null;
    nextDueAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
};
type CreateScheduleInput = {
    accountId: string;
    orderId: string;
    scheduleType: MedicationScheduleType;
    intervalMinutes: number | null;
    times: string[] | null;
    nextDueAt: Date | null;
};
type UpdateScheduleInput = {
    accountId: string;
    orderId: string;
    scheduleType: MedicationScheduleType;
    intervalMinutes: number | null;
    times: string[] | null;
    nextDueAt: Date | null;
};
export type MedicationSchedulesRepo = {
    findOrderInAccount: (accountId: string, orderId: string) => Promise<MedicationOrderForSchedule | null>;
    findScheduleByOrderId: (accountId: string, orderId: string) => Promise<MedicationScheduleRecord | null>;
    findLastScheduledFor: (accountId: string, orderId: string) => Promise<Date | null>;
    createSchedule: (input: CreateScheduleInput) => Promise<MedicationScheduleRecord>;
    updateScheduleByOrderId: (input: UpdateScheduleInput) => Promise<MedicationScheduleRecord | null>;
};
export declare function createMedicationSchedulesRepo(db: DbClient): MedicationSchedulesRepo;
export {};
//# sourceMappingURL=repo.d.ts.map