// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildMonthCalendar, buildVisibleDays, startOfMonth } from '../appointmentCalendar';

const originalTimezone = process.env.TZ;

for (const [timezone, januaryOffset] of [
  ['UTC', 0],
  ['America/Sao_Paulo', 180],
  ['Asia/Tokyo', -540],
  ['America/New_York', 300]
] as const) {
  describe(`civil calendar in ${timezone}`, () => {
    beforeEach(() => {
      process.env.TZ = timezone;
      expect(new Date('2026-01-15T12:00:00').getTimezoneOffset()).toBe(januaryOffset);
    });

    afterEach(() => {
      vi.useRealTimers();
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    });

    it('keeps date identifiers aligned with the rendered weekday', () => {
      expect(startOfMonth('2026-09-05')).toBe('2026-09-01');
      expect(buildVisibleDays('week', '2026-09-05')[0]).toEqual({
        date: '2026-09-05', label: 'sábado, 05/09'
      });
      expect(buildVisibleDays('day', '2026-09-05')).toHaveLength(1);
    });

    it('crosses leap-day and year boundaries without losing civil dates', () => {
      expect(buildVisibleDays('week', '2024-02-27').map((day) => day.date)).toEqual([
        '2024-02-27', '2024-02-28', '2024-02-29', '2024-03-01',
        '2024-03-02', '2024-03-03', '2024-03-04'
      ]);
      expect(buildVisibleDays('week', '2026-12-29').map((day) => day.date)).toEqual([
        '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01',
        '2027-01-02', '2027-01-03', '2027-01-04'
      ]);
      const february = buildMonthCalendar('2024-02-15');
      expect(february).toHaveLength(42);
      expect(february[0].date).toBe('2024-01-28');
      expect(february.at(-1)?.date).toBe('2024-03-09');
      expect(february.filter((day) => day.inCurrentMonth)).toHaveLength(29);
      expect(february.find((day) => day.date === '2024-02-29')?.dayNumber).toBe(29);
      expect(buildVisibleDays('month', '2026-12-29')[0]).toEqual({
        date: '2026-12-01', label: '01/12'
      });
    });

    it.each(['2026-03-08', '2026-11-01'])('keeps consecutive dates through DST at %s', (date) => {
      const days = buildVisibleDays('week', date);
      expect(days.map((day) => day.date)).toEqual(
        date === '2026-03-08'
          ? ['2026-03-08', '2026-03-09', '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14']
          : ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07']
      );
    });

    it.each(['2026-09-05T00:30:00', '2026-09-05T23:30:00'])(
      'marks the local current day at %s', (localNow) => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(localNow));
        expect(buildMonthCalendar('2026-09-05').filter((day) => day.isToday).map((day) => day.date))
          .toEqual(['2026-09-05']);
      }
    );
  });
}
