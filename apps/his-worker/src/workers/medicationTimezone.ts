import { parseTimeZoneMap, resolveMedicationTimezone } from '@cvg-his/domain';

type MedicationTimezoneConfig = {
  defaultTimezone: string;
  timezoneByAccountId: Record<string, string>;
  timezoneByWardId: Record<string, string>;
};

let cachedConfig: MedicationTimezoneConfig | null = null;
let cachedSignature: string | null = null;

function readEnvConfig(): MedicationTimezoneConfig {
  const defaultTimezone =
    process.env.DEFAULT_TIMEZONE ??
    process.env.MEDICATION_SCHEDULE_DEFAULT_TIMEZONE ??
    'America/Sao_Paulo';
  const byAccountRaw = process.env.MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT ?? '';
  const byWardRaw = process.env.MEDICATION_SCHEDULE_TIMEZONE_BY_WARD ?? '';
  const signature = [defaultTimezone, byAccountRaw, byWardRaw].join('||');

  if (cachedConfig && cachedSignature === signature) {
    return cachedConfig;
  }

  cachedSignature = signature;
  cachedConfig = {
    defaultTimezone,
    timezoneByAccountId: parseTimeZoneMap(byAccountRaw),
    timezoneByWardId: parseTimeZoneMap(byWardRaw)
  };
  return cachedConfig;
}

export function resolveMedicationScheduleTimezone(input: {
  accountId: string;
  wardId?: string | null;
}): string {
  const config = readEnvConfig();
  return resolveMedicationTimezone({
    accountId: input.accountId,
    wardId: input.wardId ?? null,
    defaultTimezone: config.defaultTimezone,
    timezoneByAccountId: config.timezoneByAccountId,
    timezoneByWardId: config.timezoneByWardId
  });
}
