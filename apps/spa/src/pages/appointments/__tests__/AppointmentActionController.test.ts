import { describe, expect, it, vi } from 'vitest';
import {
  createAppointmentActionController,
  type AppointmentActionControllerOptions,
  type AppointmentActionServices
} from '../appointmentActionController';
import type { AppointmentSummary, SchedulingCockpitAppointmentSummary } from '@/types/appointment';
import type { CheckInQueueRequest, QueueEntrySummary } from '@/types/scheduling';

const appointment: SchedulingCockpitAppointmentSummary = {
  id: 'appt-1',
  accountId: 'acc-1',
  patientId: 'pat-1',
  ownerId: 'owner-1',
  scheduledAt: '2026-04-12T09:00:00.000Z',
  endsAt: '2026-04-12T09:30:00.000Z',
  durationMinutes: 30,
  visitType: 'scheduled',
  reason: 'Consulta de rotina',
  status: 'scheduled',
  createdAt: '2026-04-12T08:00:00.000Z',
  updatedAt: '2026-04-12T08:00:00.000Z',
  conflicts: [],
  operational: {
    stage: 'scheduled',
    label: 'Agendado',
    source: 'appointment',
    updatedAt: '2026-04-12T08:00:00.000Z'
  }
};

function queueResult() {
  return {} as QueueEntrySummary;
}

interface HarnessOverrides {
  canManageScheduling?: AppointmentActionControllerOptions['canManageScheduling'];
  loadOverview?: AppointmentActionControllerOptions['loadOverview'];
  setError?: AppointmentActionControllerOptions['setError'];
  services?: Partial<AppointmentActionServices>;
}

function createHarness(overrides: HarnessOverrides = {}) {
  const checkInQueue = overrides.services?.checkInQueue ?? vi.fn(
    async (_payload: CheckInQueueRequest): Promise<QueueEntrySummary> => queueResult()
  );
  const noShowQueueEntry = overrides.services?.noShowQueueEntry ?? vi.fn(
    async (_queueEntryId: string): Promise<QueueEntrySummary> => queueResult()
  );
  const cancelAppointment = overrides.services?.cancelAppointment ?? vi.fn(
    async (_id: string, _reason?: string): Promise<AppointmentSummary> => ({} as AppointmentSummary)
  );
  const services: AppointmentActionServices = { checkInQueue, noShowQueueEntry, cancelAppointment };
  const loadOverview = overrides.loadOverview ?? vi.fn(async () => undefined);
  const setError = overrides.setError ?? vi.fn((_message: string) => undefined);
  const options: AppointmentActionControllerOptions = {
    canManageScheduling: overrides.canManageScheduling ?? (() => true),
    loadOverview,
    setError,
    services
  };

  return {
    controller: createAppointmentActionController(options),
    checkInQueue,
    noShowQueueEntry,
    cancelAppointment,
    loadOverview,
    setError
  };
}

describe('createAppointmentActionController', () => {
  it('fails closed when scheduling management is unavailable or status is not eligible', async () => {
    const denied = createHarness({ canManageScheduling: () => false });
    expect(denied.controller.canCheckIn(appointment)).toBe(false);
    expect(denied.controller.canCancel(appointment)).toBe(false);
    expect(denied.controller.canMarkNoShow(appointment)).toBe(false);
    await denied.controller.checkIn(appointment);
    expect(denied.checkInQueue).not.toHaveBeenCalled();

    const completed = createHarness();
    const ineligible = { ...appointment, status: 'completed' as const };
    expect(completed.controller.canCheckIn(ineligible)).toBe(false);
    expect(completed.controller.canCancel(ineligible)).toBe(false);
    expect(completed.controller.canMarkNoShow(ineligible)).toBe(false);
  });

  it('sends the check-in contract, refreshes, and clears the action state', async () => {
    const harness = createHarness();
    await harness.controller.checkIn(appointment);

    expect(harness.checkInQueue).toHaveBeenCalledWith({
      appointmentId: 'appt-1',
      patientId: 'pat-1',
      ownerId: 'owner-1',
      reason: 'Consulta de rotina',
      priority: 'medium'
    });
    expect(harness.loadOverview).toHaveBeenCalledTimes(1);
    expect(harness.controller.actionLoadingId.value).toBe('');
    expect(harness.controller.actionKind.value).toBe('');
  });

  it('chooses queue no-show for linked appointments and appointment cancel otherwise', async () => {
    const linked = createHarness();
    const queueAppointment = {
      ...appointment,
      operational: {
        ...appointment.operational,
        source: 'queue' as const,
        queueEntryId: 'queue-1',
        queueStatus: 'waiting' as const
      }
    };
    await linked.controller.markNoShow(queueAppointment);
    expect(linked.noShowQueueEntry).toHaveBeenCalledWith('queue-1');
    expect(linked.cancelAppointment).not.toHaveBeenCalled();

    const unlinked = createHarness();
    await unlinked.controller.markNoShow(appointment);
    expect(unlinked.cancelAppointment).toHaveBeenCalledWith(
      'appt-1',
      'No-show registrado pela agenda'
    );
    expect(unlinked.noShowQueueEntry).not.toHaveBeenCalled();
  });

  it('serializes competing actions and invalidates late failures', async () => {
    let resolveCheckIn!: (value: QueueEntrySummary) => void;
    let rejectCheckIn!: (reason: Error) => void;
    const pending = new Promise<QueueEntrySummary>((resolve, reject) => {
      resolveCheckIn = resolve;
      rejectCheckIn = reject;
    });
    const checkInQueue = vi.fn((_payload: CheckInQueueRequest) => pending);
    const harness = createHarness({ services: { checkInQueue } });

    const firstAction = harness.controller.checkIn(appointment);
    await Promise.resolve();
    expect(harness.controller.actionLoadingId.value).toBe('appt-1');
    expect(harness.controller.actionKind.value).toBe('checkin');

    await harness.controller.markNoShow(appointment);
    expect(harness.cancelAppointment).not.toHaveBeenCalled();
    expect(harness.noShowQueueEntry).not.toHaveBeenCalled();

    harness.controller.invalidate();
    rejectCheckIn(new Error('late failure'));
    await firstAction;
    expect(harness.setError).not.toHaveBeenCalledWith('late failure');
    expect(harness.loadOverview).not.toHaveBeenCalled();
    expect(harness.controller.actionLoadingId.value).toBe('');
    expect(harness.controller.actionKind.value).toBe('');

    resolveCheckIn(queueResult());
  });

  it('cancels an eligible appointment with the agenda reason', async () => {
    const harness = createHarness();
    await harness.controller.cancel(appointment);
    expect(harness.cancelAppointment).toHaveBeenCalledWith(
      'appt-1',
      'Cancelado pela agenda operacional'
    );
    expect(harness.loadOverview).toHaveBeenCalledTimes(1);
  });
});
