import { describe, expect, it } from 'vitest';

import {
  criticalSoakFingerprint,
  parseCriticalSoakRuns,
  redactCriticalOutput,
} from '../../../infra/scripts/run-critical-soak.mjs';

describe('critical soak runner', () => {
  it('defaults to 20 bounded runs and rejects invalid values', () => {
    expect(parseCriticalSoakRuns(undefined)).toBe(20);
    expect(parseCriticalSoakRuns('20')).toBe(20);
    expect(() => parseCriticalSoakRuns('0')).toThrow(/between 1 and 100/);
    expect(() => parseCriticalSoakRuns('2.5')).toThrow(/between 1 and 100/);
  });

  it('redacts database passwords and named secrets from retained logs', () => {
    const output = redactCriticalOutput(
      'postgres://admin:danger@example.test/db AUTH_SECRET=danger TOKEN=danger'
    );
    expect(output).toBe('postgres://admin:***@example.test/db AUTH_SECRET=*** TOKEN=***');
  });

  it('fingerprints the complete environment deterministically', () => {
    expect(criticalSoakFingerprint({ sha: 'abc', node: '22' })).toBe(
      criticalSoakFingerprint({ sha: 'abc', node: '22' })
    );
    expect(criticalSoakFingerprint({ sha: 'abc' })).not.toBe(
      criticalSoakFingerprint({ sha: 'def' })
    );
  });
});
