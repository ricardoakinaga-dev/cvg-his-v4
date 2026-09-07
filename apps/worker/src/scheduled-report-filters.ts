/** Owner: RUNTIME. Shared normalization for persisted scheduled-report sources. */
export function parseScheduledReportSearch(value: unknown): string | undefined {
  return parseScheduledReportText(value, 'search');
}

export function parseScheduledReportText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string with at most 200 characters`);
  }
  const normalized = value.trim().toLowerCase();
  if (Array.from(normalized).length > 200) {
    throw new Error(`${field} must be a string with at most 200 characters`);
  }
  return normalized || undefined;
}

export function parseScheduledReportDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must be an ISO calendar date`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    year < 1 ||
    year > 9999 ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`${field} must be an ISO calendar date`);
  }

  return value;
}
