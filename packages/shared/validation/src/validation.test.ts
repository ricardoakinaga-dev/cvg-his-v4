import { describe, it, expect } from 'vitest';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import {
  readStringEnv,
  readNumberEnv,
  requireNonEmptyString,
  requireOptionalString,
  requireBoolean,
  requireOptionalBoolean,
  requireStringArray,
  requirePositiveNumber,
  requireOptionalPositiveNumber,
  requireEnum
} from './index.js';

describe('readStringEnv', () => {
  it('returns value when defined and non-empty', () => {
    expect(readStringEnv('hello', 'MY_VAR')).toBe('hello');
  });

  it('returns trimmed value', () => {
    expect(readStringEnv('  hello  ', 'MY_VAR')).toBe('  hello  ');
  });

  it('uses fallback when value is undefined', () => {
    expect(readStringEnv(undefined, 'MY_VAR', 'default')).toBe('default');
  });

  it('throws when value is empty string even with fallback', () => {
    expect(() => readStringEnv('', 'MY_VAR', 'default')).toThrow(ValidationError);
  });

  it('throws when value is whitespace-only even with fallback', () => {
    expect(() => readStringEnv('   ', 'MY_VAR', 'default')).toThrow(ValidationError);
  });

  it('throws ValidationError when value is undefined and no fallback', () => {
    expect(() => readStringEnv(undefined, 'REQUIRED_VAR')).toThrow(ValidationError);
    expect(() => readStringEnv(undefined, 'REQUIRED_VAR')).toThrow(
      'Missing required environment variable: REQUIRED_VAR'
    );
  });

  it('throws ValidationError when value is empty string and no fallback', () => {
    expect(() => readStringEnv('', 'REQUIRED_VAR')).toThrow(ValidationError);
  });

  it('throws ValidationError when value is whitespace only', () => {
    expect(() => readStringEnv('  ', 'REQUIRED_VAR')).toThrow(ValidationError);
  });

  it('ValidationError has correct status code', () => {
    try {
      readStringEnv(undefined, 'REQUIRED_VAR');
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).statusCode).toBe(400);
    }
  });
});

describe('readNumberEnv', () => {
  it('returns parsed number when value is valid integer string', () => {
    expect(readNumberEnv('42', 'MY_NUM', 0)).toBe(42);
  });

  it('returns parsed number when value is valid float string', () => {
    expect(readNumberEnv('3.14', 'MY_NUM', 0)).toBe(3.14);
  });

  it('returns fallback when value is undefined', () => {
    expect(readNumberEnv(undefined, 'MY_NUM', 99)).toBe(99);
  });

  it('throws ValidationError when value is not a number string even with fallback', () => {
    expect(() => readNumberEnv('abc', 'MY_NUM', 0)).toThrow(ValidationError);
  });

  it('throws ValidationError when value is not a finite number', () => {
    expect(() => readNumberEnv('abc', 'MY_NUM', 0)).toThrow(ValidationError);
    expect(() => readNumberEnv('abc', 'MY_NUM', 0)).toThrow(
      'Invalid numeric environment variable: MY_NUM'
    );
  });

  it('throws ValidationError with details including invalid value', () => {
    try {
      readNumberEnv('not-a-number', 'MY_NUM', 0);
    } catch (e) {
      expect(e).toBeInstanceOf(ValidationError);
      expect((e as ValidationError).details).toEqual({ value: 'not-a-number' });
    }
  });

  it('ValidationError has correct status code 400', () => {
    try {
      readNumberEnv('NaN', 'MY_NUM', 0);
    } catch (e) {
      expect((e as ValidationError).statusCode).toBe(400);
    }
  });
});

