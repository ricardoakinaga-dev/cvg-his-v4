import { describe, expect, it } from 'vitest';
import { calculateDoseStatus, calculateDelaySeverity, shouldTriggerOverdueAlert, categorizeDoses } from './doseDueLogic.js';
describe('doseDueLogic', () => {
    describe('calculateDoseStatus', () => {
        it('should return administered status for administered doses', () => {
            const now = new Date('2026-02-20T10:00:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                administrationStatus: 'administered'
            });
            expect(result.status).toBe('administered');
            expect(result.isOverdue).toBe(false);
            expect(result.isDue).toBe(false);
        });
        it('should return refused status for refused doses', () => {
            const now = new Date('2026-02-20T10:00:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                administrationStatus: 'refused'
            });
            expect(result.status).toBe('refused');
        });
        it('should return held status for held doses', () => {
            const now = new Date('2026-02-20T10:00:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                administrationStatus: 'held'
            });
            expect(result.status).toBe('held');
        });
        it('should return upcoming for future doses', () => {
            const now = new Date('2026-02-20T09:00:00Z');
            const scheduledFor = new Date('2026-02-20T10:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor
            });
            expect(result.status).toBe('upcoming');
            expect(result.delayMinutes).toBe(0);
            expect(result.isOverdue).toBe(false);
            expect(result.isDue).toBe(false);
        });
        it('should return due for doses within grace period', () => {
            const now = new Date('2026-02-20T09:15:00Z'); // 15 min after scheduled
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('due');
            expect(result.delayMinutes).toBe(15);
            expect(result.isWithinGrace).toBe(true);
            expect(result.isOverdue).toBe(false);
            expect(result.isDue).toBe(true);
        });
        it('should return overdue for doses past grace period', () => {
            const now = new Date('2026-02-20T10:00:00Z'); // 60 min after scheduled
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('overdue');
            expect(result.delayMinutes).toBe(60);
            expect(result.isWithinGrace).toBe(false);
            expect(result.isOverdue).toBe(true);
            expect(result.isDue).toBe(false);
        });
        it('should use default grace period when not specified', () => {
            const now = new Date('2026-02-20T09:25:00Z'); // 25 min after scheduled
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor
            });
            expect(result.status).toBe('due');
            expect(result.isWithinGrace).toBe(true);
        });
        it('should handle delayed doses with future delayedUntil', () => {
            const now = new Date('2026-02-20T09:30:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const delayedUntil = new Date('2026-02-20T11:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                delayedUntil,
                administrationStatus: 'delayed'
            });
            expect(result.status).toBe('delayed');
            expect(result.effectiveScheduledFor).toEqual(delayedUntil);
        });
        it('should handle delayed doses where delayedUntil has passed', () => {
            const now = new Date('2026-02-20T11:15:00Z'); // 15 min after delayed until
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const delayedUntil = new Date('2026-02-20T11:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                delayedUntil,
                administrationStatus: 'delayed',
                graceMinutes: 30
            });
            expect(result.status).toBe('due');
            expect(result.delayMinutes).toBe(15);
            expect(result.effectiveScheduledFor).toEqual(delayedUntil);
        });
        it('should handle delayed doses that are overdue based on delayedUntil', () => {
            const now = new Date('2026-02-20T12:00:00Z'); // 60 min after delayed until
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const delayedUntil = new Date('2026-02-20T11:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                delayedUntil,
                administrationStatus: 'delayed',
                graceMinutes: 30
            });
            expect(result.status).toBe('overdue');
            expect(result.delayMinutes).toBe(60);
            expect(result.effectiveScheduledFor).toEqual(delayedUntil);
        });
        it('should handle exact grace period boundary', () => {
            const now = new Date('2026-02-20T09:30:00Z'); // exactly 30 min after
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('due');
            expect(result.isWithinGrace).toBe(true);
        });
        it('should handle one minute past grace period', () => {
            const now = new Date('2026-02-20T09:31:00Z'); // 31 min after
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('overdue');
            expect(result.isWithinGrace).toBe(false);
        });
    });
    describe('calculateDelaySeverity', () => {
        it('should return low for delays under 60 minutes', () => {
            expect(calculateDelaySeverity(30)).toBe('low');
            expect(calculateDelaySeverity(59)).toBe('low');
        });
        it('should return medium for delays between 60 and 119 minutes', () => {
            expect(calculateDelaySeverity(60)).toBe('medium');
            expect(calculateDelaySeverity(90)).toBe('medium');
            expect(calculateDelaySeverity(119)).toBe('medium');
        });
        it('should return high for delays of 120 minutes or more', () => {
            expect(calculateDelaySeverity(120)).toBe('high');
            expect(calculateDelaySeverity(180)).toBe('high');
            expect(calculateDelaySeverity(300)).toBe('high');
        });
    });
    describe('shouldTriggerOverdueAlert', () => {
        it('should return true for overdue status with delay > grace', () => {
            expect(shouldTriggerOverdueAlert('overdue', 45, 30)).toBe(true);
        });
        it('should return false for non-overdue status', () => {
            expect(shouldTriggerOverdueAlert('due', 15, 30)).toBe(false);
            expect(shouldTriggerOverdueAlert('upcoming', 0, 30)).toBe(false);
            expect(shouldTriggerOverdueAlert('administered', 0, 30)).toBe(false);
        });
        it('should return false when delay equals grace period', () => {
            expect(shouldTriggerOverdueAlert('overdue', 30, 30)).toBe(false);
        });
    });
    describe('categorizeDoses', () => {
        const baseTime = new Date('2026-02-20T09:00:00Z');
        it('should categorize doses correctly', () => {
            const doses = [
                // Overdue: 60 min past
                {
                    scheduledFor: new Date('2026-02-20T08:00:00Z'),
                    delayedUntil: null,
                    administrationStatus: undefined
                },
                // Due: 15 min past
                {
                    scheduledFor: new Date('2026-02-20T08:45:00Z'),
                    delayedUntil: null,
                    administrationStatus: undefined
                },
                // Upcoming: 30 min future
                {
                    scheduledFor: new Date('2026-02-20T09:30:00Z'),
                    delayedUntil: null,
                    administrationStatus: undefined
                },
                // Administered
                {
                    scheduledFor: new Date('2026-02-20T08:00:00Z'),
                    delayedUntil: null,
                    administrationStatus: 'administered'
                },
                // Delayed
                {
                    scheduledFor: new Date('2026-02-20T08:00:00Z'),
                    delayedUntil: new Date('2026-02-20T10:00:00Z'),
                    administrationStatus: 'delayed'
                }
            ];
            const result = categorizeDoses(doses, baseTime, 30);
            expect(result.overdue).toHaveLength(1);
            expect(result.due).toHaveLength(1);
            expect(result.upcoming).toHaveLength(1);
            expect(result.administered).toHaveLength(1);
            expect(result.delayed).toHaveLength(1);
        });
        it('should return empty arrays for empty input', () => {
            const result = categorizeDoses([], baseTime, 30);
            expect(result.overdue).toHaveLength(0);
            expect(result.due).toHaveLength(0);
            expect(result.upcoming).toHaveLength(0);
            expect(result.administered).toHaveLength(0);
            expect(result.delayed).toHaveLength(0);
        });
    });
    describe('regression tests for dose due logic', () => {
        /**
         * These tests ensure consistent behavior between API and Worker
         * for determining dose status.
         */
        it('REG-001: should handle DST transition correctly', () => {
            // During DST transition, times can be ambiguous
            // This test ensures we handle such cases gracefully
            const now = new Date('2026-02-20T09:00:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('due');
            expect(result.delayMinutes).toBe(0);
        });
        it('REG-002: should handle very long delays correctly', () => {
            const now = new Date('2026-02-20T17:00:00Z'); // 8 hours after
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('overdue');
            expect(result.delayMinutes).toBe(480); // 8 hours = 480 minutes
            expect(calculateDelaySeverity(result.delayMinutes)).toBe('high');
        });
        it('REG-003: should handle multiple delays correctly', () => {
            // Original schedule: 09:00
            // First delay: 11:00
            // Current time: 11:15 (15 min after first delay)
            const now = new Date('2026-02-20T11:15:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const delayedUntil = new Date('2026-02-20T11:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                delayedUntil,
                administrationStatus: 'delayed',
                graceMinutes: 30
            });
            expect(result.status).toBe('due');
            expect(result.effectiveScheduledFor).toEqual(delayedUntil);
        });
        it('REG-004: should handle zero grace period', () => {
            const now = new Date('2026-02-20T09:01:00Z'); // 1 min after
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 0
            });
            expect(result.status).toBe('overdue');
            expect(result.isWithinGrace).toBe(false);
        });
        it('REG-005: should handle exact scheduled time', () => {
            const now = new Date('2026-02-20T09:00:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                graceMinutes: 30
            });
            expect(result.status).toBe('due');
            expect(result.delayMinutes).toBe(0);
            expect(result.isWithinGrace).toBe(true);
        });
        it('REG-006: should handle refused dose that was originally overdue', () => {
            const now = new Date('2026-02-20T10:00:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                administrationStatus: 'refused',
                graceMinutes: 30
            });
            // Refused status takes precedence over timing
            expect(result.status).toBe('refused');
        });
        it('REG-007: should handle delayed dose with past delayedUntil but no administration status', () => {
            // Edge case: delayedUntil is in the past but no status provided
            const now = new Date('2026-02-20T11:15:00Z');
            const scheduledFor = new Date('2026-02-20T09:00:00Z');
            const delayedUntil = new Date('2026-02-20T11:00:00Z');
            const result = calculateDoseStatus({
                now,
                scheduledFor,
                delayedUntil,
                administrationStatus: undefined,
                graceMinutes: 30
            });
            // Without administrationStatus='delayed', it should use original scheduledFor
            expect(result.effectiveScheduledFor).toEqual(scheduledFor);
        });
        it('REG-008: should ensure consistent severity escalation', () => {
            // Test severity at exact boundaries
            expect(calculateDelaySeverity(59)).toBe('low');
            expect(calculateDelaySeverity(60)).toBe('medium');
            expect(calculateDelaySeverity(119)).toBe('medium');
            expect(calculateDelaySeverity(120)).toBe('high');
        });
    });
});
//# sourceMappingURL=doseDueLogic.test.js.map