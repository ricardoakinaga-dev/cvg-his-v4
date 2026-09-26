import { describe, expect, it } from 'vitest';
import { DatabaseReportRepository } from './index.js';
import { nextRunAt } from './report-schedule-time.js';

describe('report database boundary', () => {
  it('preserves UTC schedule cadence outside the SQL adapter', () => {
    expect(nextRunAt('2026-01-31T12:00:00.000Z', 'daily')).toBe('2026-02-01T12:00:00.000Z');
    expect(nextRunAt('2026-01-31T12:00:00.000Z', 'weekly')).toBe('2026-02-07T12:00:00.000Z');
    expect(nextRunAt('2026-01-31T12:00:00.000Z', 'monthly')).toBe('2026-02-28T12:00:00.000Z');
    expect(
      nextRunAt('2026-02-28T12:00:00.000Z', 'monthly', '2026-01-31T12:00:00.000Z')
    ).toBe('2026-03-31T12:00:00.000Z');
    expect(nextRunAt('2024-01-31T12:00:00.000Z', 'monthly')).toBe('2024-02-29T12:00:00.000Z');
    expect(
      nextRunAt('2026-02-28T12:00:00.000Z', 'monthly', '2026-01-30T12:00:00.000Z')
    ).toBe('2026-03-30T12:00:00.000Z');
  });

  it('keeps the fenced repository surface publicly constructible', () => {
    const repository = new DatabaseReportRepository();

    expect(repository).toBeInstanceOf(DatabaseReportRepository);
    expect(typeof repository.saveExecution).toBe('function');
    expect(typeof repository.saveExecutionForScheduleClaim).toBe('function');
    expect(typeof repository.saveExportForScheduleClaim).toBe('function');
    expect(typeof repository.saveDeliveryForScheduleClaim).toBe('function');
    expect(typeof repository.claimDueSchedulesWithLease).toBe('function');
    expect(typeof repository.saveClaimedSchedule).toBe('function');
    expect(typeof repository.claimFailedDeliveries).toBe('function');
    expect(typeof repository.saveClaimedDelivery).toBe('function');
  });
});
