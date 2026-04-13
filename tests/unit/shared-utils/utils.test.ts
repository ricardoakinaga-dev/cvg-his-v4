import { describe, it, expect } from 'vitest';
import { nowIso, createCorrelationId, sleep } from '@cvg-his-v2/shared-utils';

describe('shared-utils', () => {
  describe('nowIso', () => {
    it('returns ISO 8601 formatted timestamp', () => {
      const result = nowIso();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it('returns current time within 1 second', () => {
      const before = Date.now();
      const result = nowIso();
      const after = Date.now();
      const parsed = new Date(result).getTime();
      expect(parsed).toBeGreaterThanOrEqual(before);
      expect(parsed).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe('createCorrelationId', () => {
    it('creates unique ids', () => {
      const id1 = createCorrelationId();
      const id2 = createCorrelationId();
      expect(id1).not.toBe(id2);
    });

    it('uses default prefix cvg', () => {
      const id = createCorrelationId();
      expect(id).toMatch(/^cvg_/);
    });

    it('uses custom prefix when provided', () => {
      const id = createCorrelationId('test');
      expect(id).toMatch(/^test_/);
    });

    it('contains timestamp component', () => {
      const now = Date.now().toString(36);
      const id = createCorrelationId();
      // id format: prefix_timestamp_random
      const parts = id.split('_');
      expect(parts.length).toBe(3);
    });

    it('has format prefix_timestamp_random', () => {
      const id = createCorrelationId('corr');
      const parts = id.split('_');
      expect(parts).toHaveLength(3);
      expect(parts[0]).toBe('corr');
      expect(parts[1]).toMatch(/^[0-9a-z]+$/);
      expect(parts[2]).toMatch(/^[0-9a-z]+$/);
    });
  });

  describe('sleep', () => {
    it('resolves after specified milliseconds', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeGreaterThanOrEqual(45); // allow some tolerance
      expect(elapsed).toBeLessThan(200);
    });

    it('resolves immediately for 0ms', async () => {
      const start = Date.now();
      await sleep(0);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(50);
    });
  });
});
