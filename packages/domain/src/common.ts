export function trim(value: string): string {
  return value.trim();
}

export function normalizeEmail(value: string): string {
  return trim(value).toLowerCase();
}

export function normalizePhone(value: string): string {
  return trim(value).replace(/[\s()-]/g, '');
}

export function normalizeStringList(values: string[]): string[] {
  return values.map((value) => trim(value)).filter((value) => value.length > 0);
}
