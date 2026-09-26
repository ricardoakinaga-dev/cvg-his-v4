/**
 * Durable appointment reminders run as clinical workflow tasks executed by the
 * worker (lease, bounded retry, DLQ). The API owns scheduling; the worker owns
 * delivery and re-validates the appointment right before sending.
 */
export const APPOINTMENT_REMINDER_TASK_TYPE = 'appointment_reminder.whatsapp';

/** Default lead time between the reminder and the appointment. */
export const APPOINTMENT_REMINDER_LEAD_MS = 24 * 60 * 60 * 1000;

/** Below this distance to the appointment a reminder is no longer useful. */
export const APPOINTMENT_REMINDER_MIN_NOTICE_MS = 60 * 60 * 1000;

export function appointmentReminderIdempotencyKey(appointmentId: string): string {
  return `appointment-reminder:${appointmentId}`;
}

/**
 * When the reminder is due, or null when the appointment is too close (or in
 * the past) for a reminder to make sense. Appointments booked inside the lead
 * window are reminded right away.
 */
export function computeAppointmentReminderDueAt(
  scheduledAt: string,
  now: Date = new Date(),
  leadMs: number = APPOINTMENT_REMINDER_LEAD_MS
): string | null {
  const appointmentMs = new Date(scheduledAt).getTime();
  if (!Number.isFinite(appointmentMs)) return null;
  if (appointmentMs - now.getTime() < APPOINTMENT_REMINDER_MIN_NOTICE_MS) return null;
  return new Date(Math.max(appointmentMs - leadMs, now.getTime())).toISOString();
}
