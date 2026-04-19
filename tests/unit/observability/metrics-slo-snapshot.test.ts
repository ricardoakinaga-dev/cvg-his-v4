import { describe, it, expect, beforeEach } from 'vitest';

import {
  getCurrentSloSnapshot,
  recordRequestSloObservation,
  resetRequestSloObservations
} from '../../../apps/api/src/metrics.js';

describe('Metrics SLO snapshot', () => {
  beforeEach(() => {
    resetRequestSloObservations();
  });

  it('builds a current SLO snapshot from recent request observations', () => {
    const now = Date.now();
    recordRequestSloObservation({ durationMs: 120, statusCode: 200, timestamp: now - 1_000 });
    recordRequestSloObservation({ durationMs: 260, statusCode: 200, timestamp: now - 2_000 });
    recordRequestSloObservation({ durationMs: 900, statusCode: 503, timestamp: now - 3_000 });
    recordRequestSloObservation({ durationMs: 80, statusCode: 200, timestamp: now - 10 * 60 * 1000 });

    const snapshot = getCurrentSloSnapshot(now);

    expect(snapshot.requestCount5m).toBe(3);
    expect(snapshot.requestCount1h).toBe(4);
    expect(snapshot.p95LatencyMs).toBe(900);
    expect(snapshot.p99LatencyMs).toBe(900);
    expect(snapshot.errorRatePercent).toBeCloseTo(33.3333, 3);
    expect(snapshot.availabilityPercent).toBeCloseTo(75, 3);
  });
});
