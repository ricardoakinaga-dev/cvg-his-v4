import { parseTimeZoneMap, resolveMedicationTimezone } from '@cvg-his/domain';
let cachedConfig = null;
let cachedSignature = null;
function readEnvConfig() {
    const defaultTimezone = process.env.DEFAULT_TIMEZONE ??
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
export function resolveMedicationScheduleTimezone(input) {
    const config = readEnvConfig();
    return resolveMedicationTimezone({
        accountId: input.accountId,
        wardId: input.wardId ?? null,
        defaultTimezone: config.defaultTimezone,
        timezoneByAccountId: config.timezoneByAccountId,
        timezoneByWardId: config.timezoneByWardId
    });
}
//# sourceMappingURL=timezone.js.map