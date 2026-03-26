import { ValidationError } from "@cvg-his-v2/shared-errors";

export function readStringEnv(
  value: string | undefined,
  key: string,
  fallback?: string,
): string {
  const resolved = value ?? fallback;

  if (!resolved || resolved.trim().length === 0) {
    throw new ValidationError(`Missing required environment variable: ${key}`);
  }

  return resolved;
}

export function readNumberEnv(
  value: string | undefined,
  key: string,
  fallback: number,
): number {
  const resolved = value ?? String(fallback);
  const parsed = Number(resolved);

  if (!Number.isFinite(parsed)) {
    throw new ValidationError(`Invalid numeric environment variable: ${key}`, {
      value: resolved,
    });
  }

  return parsed;
}

export function requireNonEmptyString(
  value: unknown,
  field: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`Field ${field} must be a non-empty string`);
  }

  return value.trim();
}

export function requireOptionalString(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireNonEmptyString(value, "value");
}

export function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new ValidationError(`Field ${field} must be a boolean`);
  }

  return value;
}

export function requireOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requireBoolean(value, "value");
}

export function requireStringArray(
  value: unknown,
  field: string,
): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`Field ${field} must be an array`);
  }

  return value.map((item, index) => requireNonEmptyString(item, `${field}[${index}]`));
}

export function requirePositiveNumber(
  value: unknown,
  field: string,
): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`Field ${field} must be a positive number`);
  }

  return value;
}

export function requireOptionalPositiveNumber(value: unknown): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requirePositiveNumber(value, "value");
}

export function requireEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T {
  const resolved = requireNonEmptyString(value, field) as T;
  if (!allowed.includes(resolved)) {
    throw new ValidationError(`Field ${field} must be one of: ${allowed.join(", ")}`, {
      value,
    });
  }

  return resolved;
}
