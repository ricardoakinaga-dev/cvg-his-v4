export type ScheduleType = 'interval' | 'fixed_times';
export type NextDueInput = {
    scheduleType: ScheduleType;
    intervalMinutes: number | null;
    times: string[] | null;
    orderStartAt: Date;
    orderEndAt: Date | null;
    lastScheduledFor: Date | null;
    now: Date;
    timezone?: string | null;
};
export declare function calculateNextDueAt(input: NextDueInput): Date | null;
//# sourceMappingURL=calc.d.ts.map