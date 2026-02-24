import { describe, expect, it } from 'vitest';
import { computeActiveSlot, computeLatestPastSlot, computeNextDueSlot, computeMedicationSlots, isValidTimeZone } from './medicationSlots.js';
describe('medication slot computation', () => {
    it('computes HH:mm fixed schedule across midnight (latest_past + next_due)', () => {
        const schedule = {
            scheduleType: 'fixed_times',
            intervalMinutes: null,
            times: ['23:30', '00:30'],
            orderStartAt: new Date('2026-02-19T00:00:00.000Z'),
            orderEndAt: null,
            lastScheduledFor: null
        };
        const now = new Date('2026-02-20T03:45:00.000Z');
        const latestPast = computeLatestPastSlot(now, schedule, 'America/Sao_Paulo');
        const nextDue = computeNextDueSlot(now, schedule, 'America/Sao_Paulo');
        expect(latestPast?.toISOString()).toBe('2026-02-20T03:30:00.000Z');
        expect(nextDue?.toISOString()).toBe('2026-02-21T02:30:00.000Z');
    });
    it('handles interval schedule with no prior administration', () => {
        const now = new Date('2026-02-20T12:05:00.000Z');
        const schedule = {
            scheduleType: 'interval',
            intervalMinutes: 60,
            times: null,
            orderStartAt: new Date('2026-02-20T08:00:00.000Z'),
            orderEndAt: null,
            lastScheduledFor: null
        };
        const latestPast = computeLatestPastSlot(now, schedule, 'UTC');
        const nextDue = computeNextDueSlot(now, schedule, 'UTC');
        const active = computeActiveSlot(now, schedule, null, 'UTC');
        expect(latestPast?.toISOString()).toBe('2026-02-20T12:00:00.000Z');
        expect(nextDue?.toISOString()).toBe('2026-02-20T13:00:00.000Z');
        expect(active?.toISOString()).toBe('2026-02-20T12:00:00.000Z');
    });
    it('keeps latest_past and next_due coherent when a prior admin exists', () => {
        const now = new Date('2026-02-20T12:05:00.000Z');
        const schedule = {
            scheduleType: 'interval',
            intervalMinutes: 60,
            times: null,
            orderStartAt: new Date('2026-02-20T08:00:00.000Z'),
            orderEndAt: null,
            lastScheduledFor: new Date('2026-02-20T08:00:00.000Z')
        };
        const latestPast = computeLatestPastSlot(now, schedule, 'UTC');
        const nextDue = computeNextDueSlot(now, schedule, 'UTC');
        const windowSlots = computeMedicationSlots({
            schedule,
            windowStart: new Date('2026-02-20T10:05:00.000Z'),
            windowEnd: new Date('2026-02-20T14:05:00.000Z'),
            timezone: 'UTC'
        });
        expect(latestPast?.toISOString()).toBe('2026-02-20T12:00:00.000Z');
        expect(nextDue?.toISOString()).toBe('2026-02-20T13:00:00.000Z');
        expect(windowSlots.map((item) => item.toISOString())).toContain('2026-02-20T13:00:00.000Z');
    });
    it('applies timezone offset when computing fixed slot', () => {
        if (!isValidTimeZone('America/Sao_Paulo')) {
            return;
        }
        const schedule = {
            scheduleType: 'fixed_times',
            intervalMinutes: null,
            times: ['08:00'],
            orderStartAt: new Date('2026-02-20T00:00:00.000Z'),
            orderEndAt: null,
            lastScheduledFor: null
        };
        const now = new Date('2026-02-20T11:00:00.000Z');
        const utcLatestPast = computeLatestPastSlot(now, schedule, 'UTC');
        const saoPauloLatestPast = computeLatestPastSlot(now, schedule, 'America/Sao_Paulo');
        expect(utcLatestPast?.toISOString()).toBe('2026-02-20T08:00:00.000Z');
        expect(saoPauloLatestPast?.toISOString()).toBe('2026-02-20T11:00:00.000Z');
        expect(saoPauloLatestPast?.toISOString()).not.toBe(utcLatestPast?.toISOString());
    });
});
//# sourceMappingURL=medicationSlots.test.js.map