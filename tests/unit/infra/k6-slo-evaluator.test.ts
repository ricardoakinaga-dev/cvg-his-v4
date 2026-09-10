import { describe, expect, it } from 'vitest';

import { evaluateThreshold } from '../../../benchmarks/k6/slo-evaluator.js';

describe('k6 SLO evaluator', () => {
  it('uses lower-is-better semantics by default', () => {
    expect(evaluateThreshold(199, 200)).toBe(true);
    expect(evaluateThreshold(200, 200)).toBe(false);
  });

  it('uses higher-is-better semantics for availability', () => {
    expect(evaluateThreshold(99.5, 99.5, 'gte')).toBe(true);
    expect(evaluateThreshold(99.49, 99.5, 'gte')).toBe(false);
  });

  it('fails closed for missing or invalid measurements', () => {
    expect(evaluateThreshold(Number.NaN, 99.5, 'gte')).toBe(false);
    expect(evaluateThreshold(0, Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('rejects an unknown direction', () => {
    expect(() => evaluateThreshold(1, 2, 'sideways')).toThrow(
      'Unsupported SLO comparison direction: sideways'
    );
  });
});