describe('requireNonEmptyString', () => {
  it('returns trimmed string when valid', () => {
    expect(requireNonEmptyString('hello', 'name')).toBe('hello');
  });

  it('returns trimmed string without leading/trailing whitespace', () => {
    expect(requireNonEmptyString('  hello  ', 'name')).toBe('hello');
  });

  it('throws ValidationError when value is not a string', () => {
    expect(() => requireNonEmptyString(123, 'name')).toThrow(ValidationError);
    expect(() => requireNonEmptyString(123, 'name')).toThrow(
      'Field name must be a non-empty string'
    );
  });

  it('throws ValidationError when value is empty string', () => {
    expect(() => requireNonEmptyString('', 'name')).toThrow(ValidationError);
  });

  it('throws ValidationError when value is whitespace only', () => {
    expect(() => requireNonEmptyString('   ', 'name')).toThrow(ValidationError);
  });

  it('throws ValidationError with field name in message', () => {
    expect(() => requireNonEmptyString('', 'customField')).toThrow(
      'Field customField must be a non-empty string'
    );
  });

  it('throws on null', () => {
    expect(() => requireNonEmptyString(null as unknown, 'name')).toThrow(ValidationError);
  });

  it('throws on undefined', () => {
    expect(() => requireNonEmptyString(undefined as unknown, 'name')).toThrow(ValidationError);
  });
});

describe('requireOptionalString', () => {
  it('returns undefined when value is undefined', () => {
    expect(requireOptionalString(undefined)).toBeUndefined();
  });

  it('returns trimmed string when valid', () => {
    expect(requireOptionalString('hello')).toBe('hello');
  });

  it('throws ValidationError when value is empty string', () => {
    expect(() => requireOptionalString('')).toThrow(ValidationError);
  });

  it('throws ValidationError when value is whitespace only', () => {
    expect(() => requireOptionalString('  ')).toThrow(ValidationError);
  });

  it('throws ValidationError with generic field name', () => {
    expect(() => requireOptionalString('')).toThrow('Field value must be a non-empty string');
  });
});

describe('requireBoolean', () => {
  it('returns true when value is true', () => {
    expect(requireBoolean(true, 'active')).toBe(true);
  });

  it('returns false when value is false', () => {
    expect(requireBoolean(false, 'active')).toBe(false);
  });

  it('throws ValidationError when value is not a boolean', () => {
    expect(() => requireBoolean('true', 'active')).toThrow(ValidationError);
    expect(() => requireBoolean('true', 'active')).toThrow('Field active must be a boolean');
  });

  it('throws ValidationError for number', () => {
    expect(() => requireBoolean(1 as unknown, 'active')).toThrow(ValidationError);
  });

  it('throws ValidationError for string "false"', () => {
    expect(() => requireBoolean('false' as unknown, 'active')).toThrow(ValidationError);
  });

  it('includes field name in error message', () => {
    expect(() => requireBoolean(null as unknown, 'isActive')).toThrow(
      'Field isActive must be a boolean'
    );
  });
});

describe('requireOptionalBoolean', () => {
  it('returns undefined when value is undefined', () => {
    expect(requireOptionalBoolean(undefined)).toBeUndefined();
  });

  it('returns true when value is true', () => {
    expect(requireOptionalBoolean(true)).toBe(true);
  });

  it('returns false when value is false', () => {
    expect(requireOptionalBoolean(false)).toBe(false);
  });

  it('throws ValidationError when value is not a boolean', () => {
    expect(() => requireOptionalBoolean('yes' as unknown)).toThrow(ValidationError);
  });
});

describe('requireStringArray', () => {
  it('returns trimmed strings for valid array', () => {
    expect(requireStringArray(['a', 'b', 'c'], 'tags')).toEqual(['a', 'b', 'c']);
  });

  it('returns trimmed strings including whitespace items', () => {
    expect(requireStringArray(['  a  ', ' b ', 'c'], 'tags')).toEqual(['a', 'b', 'c']);
  });

  it('throws ValidationError when value is not an array', () => {
    expect(() => requireStringArray('not-an-array', 'tags')).toThrow(ValidationError);
    expect(() => requireStringArray('not-an-array', 'tags')).toThrow('Field tags must be an array');
  });

  it('throws ValidationError when array contains empty string', () => {
    expect(() => requireStringArray(['a', '', 'c'], 'tags')).toThrow(ValidationError);
    expect(() => requireStringArray(['a', '', 'c'], 'tags')).toThrow(
      'Field tags[1] must be a non-empty string'
    );
  });

  it('throws ValidationError when array contains whitespace-only string', () => {
    expect(() => requireStringArray(['a', '   ', 'c'], 'tags')).toThrow(ValidationError);
  });

  it('throws ValidationError when array contains non-string item', () => {
    expect(() => requireStringArray(['a', 123 as unknown, 'c'], 'items')).toThrow(
      'Field items[1] must be a non-empty string'
    );
  });

  it('throws ValidationError for empty array', () => {
    expect(() => requireStringArray([], 'tags')).not.toThrow();
  });
});

