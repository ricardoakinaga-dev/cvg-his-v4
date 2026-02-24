export type MedicationScheduleSlotType = 'interval' | 'fixed_times';
export type MedicationScheduleComputationInput = {
    scheduleType: MedicationScheduleSlotType;
    intervalMinutes: number | null;
    times: string[] | null;
    orderStartAt: Date;
    orderEndAt: Date | null;
    lastScheduledFor: Date | null;
};
export type MedicationSlotMode = 'next_due' | 'latest_past';
export type ComputeMedicationSlotsInput = {
    schedule: MedicationScheduleComputationInput;
    windowStart: Date;
    windowEnd: Date;
    timezone: string;
};
export type ResolveMedicationTimezoneInput = {
    accountId?: string | null;
    wardId?: string | null;
    accountTimezone?: string | null;
    wardTimezone?: string | null;
    defaultTimezone?: string | null;
    timezoneByAccountId?: Record<string, string> | null;
    timezoneByWardId?: Record<string, string> | null;
};
export declare function isValidTimeZone(value: string): boolean;
export declare function normalizeTimeZone(value: string | null | undefined, fallback?: string): string;
export declare function parseTimeZoneMap(raw: string | null | undefined): Record<string, string>;
export declare function resolveMedicationTimezone(input: ResolveMedicationTimezoneInput): string;
export declare function computeMedicationSlots(input: ComputeMedicationSlotsInput): Date[];
export declare function computeMedicationSlot(now: Date, schedule: MedicationScheduleComputationInput, mode: MedicationSlotMode, timezone: string): Date | null;
export declare function computeDueSlot(now: Date, schedule: MedicationScheduleComputationInput, timezone: string): Date | null;
export declare function computeLatestPastSlot(now: Date, schedule: MedicationScheduleComputationInput, timezone: string): Date | null;
export declare function computeNextDueSlot(now: Date, schedule: MedicationScheduleComputationInput, timezone: string): Date | null;
export declare function computeActiveSlot(now: Date, schedule: MedicationScheduleComputationInput, lastAdmin: Date | null, timezone: string): Date | null;
//# sourceMappingURL=medicationSlots.d.ts.map