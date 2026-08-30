import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { LaboratoryResultValue } from '@cvg-his-v2/shared-types';

const MAX_RESULT_VALUES = 200;
const MAX_PARAMETER_LENGTH = 120;
const MAX_VALUE_LENGTH = 255;
const MAX_CONTEXT_LENGTH = 120;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/u;

function normalizeRequiredText(
  value: unknown,
  field: string,
  maxLength: number
): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || CONTROL_CHARACTER_PATTERN.test(normalized)) {
    throw new ValidationError(
      `${field} must contain 1 to ${maxLength} printable characters`
    );
  }
  return normalized;
}

function normalizeOptionalText(
  value: unknown,
  field: string,
  maxLength: number
): string | undefined {
  if (value === undefined || value === null) return undefined;
  return normalizeRequiredText(value, field, maxLength);
}

/**
 * Validate and defensively copy structured laboratory result values at the
 * application boundary. The returned array and entries are immutable so
 * signature inputs cannot be changed after validation.
 */
export function normalizeLaboratoryResultValues(
  input: unknown
): readonly LaboratoryResultValue[] | undefined {
  if (input === undefined || input === null) return undefined;
  if (!Array.isArray(input)) {
    throw new ValidationError('resultValues must be an array');
  }
  if (input.length > MAX_RESULT_VALUES) {
    throw new ValidationError(`resultValues must contain at most ${MAX_RESULT_VALUES} entries`);
  }

  const normalized = input.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new ValidationError(`resultValues[${index}] must be an object`);
    }
    const record = entry as Record<string, unknown>;
    const parameter = normalizeRequiredText(
      record.parameter,
      `resultValues[${index}].parameter`,
      MAX_PARAMETER_LENGTH
    );
    const value = normalizeRequiredText(
      record.value,
      `resultValues[${index}].value`,
      MAX_VALUE_LENGTH
    );
    const unit = normalizeOptionalText(
      record.unit,
      `resultValues[${index}].unit`,
      MAX_CONTEXT_LENGTH
    );
    const reference = normalizeOptionalText(
      record.reference,
      `resultValues[${index}].reference`,
      MAX_CONTEXT_LENGTH
    );
    const rawOutOfRange = record.outOfRange;
    let outOfRange: boolean | undefined;
    if (rawOutOfRange !== undefined && rawOutOfRange !== null) {
      if (typeof rawOutOfRange !== 'boolean') {
        throw new ValidationError(`resultValues[${index}].outOfRange must be a boolean`);
      }
      outOfRange = rawOutOfRange;
    }

    return Object.freeze({
      parameter,
      value,
      ...(unit === undefined ? {} : { unit }),
      ...(reference === undefined ? {} : { reference }),
      ...(outOfRange === undefined ? {} : { outOfRange })
    });
  });

  return Object.freeze(normalized);
}
