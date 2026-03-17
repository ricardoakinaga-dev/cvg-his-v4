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

type LocalDate = {
  year: number;
  month: number;
  day: number;
};

type LocalDateTime = LocalDate & {
  hour: number;
  minute: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const DATETIME_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function parseFixedTime(value: string): { hour: number; minute: number } | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) {
    return null;
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function asLocalDateTime(parts: Intl.DateTimeFormatPart[]): LocalDateTime {
  const output: Partial<LocalDateTime> = {};
  for (const part of parts) {
    if (part.type === 'year') {
      output.year = Number(part.value);
    } else if (part.type === 'month') {
      output.month = Number(part.value);
    } else if (part.type === 'day') {
      output.day = Number(part.value);
    } else if (part.type === 'hour') {
      output.hour = Number(part.value);
    } else if (part.type === 'minute') {
      output.minute = Number(part.value);
    }
  }

  return {
    year: output.year ?? 0,
    month: output.month ?? 1,
    day: output.day ?? 1,
    hour: output.hour ?? 0,
    minute: output.minute ?? 0
  };
}

function getDatetimeFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = DATETIME_FORMATTERS.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  DATETIME_FORMATTERS.set(timezone, formatter);
  return formatter;
}

function getOffsetFormatter(timezone: string): Intl.DateTimeFormat {
  const cached = OFFSET_FORMATTERS.get(timezone);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  OFFSET_FORMATTERS.set(timezone, formatter);
  return formatter;
}

function getTimezoneOffsetMinutes(date: Date, timezone: string): number {
  const parts = getOffsetFormatter(timezone).formatToParts(date);
  const label = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'UTC+00';
  const match = /^(?:GMT|UTC)([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(label);

  if (!match) {
    return 0;
  }

  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');
  return sign * (hours * 60 + minutes);
}

function getLocalDateTime(date: Date, timezone: string): LocalDateTime {
  const parts = getDatetimeFormatter(timezone).formatToParts(date);
  return asLocalDateTime(parts);
}

function localDateToEpochDay(localDate: LocalDate): number {
  return Math.floor(Date.UTC(localDate.year, localDate.month - 1, localDate.day) / DAY_MS);
}

function epochDayToLocalDate(epochDay: number): LocalDate {
  const reference = new Date(epochDay * DAY_MS);
  return {
    year: reference.getUTCFullYear(),
    month: reference.getUTCMonth() + 1,
    day: reference.getUTCDate()
  };
}

function compareLocalTime(left: LocalDateTime, right: LocalDateTime): number {
  if (left.year !== right.year) {
    return left.year - right.year;
  }

  if (left.month !== right.month) {
    return left.month - right.month;
  }

  if (left.day !== right.day) {
    return left.day - right.day;
  }

  if (left.hour !== right.hour) {
    return left.hour - right.hour;
  }

  return left.minute - right.minute;
}

function localDateTimeToUtc(localDateTime: LocalDateTime, timezone: string): Date {
  const naiveUtc = Date.UTC(
    localDateTime.year,
    localDateTime.month - 1,
    localDateTime.day,
    localDateTime.hour,
    localDateTime.minute,
    0,
    0
  );

  let candidateMs = naiveUtc;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const offsetMinutes = getTimezoneOffsetMinutes(new Date(candidateMs), timezone);
    const nextCandidate = naiveUtc - offsetMinutes * 60_000;
    if (nextCandidate === candidateMs) {
      break;
    }

    candidateMs = nextCandidate;
  }

  const candidate = new Date(candidateMs);
  const candidateLocal = getLocalDateTime(candidate, timezone);
  if (compareLocalTime(candidateLocal, localDateTime) === 0) {
    return candidate;
  }

  if (
    candidateLocal.year === localDateTime.year &&
    candidateLocal.month === localDateTime.month &&
    candidateLocal.day === localDateTime.day &&
    compareLocalTime(candidateLocal, localDateTime) > 0
  ) {
    return candidate;
  }

  // DST spring-forward can create non-existent local times; choose the first valid instant after target.
  for (let minuteOffset = 1; minuteOffset <= 180; minuteOffset += 1) {
    const probe = new Date(candidateMs + minuteOffset * 60_000);
    const probeLocal = getLocalDateTime(probe, timezone);
    if (
      probeLocal.year === localDateTime.year &&
      probeLocal.month === localDateTime.month &&
      probeLocal.day === localDateTime.day &&
      compareLocalTime(probeLocal, localDateTime) >= 0
    ) {
      return probe;
    }
  }

  return candidate;
}

function normalizeWindow(
  windowStart: Date,
  windowEnd: Date,
  schedule: MedicationScheduleComputationInput
): { startMs: number; endMs: number } | null {
  const startMs = Math.max(windowStart.getTime(), schedule.orderStartAt.getTime());
  const endBoundary = schedule.orderEndAt ? schedule.orderEndAt.getTime() : Number.POSITIVE_INFINITY;
  const endMs = Math.min(windowEnd.getTime(), endBoundary);

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    return null;
  }

  return {
    startMs,
    endMs
  };
}

