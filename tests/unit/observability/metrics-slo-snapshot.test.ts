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

  it('keeps only the latest 20,000 observations across sustained traffic', () => {
    const now = Date.now();
    for (let index = 0; index < 45_000; index += 1) {
      recordRequestSloObservation({
        durationMs: index < 25_000 ? 9_000 : 100,
        statusCode: index < 25_000 ? 503 : 200,
        timestamp: now
      });
    }
    expect(getCurrentSloSnapshot(now)).toMatchObject({
      requestCount5m: 20_000,
      requestCount1h: 20_000,
      p95LatencyMs: 100,
      p99LatencyMs: 100,
      errorRatePercent: 0,
      availabilityPercent: 100
    });

    recordRequestSloObservation({ durationMs: 200, statusCode: 503, timestamp: now });
    expect(getCurrentSloSnapshot(now)).toMatchObject({
      requestCount1h: 20_000,
      errorRatePercent: 0.005,
      availabilityPercent: 99.995
    });

    resetRequestSloObservations();
    recordRequestSloObservation({ durationMs: 20, statusCode: 503, timestamp: now });
    expect(getCurrentSloSnapshot(now)).toMatchObject({
      requestCount5m: 1,
      requestCount1h: 1,
      p95LatencyMs: 20,
      errorRatePercent: 100,
      availabilityPercent: 0
    });
  });

  it('includes exact window boundaries and expires the entire queue after inactivity', () => {
    const now = Date.now();
    for (const age of [3_600_001, 3_600_000, 300_000, 299_999, 0]) {
      recordRequestSloObservation({ durationMs: 100, statusCode: 200, timestamp: now - age });
    }
    expect(getCurrentSloSnapshot(now)).toMatchObject({ requestCount5m: 3, requestCount1h: 4 });
    expect(getCurrentSloSnapshot(now + 3_600_000)).toMatchObject({
      requestCount5m: 0,
      requestCount1h: 1
    });
    expect(getCurrentSloSnapshot(now + 3_600_001)).toMatchObject({
      requestCount5m: 0,
      requestCount1h: 0,
      p95LatencyMs: 0,
      p99LatencyMs: 0,
      errorRatePercent: 0,
      availabilityPercent: 100
    });
    recordRequestSloObservation({ durationMs: -1, statusCode: 200, timestamp: now + 3_600_002 });
    expect(getCurrentSloSnapshot(now + 3_600_002)).toMatchObject({
      requestCount1h: 1,
      p95LatencyMs: 0
    });
  });
});
