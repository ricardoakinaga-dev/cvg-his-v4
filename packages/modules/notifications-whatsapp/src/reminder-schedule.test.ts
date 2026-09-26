import { describe, expect, it } from 'vitest';

import {
  APPOINTMENT_REMINDER_LEAD_MS,
  computeAppointmentReminderDueAt
} from './reminder-schedule.js';

const NOW = new Date('2026-10-01T12:00:00.000Z');

describe('computeAppointmentReminderDueAt', () => {
  it('schedules the reminder one lead time before the appointment', () => {
    expect(computeAppointmentReminderDueAt('2026-10-05T12:00:00.000Z', NOW)).toBe(
      new Date(Date.parse('2026-10-05T12:00:00.000Z') - APPOINTMENT_REMINDER_LEAD_MS).toISOString()
    );
  });

  it('reminds right away when the appointment is booked inside the lead window', () => {
    expect(computeAppointmentReminderDueAt('2026-10-01T20:00:00.000Z', NOW)).toBe(NOW.toISOString());
  });

  it('skips appointments that are too close, past or invalid', () => {
    expect(computeAppointmentReminderDueAt('2026-10-01T12:30:00.000Z', NOW)).toBeNull();
    expect(computeAppointmentReminderDueAt('2026-09-30T12:00:00.000Z', NOW)).toBeNull();
    expect(computeAppointmentReminderDueAt('not-a-date', NOW)).toBeNull();
  });
});
