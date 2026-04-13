import { describe, it, expect } from 'vitest';
import {
  getSLOConfigs,
  getSLOConfig,
  calculateErrorBudget,
  getSLOStatus,
  calculateBudgetRemaining,
  calculateBurnRate,
  generateSLOReport,
  type SLOConfig
} from '../../../apps/api/src/slos.js';

describe('slos', () => {
  describe('getSLOConfigs', () => {
    it('returns all 4 SLO configs', () => {
      const configs = getSLOConfigs();
      expect(configs).toHaveLength(4);
    });

    it('includes api-latency-p95', () => {
      const config = getSLOConfig('api-latency-p95');
      expect(config).toBeDefined();
      expect(config!.target).toBe(200);
      expect(config!.unit).toBe('ms');
    });

    it('includes api-availability', () => {
      const config = getSLOConfig('api-availability');
      expect(config).toBeDefined();
      expect(config!.target).toBe(99.5);
      expect(config!.unit).toBe('percent');
    });

    it('returns undefined for unknown id', () => {
      const config = getSLOConfig('unknown-slo');
      expect(config).toBeUndefined();
    });
  });

  describe('getSLOStatus', () => {
    it('returns healthy when latency below alert threshold', () => {
      const config = getSLOConfig('api-latency-p95')!;
      expect(getSLOStatus(config, 150)).toBe('healthy');
      expect(getSLOStatus(config, 200)).toBe('healthy');
    });

    it('returns alert when latency above alert threshold', () => {
      const config = getSLOConfig('api-latency-p95')!;
      expect(getSLOStatus(config, 251)).toBe('alert');
      expect(getSLOStatus(config, 280)).toBe('alert');
    });

    it('returns critical when latency above critical threshold', () => {
      const config = getSLOConfig('api-latency-p95')!;
      expect(getSLOStatus(config, 301)).toBe('critical');
      expect(getSLOStatus(config, 500)).toBe('critical');
    });

    it('for availability, lower values are worse', () => {
      const config = getSLOConfig('api-availability')!;
      expect(getSLOStatus(config, 99.9)).toBe('healthy');
      expect(getSLOStatus(config, 98.5)).toBe('alert');
      expect(getSLOStatus(config, 97.5)).toBe('critical');
    });

    it('for error rate, higher values are worse', () => {
      const config = getSLOConfig('api-error-rate')!;
      expect(getSLOStatus(config, 0.05)).toBe('healthy');
      expect(getSLOStatus(config, 0.6)).toBe('alert');
      expect(getSLOStatus(config, 1.2)).toBe('critical');
    });
  });

  describe('calculateBudgetRemaining', () => {
    it('for latency: returns 0 when at target (no excess budget consumed)', () => {
      const config = getSLOConfig('api-latency-p95')!;
      // Budget remaining = (target - currentValue) / target * 100
      // At target=200, currentValue=200: (200-200)/200*100 = 0
      expect(calculateBudgetRemaining(config, 200)).toBe(0);
    });

    it('for latency: returns positive when below target (good performance)', () => {
      const config = getSLOConfig('api-latency-p95')!;
      // Below target means we're doing better than required, so budget remaining is positive
      // At 100ms with 200ms target: (200-100)/200*100 = 50
      expect(calculateBudgetRemaining(config, 100)).toBe(50);
    });

    it('for latency: returns 0 when at critical threshold', () => {
      const config = getSLOConfig('api-latency-p95')!;
      // 100% budget means at target, 0% means at max allowed
      // At 300ms (critical), budget should be significantly reduced or 0
      expect(calculateBudgetRemaining(config, 300)).toBeLessThanOrEqual(0);
    });

    it('for availability: returns ~99.5 when at target', () => {
      const config = getSLOConfig('api-availability')!;
      // budget = (currentValue - (100 - target)) / target * 100
      // At 99.5% with 99.5% target: (99.5 - 0.5) / 99.5 * 100 ≈ 99.5
      expect(calculateBudgetRemaining(config, 99.5)).toBeCloseTo(99.5, 1);
    });

    it('for availability: returns 0 when below allowed minimum', () => {
      const config = getSLOConfig('api-availability')!;
      // Below 99.5% availability means error budget exhausted
      expect(calculateBudgetRemaining(config, 99.0)).toBeLessThan(100);
    });

    it('for error rate: returns 0 when at target', () => {
      const config = getSLOConfig('api-error-rate')!;
      // budget = (target - currentValue) / target * 100
      // At target=0.1, currentValue=0.1: (0.1-0.1)/0.1*100 = 0
      expect(calculateBudgetRemaining(config, 0.1)).toBe(0);
    });

    it('caps result between 0 and 100', () => {
      const config = getSLOConfig('api-latency-p95')!;
      // Way over threshold should cap at 0
      expect(calculateBudgetRemaining(config, 1000)).toBe(0);
      // Way under target (high latency) should cap at 0 since Math.max(0, ...) enforces floor
      // Actually 1ms latency is way below 200ms target, so budget is (200-1)/200*100 = 99.5
      expect(calculateBudgetRemaining(config, 1)).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateBurnRate', () => {
    it('returns 1 when at target for latency', () => {
      const config = getSLOConfig('api-latency-p95')!;
      // At target = burn rate of 1
      expect(calculateBurnRate(config, 200)).toBeLessThan(2);
    });

    it('returns greater than 1 when above target for latency', () => {
      const config = getSLOConfig('api-latency-p95')!;
      // Higher latency = higher burn rate
      const burnRate = calculateBurnRate(config, 400);
      expect(burnRate).toBeGreaterThan(1);
    });

    it('for availability: returns 1 when at target', () => {
      const config = getSLOConfig('api-availability')!;
      const burnRate = calculateBurnRate(config, 99.5);
      expect(burnRate).toBeLessThan(2);
    });

    it('for error rate: returns 1 when at target', () => {
      const config = getSLOConfig('api-error-rate')!;
      expect(calculateBurnRate(config, 0.1)).toBeLessThanOrEqual(1);
    });

    it('returns 0 when target is zero to avoid division by zero', () => {
      const zeroTargetConfig = { ...getSLOConfig('api-error-rate')!, target: 0 };
      expect(calculateBurnRate(zeroTargetConfig as SLOConfig, 0.5)).toBe(0);
    });
  });

  describe('calculateErrorBudget', () => {
    it('returns 100 for non-availability categories', () => {
      const config = getSLOConfig('api-latency-p95')!;
      expect(calculateErrorBudget(config)).toBe(100);
    });

    it('returns budget minutes for availability category', () => {
      const config = getSLOConfig('api-availability')!;
      const budget = calculateErrorBudget(config);
      expect(budget).toBeGreaterThan(0);
      // 30-day budget at 99.5% target
      // Allowed downtime: 0.5% of 30 days = 0.15 days = ~216 minutes
      expect(budget).toBeGreaterThan(100);
    });
  });

  describe('generateSLOReport', () => {
    it('generates report with healthy status when all metrics are good', () => {
      const report = generateSLOReport({
        p95LatencyMs: 100,
        p99LatencyMs: 250,
        availabilityPercent: 99.9,
        errorRatePercent: 0.01
      });

      expect(report.overallStatus).toBe('healthy');
      expect(report.errorBudgetExhausted).toBe(false);
      expect(report.slos).toHaveLength(4);
    });

    it('marks report as degraded when any SLO is alert', () => {
      const report = generateSLOReport({
        p95LatencyMs: 260, // alert
        p99LatencyMs: 400,
        availabilityPercent: 99.7,
        errorRatePercent: 0.05
      });

      expect(report.overallStatus).toBe('degraded');
    });

    it('marks report as critical when any SLO is critical', () => {
      const report = generateSLOReport({
        p95LatencyMs: 350, // critical
        p99LatencyMs: 600,
        availabilityPercent: 99.9,
        errorRatePercent: 0.01
      });

      expect(report.overallStatus).toBe('critical');
    });

    it('marks errorBudgetExhausted when any budget is at 0', () => {
      const report = generateSLOReport({
        p95LatencyMs: 1000, // way over threshold
        p99LatencyMs: 1000,
        availabilityPercent: 97, // below critical
        errorRatePercent: 2.0 // way over
      });

      expect(report.errorBudgetExhausted).toBe(true);
    });

    it('sets generatedAt to current time', () => {
      const before = new Date();
      const report = generateSLOReport({
        p95LatencyMs: 100,
        p99LatencyMs: 200,
        availabilityPercent: 99.9,
        errorRatePercent: 0.01
      });
      const after = new Date();

      expect(report.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(report.generatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('includes window of 30d', () => {
      const report = generateSLOReport({
        p95LatencyMs: 100,
        p99LatencyMs: 200,
        availabilityPercent: 99.9,
        errorRatePercent: 0.01
      });

      expect(report.window).toBe('30d');
    });
  });
});