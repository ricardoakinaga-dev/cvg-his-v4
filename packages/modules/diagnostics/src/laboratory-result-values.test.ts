import { describe, expect, it } from 'vitest';

import { normalizeLaboratoryResultValues } from './laboratory-result-values.js';

describe('normalizeLaboratoryResultValues', () => {
  it('returns an immutable defensive copy of the structured values', () => {
    const input = [{ parameter: 'ALT', value: '92', unit: 'U/L', outOfRange: false }];
    const normalized = normalizeLaboratoryResultValues(input);

    expect(normalized).toEqual(input);
    expect(normalized).not.toBe(input);
    expect(Object.isFrozen(normalized)).toBe(true);
    expect(Object.isFrozen(normalized?.[0])).toBe(true);
  });

  it('rejects malformed or oversized values before persistence', () => {
    expect(() => normalizeLaboratoryResultValues([
      { parameter: 'ALT', value: '\u0000' }
    ])).toThrow(/printable/);
    expect(() => normalizeLaboratoryResultValues(
      Array.from({ length: 201 }, (_, index) => ({ parameter: `P${index}`, value: '1' }))
    )).toThrow(/at most 200/);
    expect(() => normalizeLaboratoryResultValues([
      { parameter: 'ALT', value: '92', outOfRange: 'false' }
    ])).toThrow(/outOfRange.*boolean/);
  });
});
