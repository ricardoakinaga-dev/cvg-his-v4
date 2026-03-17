import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import type { DueOrderScheduleRow, MedicationDosesRepo } from './repo.js';
import { createMedicationDosesService } from './service.js';

const fakeDb = {} as typeof import('@cvg-his/db').db;

function createRequestContext(overrides: Partial<RequestContext> = {}): RequestContext {
  return {
    requestId: 'req-1',
    actor: {
      accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
      userId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
      role: 'enfermagem',
      roles: ['enfermagem'],
      permissions: []
    },
    ...overrides
  };
}

function makeSchedule(overrides: Partial<DueOrderScheduleRow> = {}): DueOrderScheduleRow {
  return {
    scheduleId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef1',
    orderId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    accountId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef2',
    stayId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef3',
    wardId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef4',
    encounterId: null,
    patientId: 'fdd8c156-b52d-4117-a5e1-73dd61474ef5',
    patientName: 'Luna',
    medicationName: 'amoxicilina',
    doseValue: '50',
    doseUnit: 'mg',
    route: 'VO',
    frequencyType: 'custom',
    orderStartAt: new Date('2026-02-20T00:00:00.000Z'),
    orderEndAt: null,
    scheduleType: 'fixed_times',
    intervalMinutes: null,
    times: ['09:00'],
    nextDueAt: null,
    ...overrides
  };
}

function createRepoMock(): MedicationDosesRepo {
  return {
    listActiveOrderSchedules: vi.fn(async () => []),
    listLastScheduledForByOrderIds: vi.fn(async () => new Map()),
    listAdministrationRowsInWindow: vi.fn(async () => []),
    updateScheduleNextDueAt: vi.fn(async () => undefined)
  };
}

describe('medication doses service safety behavior', () => {
  const previousDefaultTimezone = process.env.DEFAULT_TIMEZONE;

  beforeEach(() => {
    process.env.DEFAULT_TIMEZONE = 'UTC';
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-20T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env.DEFAULT_TIMEZONE = previousDefaultTimezone;
  });

  it('keeps delayed dose visible as upcoming at delayedUntil', async () => {
    const repo = createRepoMock();
    const schedule = makeSchedule();
    vi.mocked(repo.listActiveOrderSchedules).mockResolvedValue([schedule]);
    vi.mocked(repo.listLastScheduledForByOrderIds).mockResolvedValue(new Map());
    vi.mocked(repo.listAdministrationRowsInWindow).mockResolvedValue([
      {
        orderId: schedule.orderId,
        scheduledFor: new Date('2026-02-20T09:00:00.000Z'),
        status: 'delayed',
        delayedUntil: new Date('2026-02-20T11:00:00.000Z')
      }
    ]);

    const service = createMedicationDosesService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      { repo }
    );

    const result = await service.getDue({
      stayId: schedule.stayId ?? undefined,
      windowMin: 120
    });

    expect(result.overdue).toHaveLength(0);
    expect(result.upcoming).toHaveLength(1);
    expect(result.upcoming[0]?.orderId).toBe(schedule.orderId);
    expect(result.upcoming[0]?.scheduledFor).toBe('2026-02-20T11:00:00.000Z');
  });

  it('does not suppress follow-up when slot was refused', async () => {
    const repo = createRepoMock();
    const schedule = makeSchedule();
    vi.mocked(repo.listActiveOrderSchedules).mockResolvedValue([schedule]);
    vi.mocked(repo.listLastScheduledForByOrderIds).mockResolvedValue(new Map());
    vi.mocked(repo.listAdministrationRowsInWindow).mockResolvedValue([
      {
        orderId: schedule.orderId,
        scheduledFor: new Date('2026-02-20T09:00:00.000Z'),
        status: 'refused',
        delayedUntil: null
      }
    ]);

    const service = createMedicationDosesService(
      {
        db: fakeDb,
        requestContext: createRequestContext()
      },
      { repo }
    );

    const result = await service.getDue({
      stayId: schedule.stayId ?? undefined,
      windowMin: 120
    });

    expect(result.upcoming).toHaveLength(0);
    expect(result.overdue).toHaveLength(1);
    expect(result.overdue[0]?.orderId).toBe(schedule.orderId);
    expect(result.overdue[0]?.scheduledFor).toBe('2026-02-20T09:00:00.000Z');
  });
});
