import { ref, type Ref } from 'vue';
import type {
  AppointmentSummary,
  SchedulingCockpitAppointmentSummary
} from '@/types/appointment';
import type { CheckInQueueRequest, QueueEntrySummary } from '@/types/scheduling';

export type AppointmentActionKind = 'cancel' | 'checkin' | 'noshow' | '';

export interface AppointmentActionServices {
  checkInQueue: (payload: CheckInQueueRequest) => Promise<QueueEntrySummary>;
  noShowQueueEntry: (queueEntryId: string) => Promise<QueueEntrySummary>;
  cancelAppointment: (id: string, reason?: string) => Promise<AppointmentSummary>;
}

export interface AppointmentActionControllerOptions {
  canManageScheduling: () => boolean;
  loadOverview: () => Promise<void>;
  setError: (message: string) => void;
  services: AppointmentActionServices;
}

export interface AppointmentActionController {
  readonly actionLoadingId: Ref<string>;
  readonly actionKind: Ref<AppointmentActionKind>;
  canCheckIn: (item: SchedulingCockpitAppointmentSummary) => boolean;
  canCancel: (item: SchedulingCockpitAppointmentSummary) => boolean;
  canMarkNoShow: (item: SchedulingCockpitAppointmentSummary) => boolean;
  checkIn: (item: SchedulingCockpitAppointmentSummary) => Promise<void>;
  markNoShow: (item: SchedulingCockpitAppointmentSummary) => Promise<void>;
  cancel: (item: SchedulingCockpitAppointmentSummary) => Promise<void>;
  invalidate: () => void;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function createAppointmentActionController(
  options: AppointmentActionControllerOptions
): AppointmentActionController {
  const actionLoadingId = ref('');
  const actionKind = ref<AppointmentActionKind>('');
  let actionGeneration = 0;

  function canCheckIn(item: SchedulingCockpitAppointmentSummary) {
    return (
      item.operational.stage === 'scheduled' &&
      item.status === 'scheduled' &&
      options.canManageScheduling()
    );
  }

  function canCancel(item: SchedulingCockpitAppointmentSummary) {
    return ['scheduled', 'checked_in'].includes(item.status) && options.canManageScheduling();
  }

  function canMarkNoShow(item: SchedulingCockpitAppointmentSummary) {
    return (
      item.operational.stage === 'scheduled' &&
      item.status === 'scheduled' &&
      options.canManageScheduling()
    );
  }

  function begin(
    item: SchedulingCockpitAppointmentSummary,
    kind: Exclude<AppointmentActionKind, ''>,
    allowed: (candidate: SchedulingCockpitAppointmentSummary) => boolean
  ): number | null {
    if (actionLoadingId.value || !allowed(item)) return null;

    const generation = ++actionGeneration;
    actionLoadingId.value = item.id;
    actionKind.value = kind;
    options.setError('');
    return generation;
  }

  function isCurrent(generation: number) {
    return generation === actionGeneration;
  }

  function finish(generation: number) {
    if (!isCurrent(generation)) return;
    actionLoadingId.value = '';
    actionKind.value = '';
  }

  async function execute(
    item: SchedulingCockpitAppointmentSummary,
    kind: Exclude<AppointmentActionKind, ''>,
    allowed: (candidate: SchedulingCockpitAppointmentSummary) => boolean,
    operation: () => Promise<unknown>,
    fallback: string
  ) {
    const generation = begin(item, kind, allowed);
    if (generation === null) return;

    try {
      await operation();
      if (isCurrent(generation)) await options.loadOverview();
    } catch (error) {
      if (isCurrent(generation)) options.setError(errorMessage(error, fallback));
    } finally {
      finish(generation);
    }
  }

  async function checkIn(item: SchedulingCockpitAppointmentSummary) {
    await execute(
      item,
      'checkin',
      canCheckIn,
      () => options.services.checkInQueue({
        appointmentId: item.id,
        patientId: item.patientId,
        ownerId: item.ownerId,
        reason: item.reason,
        priority: 'medium'
      }),
      'Erro ao realizar check-in'
    );
  }

  async function markNoShow(item: SchedulingCockpitAppointmentSummary) {
    await execute(
      item,
      'noshow',
      canMarkNoShow,
      () => item.operational.queueEntryId
        ? options.services.noShowQueueEntry(item.operational.queueEntryId)
        : options.services.cancelAppointment(item.id, 'No-show registrado pela agenda'),
      'Erro ao registrar no-show'
    );
  }

  async function cancel(item: SchedulingCockpitAppointmentSummary) {
    await execute(
      item,
      'cancel',
      canCancel,
      () => options.services.cancelAppointment(item.id, 'Cancelado pela agenda operacional'),
      'Erro ao cancelar agendamento'
    );
  }

  function invalidate() {
    actionGeneration += 1;
    actionLoadingId.value = '';
    actionKind.value = '';
  }

  return {
    actionLoadingId,
    actionKind,
    canCheckIn,
    canCancel,
    canMarkNoShow,
    checkIn,
    markNoShow,
    cancel,
    invalidate
  };
}