describe('requirePositiveNumber', () => {
  it('returns positive integer', () => {
    expect(requirePositiveNumber(42, 'quantity')).toBe(42);
  });

  it('returns positive float', () => {
    expect(requirePositiveNumber(3.14, 'rate')).toBe(3.14);
  });

  it('throws ValidationError for zero', () => {
    expect(() => requirePositiveNumber(0, 'quantity')).toThrow(ValidationError);
    expect(() => requirePositiveNumber(0, 'quantity')).toThrow(
      'Field quantity must be a positive number'
    );
  });

  it('throws ValidationError for negative number', () => {
    expect(() => requirePositiveNumber(-5, 'quantity')).toThrow(ValidationError);
  });

  it('throws ValidationError for non-finite number (Infinity)', () => {
    expect(() => requirePositiveNumber(Infinity, 'quantity')).toThrow(ValidationError);
  });

  it('throws ValidationError for NaN', () => {
    expect(() => requirePositiveNumber(NaN, 'quantity')).toThrow(ValidationError);
  });

  it('throws ValidationError for non-number', () => {
    expect(() => requirePositiveNumber('42' as unknown, 'quantity')).toThrow(ValidationError);
  });

  it('includes field name in error message', () => {
    expect(() => requirePositiveNumber(-1, 'price')).toThrow(
      'Field price must be a positive number'
    );
  });
});

describe('requireOptionalPositiveNumber', () => {
  it('returns undefined when value is undefined', () => {
    expect(requireOptionalPositiveNumber(undefined)).toBeUndefined();
  });

  it('returns positive number when valid', () => {
    expect(requireOptionalPositiveNumber(42)).toBe(42);
  });

  it('throws ValidationError for zero', () => {
    expect(() => requireOptionalPositiveNumber(0)).toThrow(ValidationError);
  });

  it('throws ValidationError for negative number', () => {
    expect(() => requireOptionalPositiveNumber(-5)).toThrow(ValidationError);
  });
});

describe('requireEnum', () => {
  const allowed = ['active', 'inactive', 'pending'] as const;

  it('returns value when it is in allowed list', () => {
    expect(requireEnum('active', 'status', allowed)).toBe('active');
    expect(requireEnum('inactive', 'status', allowed)).toBe('inactive');
    expect(requireEnum('pending', 'status', allowed)).toBe('pending');
  });

  it('trims whitespace from value before checking against allowed list', () => {
    expect(requireEnum('  active  ', 'status', allowed)).toBe('active');
  });

  it('throws ValidationError when value is not in allowed list', () => {
    expect(() => requireEnum('deleted', 'status', allowed)).toThrow(ValidationError);
    expect(() => requireEnum('deleted', 'status', allowed)).toThrow(
      'Field status must be one of: active, inactive, pending'
    );
  });

  it('throws ValidationError with correct field name', () => {
    expect(() => requireEnum('unknown', 'role', allowed)).toThrow(
      'Field role must be one of: active, inactive, pending'
    );
  });

  it('includes invalid value in details', () => {
    try {
      requireEnum('unknown', 'status', allowed);
    } catch (e) {
      expect((e as ValidationError).details).toEqual({ value: 'unknown' });
    }
  });

  it('throws ValidationError when value is empty string', () => {
    expect(() => requireEnum('', 'status', allowed)).toThrow(ValidationError);
  });

  it('throws ValidationError when value is not a string', () => {
    expect(() => requireEnum(123 as unknown, 'status', allowed)).toThrow(ValidationError);
  });
});
