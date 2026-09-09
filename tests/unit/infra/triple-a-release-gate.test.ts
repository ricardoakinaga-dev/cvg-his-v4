import { describe, expect, it } from 'vitest';

import { scoreCriteria } from '../../../scripts/run-triple-a-release-gate.mjs';

describe('Triple-A release gate scoring', () => {
  it('keeps critical score separate and counts every open P0', () => {
    const result = scoreCriteria([
      { id: 'p0-pass', priority: 'P0', status: 'PASS' },
      { id: 'p0-partial', priority: 'P0', status: 'PARTIAL' },
      { id: 'p1-pass', priority: 'P1', status: 'PASS' },
      { id: 'p1-missing', priority: 'P1', status: 'NOT_RUN' },
    ]);

    expect(result.score).toBe(63);
    expect(result.critical_score).toBe(75);
    expect(result.open_p0).toBe(1);
  });

  it('does not award score to missing or failed evidence', () => {
    const result = scoreCriteria([
      { id: 'p0-fail', priority: 'P0', status: 'FAIL' },
      { id: 'p1-missing', priority: 'P1', status: 'NOT_RUN' },
    ]);

    expect(result.score).toBe(0);
    expect(result.critical_score).toBe(0);
    expect(result.open_p0).toBe(1);
  });
});