function computeIntervalSlots(
  schedule: MedicationScheduleComputationInput,
  startMs: number,
  endMs: number
): Date[] {
  const intervalMinutes = schedule.intervalMinutes ?? 0;
  if (intervalMinutes <= 0) {
    return [];
  }

  const intervalMs = intervalMinutes * 60_000;
  const anchorMs = schedule.lastScheduledFor
    ? schedule.lastScheduledFor.getTime() + intervalMs
    : schedule.orderStartAt.getTime();
  const firstDueMs = Math.max(anchorMs, schedule.orderStartAt.getTime());

  if (firstDueMs > endMs) {
    return [];
  }

  const initialSteps = Math.max(0, Math.ceil((startMs - firstDueMs) / intervalMs));
  const slots: Date[] = [];

  for (let cursorMs = firstDueMs + initialSteps * intervalMs; cursorMs <= endMs; cursorMs += intervalMs) {
    slots.push(new Date(cursorMs));
  }

  return slots;
}

function computeFixedSlots(
  schedule: MedicationScheduleComputationInput,
  startMs: number,
  endMs: number,
  timezone: string
): Date[] {
  const parsedTimes = (schedule.times ?? [])
    .map(parseFixedTime)
    .filter((entry): entry is { hour: number; minute: number } => entry !== null)
    .sort((left, right) => {
      if (left.hour !== right.hour) {
        return left.hour - right.hour;
      }

      return left.minute - right.minute;
    });

  if (parsedTimes.length === 0) {
    return [];
  }

  const startLocal = getLocalDateTime(new Date(startMs), timezone);
  const endLocal = getLocalDateTime(new Date(endMs), timezone);
  const startDay = localDateToEpochDay(startLocal) - 1;
  const endDay = localDateToEpochDay(endLocal) + 1;
  const uniqueSlots = new Set<number>();

  for (let day = startDay; day <= endDay; day += 1) {
    const localDate = epochDayToLocalDate(day);
    for (const time of parsedTimes) {
      const slot = localDateTimeToUtc(
        {
          ...localDate,
          hour: time.hour,
          minute: time.minute
        },
        timezone
      );

      const slotMs = slot.getTime();
      if (slotMs < startMs || slotMs > endMs) {
        continue;
      }

      if (slotMs < schedule.orderStartAt.getTime()) {
        continue;
      }

      if (schedule.orderEndAt && slotMs > schedule.orderEndAt.getTime()) {
        continue;
      }

      uniqueSlots.add(slotMs);
    }
  }

  return Array.from(uniqueSlots)
    .sort((left, right) => left - right)
    .map((value) => new Date(value));
}

export function isValidTimeZone(value: string): boolean {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return false;
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: normalized });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(value: string | null | undefined, fallback = 'UTC'): string {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (isValidTimeZone(normalized)) {
    return normalized;
  }

  return isValidTimeZone(fallback) ? fallback : 'UTC';
}

export function parseTimeZoneMap(raw: string | null | undefined): Record<string, string> {
  if (!raw || raw.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const output: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof key !== 'string' || typeof value !== 'string') {
        continue;
      }

      const normalizedValue = value.trim();
      if (normalizedValue.length === 0 || !isValidTimeZone(normalizedValue)) {
        continue;
      }

      output[key] = normalizedValue;
    }

    return output;
  } catch {
    return {};
  }
}

export function resolveMedicationTimezone(input: ResolveMedicationTimezoneInput): string {
  const fallback = normalizeTimeZone(input.defaultTimezone, 'America/Sao_Paulo');
  const wardId = input.wardId ?? undefined;
  const accountId = input.accountId ?? undefined;

  if (input.wardTimezone && isValidTimeZone(input.wardTimezone)) {
    return input.wardTimezone;
  }

  if (input.accountTimezone && isValidTimeZone(input.accountTimezone)) {
    return input.accountTimezone;
  }

  // Ward-level map has higher precedence than account-level map.
  if (wardId) {
    const wardTimezone = input.timezoneByWardId?.[wardId];
    if (wardTimezone && isValidTimeZone(wardTimezone)) {
      return wardTimezone;
    }
  }

  if (accountId) {
    const accountTimezone = input.timezoneByAccountId?.[accountId];
    if (accountTimezone && isValidTimeZone(accountTimezone)) {
      return accountTimezone;
    }
  }

  return fallback;
}

