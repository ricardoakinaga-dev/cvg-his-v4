import { describe, it, expect } from 'vitest';
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
  requireEnum,
} from './index.js';

describe('validation module', () => {
  describe('readStringEnv', () => {
    it('returns value when present', () => {
      expect(readStringEnv('hello', 'MY_VAR')).toBe('hello');
    });

    it('returns fallback when value is undefined and fallback provided', () => {
      expect(readStringEnv(undefined, 'MY_VAR', 'default')).toBe('default');
    });

    it('throws for empty string even with fallback provided', () => {
      // Empty string is not undefined, so fallback is NOT used
      expect(() => readStringEnv('', 'MY_VAR', 'default')).toThrow();
    });

    it('throws for undefined and no fallback', () => {
      expect(() => readStringEnv(undefined, 'MY_VAR')).toThrow();
    });

    it('throws ValidationError when value is only whitespace', () => {
      expect(() => readStringEnv('   ', 'MY_VAR')).toThrow();
    });

    it('does not trim before returning', () => {
      // The implementation does not trim whitespace
      expect(readStringEnv('  hello  ', 'MY_VAR')).toBe('  hello  ');
    });
  });

  describe('readNumberEnv', () => {
    it('parses valid number string', () => {
      expect(readNumberEnv('42', 'MY_VAR', 0)).toBe(42);
    });

    it('uses fallback when value is undefined', () => {
      expect(readNumberEnv(undefined, 'MY_VAR', 99)).toBe(99);
    });

    it('converts coerced string number', () => {
      expect(readNumberEnv('123', 'MY_VAR', 0)).toBe(123);
    });

    it('throws for non-numeric string', () => {
      expect(() => readNumberEnv('abc', 'MY_VAR', 0)).toThrow();
    });

    it('returns 0 for empty string (coerced) even with fallback', () => {
      // Empty string coerces to 0, not fallback value
      expect(readNumberEnv('', 'MY_VAR', 10)).toBe(0);
    });
  });

  describe('requireNonEmptyString', () => {
    it('returns trimmed string when valid', () => {
      expect(requireNonEmptyString('  hello  ', 'field')).toBe('hello');
    });

    it('throws for non-string', () => {
      expect(() => requireNonEmptyString(123, 'field')).toThrow();
    });

    it('throws for empty string', () => {
      expect(() => requireNonEmptyString('', 'field')).toThrow();
    });

    it('throws for whitespace-only string', () => {
      expect(() => requireNonEmptyString('   ', 'field')).toThrow();
    });

    it('throws for null', () => {
      expect(() => requireNonEmptyString(null, 'field')).toThrow();
    });

    it('throws for undefined', () => {
      expect(() => requireNonEmptyString(undefined, 'field')).toThrow();
    });
  });

  describe('requireOptionalString', () => {
    it('returns undefined for undefined input', () => {
      expect(requireOptionalString(undefined)).toBeUndefined();
    });

    it('returns trimmed string for valid input', () => {
      expect(requireOptionalString('  hello  ')).toBe('hello');
    });

    it('throws for empty string', () => {
      expect(() => requireOptionalString('')).toThrow();
    });
  });

  describe('requireBoolean', () => {
    it('returns true for true', () => {
      expect(requireBoolean(true, 'field')).toBe(true);
    });

    it('returns false for false', () => {
      expect(requireBoolean(false, 'field')).toBe(false);
    });

    it('throws for string "true"', () => {
      expect(() => requireBoolean('true', 'field')).toThrow();
    });

    it('throws for number 1', () => {
      expect(() => requireBoolean(1, 'field')).toThrow();
    });

    it('throws for null', () => {
      expect(() => requireBoolean(null, 'field')).toThrow();
    });
  });

  describe('requireOptionalBoolean', () => {
    it('returns undefined for undefined', () => {
      expect(requireOptionalBoolean(undefined)).toBeUndefined();
    });

    it('returns boolean for valid input', () => {
      expect(requireOptionalBoolean(true)).toBe(true);
    });

    it('throws for non-boolean', () => {
      expect(() => requireOptionalBoolean('yes')).toThrow();
    });
  });

  describe('requireStringArray', () => {
    it('returns array of trimmed strings', () => {
      expect(requireStringArray(['  a  ', 'b'], 'field')).toEqual(['a', 'b']);
    });

    it('throws for non-array', () => {
      expect(() => requireStringArray('not-array', 'field')).toThrow();
    });

    it('throws if any element is empty string', () => {
      expect(() => requireStringArray(['a', ''], 'field')).toThrow();
    });

    it('throws if any element is not a string', () => {
      expect(() => requireStringArray(['a', 123], 'field')).toThrow();
    });
  });

  describe('requirePositiveNumber', () => {
    it('returns number when positive', () => {
      expect(requirePositiveNumber(42, 'field')).toBe(42);
    });

    it('returns 0.01 for small positive', () => {
      expect(requirePositiveNumber(0.01, 'field')).toBe(0.01);
    });

    it('throws for zero', () => {
      expect(() => requirePositiveNumber(0, 'field')).toThrow();
    });

    it('throws for negative', () => {
      expect(() => requirePositiveNumber(-1, 'field')).toThrow();
    });

    it('throws for Infinity', () => {
      expect(() => requirePositiveNumber(Infinity, 'field')).toThrow();
    });

    it('throws for NaN', () => {
      expect(() => requirePositiveNumber(NaN, 'field')).toThrow();
    });

    it('throws for non-number', () => {
      expect(() => requirePositiveNumber('42', 'field')).toThrow();
    });
  });

  describe('requireOptionalPositiveNumber', () => {
    it('returns undefined for undefined', () => {
      expect(requireOptionalPositiveNumber(undefined)).toBeUndefined();
    });

    it('returns number for valid input', () => {
      expect(requireOptionalPositiveNumber(42)).toBe(42);
    });

    it('throws for negative', () => {
      expect(() => requireOptionalPositiveNumber(-1)).toThrow();
    });
  });

  describe('requireEnum', () => {
    const allowed = ['active', 'inactive', 'pending'] as const;

    it('returns value when in allowed list', () => {
      expect(requireEnum('active', 'status', allowed)).toBe('active');
    });

    it('returns trimmed value', () => {
      expect(requireEnum('  active  ', 'status', allowed)).toBe('active');
    });

    it('throws for value not in allowed list', () => {
      expect(() => requireEnum('unknown', 'status', allowed)).toThrow();
    });

    it('throws for empty string', () => {
      expect(() => requireEnum('', 'status', allowed)).toThrow();
    });

    it('throws for non-string', () => {
      expect(() => requireEnum(123, 'status', allowed)).toThrow();
    });
  });
});
