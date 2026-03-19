import { computeNextDueSlot, normalizeTimeZone } from '@cvg-his/domain';

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

export function calculateNextDueAt(input: NextDueInput): Date | null {
  const timezone = normalizeTimeZone(
    input.timezone,
    process.env.DEFAULT_TIMEZONE ??
      process.env.MEDICATION_SCHEDULE_DEFAULT_TIMEZONE ??
      'America/Sao_Paulo'
  );

  return computeNextDueSlot(
    input.now,
    {
      scheduleType: input.scheduleType,
      intervalMinutes: input.intervalMinutes,
      times: input.times,
      orderStartAt: input.orderStartAt,
      orderEndAt: input.orderEndAt,
      lastScheduledFor: input.lastScheduledFor
    },
    timezone
  );
}