export function computeMedicationSlots(input: ComputeMedicationSlotsInput): Date[] {
  const window = normalizeWindow(input.windowStart, input.windowEnd, input.schedule);
  if (!window) {
    return [];
  }

  const timezone = normalizeTimeZone(input.timezone, 'America/Sao_Paulo');
  if (input.schedule.scheduleType === 'interval') {
    return computeIntervalSlots(input.schedule, window.startMs, window.endMs);
  }

  return computeFixedSlots(input.schedule, window.startMs, window.endMs, timezone);
}

export function computeMedicationSlot(
  now: Date,
  schedule: MedicationScheduleComputationInput,
  mode: MedicationSlotMode,
  timezone: string
): Date | null {
  const resolvedTimezone = normalizeTimeZone(timezone, 'America/Sao_Paulo');

  if (schedule.scheduleType === 'interval') {
    const intervalMinutes = schedule.intervalMinutes ?? 0;
    if (intervalMinutes <= 0) {
      return null;
    }

    const intervalMs = intervalMinutes * 60_000;
    const anchorMs = schedule.lastScheduledFor
      ? schedule.lastScheduledFor.getTime() + intervalMs
      : schedule.orderStartAt.getTime();
    const firstDueMs = Math.max(anchorMs, schedule.orderStartAt.getTime());

    if (mode === 'latest_past') {
      const endMs = Math.min(
        now.getTime(),
        schedule.orderEndAt ? schedule.orderEndAt.getTime() : Number.POSITIVE_INFINITY
      );

      if (endMs < schedule.orderStartAt.getTime()) {
        return null;
      }

      if (firstDueMs > endMs) {
        return null;
      }

      const steps = Math.floor((endMs - firstDueMs) / intervalMs);
      return new Date(firstDueMs + steps * intervalMs);
    }

    const referenceMs = Math.max(now.getTime(), schedule.orderStartAt.getTime());
    if (schedule.orderEndAt && referenceMs > schedule.orderEndAt.getTime()) {
      return null;
    }

    if (firstDueMs >= referenceMs) {
      return schedule.orderEndAt && firstDueMs > schedule.orderEndAt.getTime() ? null : new Date(firstDueMs);
    }

    const steps = Math.ceil((referenceMs - firstDueMs) / intervalMs);
    const nextMs = firstDueMs + steps * intervalMs;
    return schedule.orderEndAt && nextMs > schedule.orderEndAt.getTime() ? null : new Date(nextMs);
  }

  const referenceEndMs =
    mode === 'latest_past'
      ? Math.min(now.getTime(), schedule.orderEndAt ? schedule.orderEndAt.getTime() : Number.POSITIVE_INFINITY)
      : Math.max(now.getTime(), schedule.orderStartAt.getTime());

  if (mode === 'latest_past' && referenceEndMs < schedule.orderStartAt.getTime()) {
    return null;
  }

  if (mode === 'next_due' && schedule.orderEndAt && referenceEndMs > schedule.orderEndAt.getTime()) {
    return null;
  }

  const horizonMs = 72 * 60 * 60 * 1000;
  const slots = computeMedicationSlots({
    schedule,
    windowStart:
      mode === 'latest_past'
        ? new Date(Math.max(schedule.orderStartAt.getTime(), referenceEndMs - horizonMs))
        : new Date(referenceEndMs),
    windowEnd:
      mode === 'latest_past'
        ? new Date(referenceEndMs)
        : new Date(referenceEndMs + horizonMs),
    timezone: resolvedTimezone
  });

  if (slots.length === 0) {
    return null;
  }

  return mode === 'latest_past' ? (slots[slots.length - 1] ?? null) : (slots[0] ?? null);
}

export function computeDueSlot(
  now: Date,
  schedule: MedicationScheduleComputationInput,
  timezone: string
): Date | null {
  return computeLatestPastSlot(now, schedule, timezone);
}

export function computeLatestPastSlot(
  now: Date,
  schedule: MedicationScheduleComputationInput,
  timezone: string
): Date | null {
  return computeMedicationSlot(now, schedule, 'latest_past', timezone);
}

export function computeNextDueSlot(
  now: Date,
  schedule: MedicationScheduleComputationInput,
  timezone: string
): Date | null {
  return computeMedicationSlot(now, schedule, 'next_due', timezone);
}

export function computeActiveSlot(
  now: Date,
  schedule: MedicationScheduleComputationInput,
  lastAdmin: Date | null,
  timezone: string
): Date | null {
  const scheduleWithLastAdmin: MedicationScheduleComputationInput = {
    ...schedule,
    lastScheduledFor: lastAdmin ?? schedule.lastScheduledFor ?? null
  };

  const latestPast = computeLatestPastSlot(now, scheduleWithLastAdmin, timezone);
  if (!latestPast) {
    return computeNextDueSlot(now, scheduleWithLastAdmin, timezone);
  }

  if (lastAdmin && lastAdmin.getTime() >= latestPast.getTime()) {
    return computeNextDueSlot(now, scheduleWithLastAdmin, timezone);
  }

  return latestPast;
}
