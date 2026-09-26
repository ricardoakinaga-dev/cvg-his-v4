import {
  APPOINTMENT_REMINDER_TASK_TYPE,
  appointmentReminderIdempotencyKey,
  computeAppointmentReminderDueAt
} from '@cvg-his-v2/module-notifications-whatsapp';
import type { WorkflowTaskService, WorkflowTaskSummary } from '@cvg-his-v2/module-workflows';
import type { SchedulingAppointmentSummary, UserId } from '@cvg-his-v2/shared-types';

type ReminderTasks = Pick<
  WorkflowTaskService,
  'create' | 'findByIdempotencyKey' | 'reschedule' | 'cancel'
>;

export type ReminderScheduleOutcome =
  | { readonly outcome: 'scheduled' | 'rescheduled'; readonly taskId: string; readonly dueAt: string }
  | { readonly outcome: 'cancelled'; readonly taskId: string }
  | { readonly outcome: 'skipped'; readonly reason: 'too_close' | 'not_found' | 'not_pending' };

const OPEN_STATUSES: ReadonlySet<WorkflowTaskSummary['status']> = new Set([
  'pending',
  'retrying',
  'acknowledged'
]);

/**
 * Keeps one durable reminder task per appointment in sync with the
 * appointment lifecycle. Delivery happens in the worker, which re-checks the
 * appointment before sending; this class only decides when it is due.
 */
export class AppointmentReminderScheduler {
  readonly #tasks: ReminderTasks;
  readonly #now: () => Date;

  public constructor(tasks: ReminderTasks, now: () => Date = () => new Date()) {
    this.#tasks = tasks;
    this.#now = now;
  }

  public async schedule(
    appointment: SchedulingAppointmentSummary,
    actorUserId: UserId
  ): Promise<ReminderScheduleOutcome> {
    const dueAt = computeAppointmentReminderDueAt(appointment.scheduledAt, this.#now());
    const key = appointmentReminderIdempotencyKey(appointment.id);
    const existing = await this.#tasks.findByIdempotencyKey(appointment.accountId, key);
    if (!dueAt) {
      if (existing && OPEN_STATUSES.has(existing.status)) {
        await this.#tasks.cancel(appointment.accountId, actorUserId, existing.id, 'appointment_too_close');
        return { outcome: 'cancelled', taskId: existing.id };
      }
      return { outcome: 'skipped', reason: 'too_close' };
    }
    if (existing) {
      if (existing.status === 'completed' || existing.status === 'processing' || existing.status === 'dlq') {
        return { outcome: 'skipped', reason: 'not_pending' };
      }
      await this.#tasks.reschedule(
        appointment.accountId,
        actorUserId,
        existing.id,
        dueAt,
        `appointment_scheduled_at=${appointment.scheduledAt}`
      );
      return { outcome: 'rescheduled', taskId: existing.id, dueAt };
    }
    const task = await this.#tasks.create(appointment.accountId, actorUserId, {
      taskType: APPOINTMENT_REMINDER_TASK_TYPE,
      executionMode: 'worker',
      title: 'Lembrete de consulta por WhatsApp',
      patientId: appointment.patientId,
      ownerType: 'system',
      dueAt,
      idempotencyKey: key,
      maxAttempts: 5,
      metadata: { appointmentId: appointment.id, tutorId: appointment.ownerId }
    });
    return { outcome: 'scheduled', taskId: task.id, dueAt };
  }

  public async cancel(
    appointment: SchedulingAppointmentSummary,
    actorUserId: UserId,
    reason: string
  ): Promise<ReminderScheduleOutcome> {
    const existing = await this.#tasks.findByIdempotencyKey(
      appointment.accountId,
      appointmentReminderIdempotencyKey(appointment.id)
    );
    if (!existing) return { outcome: 'skipped', reason: 'not_found' };
    if (!OPEN_STATUSES.has(existing.status)) return { outcome: 'skipped', reason: 'not_pending' };
    await this.#tasks.cancel(appointment.accountId, actorUserId, existing.id, reason);
    return { outcome: 'cancelled', taskId: existing.id };
  }
}
