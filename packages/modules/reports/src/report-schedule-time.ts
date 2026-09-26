import type { ReportScheduleFrequency } from './index.js';

export function nextRunAt(
  value: string,
  frequency: ReportScheduleFrequency,
  anchorValue = value
): string {
  const date = new Date(value);
  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() + 1);
  if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7);
  if (frequency === 'monthly') {
    const anchorDate = new Date(anchorValue);
    const monthIndex = date.getUTCMonth() + 1;
    const year = date.getUTCFullYear() + Math.floor(monthIndex / 12);
    const month = monthIndex % 12;
    const monthEnd = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    date.setUTCFullYear(year, month, Math.min(anchorDate.getUTCDate(), monthEnd));
  }
  return date.toISOString();
}
