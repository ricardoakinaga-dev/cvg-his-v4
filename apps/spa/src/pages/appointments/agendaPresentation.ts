import type {
  AppointmentStatus,
  SchedulingCockpitAppointmentSummary,
  SchedulingOperationalBlockSummary
} from '@/types/appointment';

export const timelineHours = Array.from({ length: 23 }, (_, index) => index);
const maxVisibleAppointmentsPerSlot = 2;
const activeQueueStages = ['checked_in', 'called', 'in_triage', 'in_care', 'observation'] as const;

export function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function statusLabel(status: AppointmentStatus) {
  return {
    scheduled: 'Aberto',
    checked_in: 'Confirmado',
    completed: 'Executado',
    cancelled: 'Cancelado'
  }[status];
}

export function operationalLabel(item: SchedulingCockpitAppointmentSummary) {
  return item.operational.label;
}

export function appointmentTypeLabel(item: SchedulingCockpitAppointmentSummary) {
  if (item.serviceName) return item.serviceName;
  if (item.specialty) return item.specialty;
  if (item.resourceLabel) return item.resourceLabel;
  if (item.visitType === 'return') return 'Retorno';
  if (item.visitType === 'walk_in') return 'Encaixe';
  return item.reason || 'Consulta';
}

export function appointmentSectorLabel(item: SchedulingCockpitAppointmentSummary) {
  return item.unit || item.specialty || item.resourceLabel || 'Recepção';
}

export function appointmentResponsibleLabel(item: SchedulingCockpitAppointmentSummary) {
  if (item.practitionerName) return item.practitionerName;
  if (item.unit) return `Setor ${item.unit}`;
  if (item.specialty) return `Especialidade ${item.specialty}`;
  return 'Sem profissional definido';
}

export function isQueueLinked(item: SchedulingCockpitAppointmentSummary) {
  return item.operational.source === 'queue' || Boolean(item.operational.queueEntryId);
}

export function isActiveQueueStage(stage: SchedulingCockpitAppointmentSummary['operational']['stage']) {
  return activeQueueStages.includes(stage as (typeof activeQueueStages)[number]);
}

export function isPastScheduled(item: SchedulingCockpitAppointmentSummary) {
  return (
    item.operational.stage === 'scheduled' &&
    item.status === 'scheduled' &&
    new Date(item.scheduledAt).getTime() < Date.now()
  );
}

export function queueBridgeLabel(item: SchedulingCockpitAppointmentSummary) {
  if (item.status === 'cancelled' || item.operational.stage === 'cancelled')
    return 'Fora da Esteira';
  if (isQueueLinked(item)) return 'Na Esteira';
  if (!item.practitionerStaffId) return 'Pendência antes do check-in';
  if (isPastScheduled(item)) return 'Chegada pendente';
  if (item.status === 'scheduled') return 'Aguardando check-in';
  return 'Sem vínculo com Esteira';
}

export function appointmentNeedsAttention(item: SchedulingCockpitAppointmentSummary) {
  if (item.status === 'cancelled' || item.operational.stage === 'completed') return false;
  return item.conflicts.length > 0 || !item.practitionerStaffId || isPastScheduled(item);
}

export function nextStepForAppointment(item: SchedulingCockpitAppointmentSummary) {
  if (item.status === 'cancelled' || item.operational.stage === 'cancelled') {
    return 'Validar reagendamento';
  }

  if (item.operational.stage === 'completed') {
    return 'Conferir fechamento';
  }

  if (item.operational.encounterId) {
    return 'Acompanhar atendimento';
  }

  if (isQueueLinked(item)) {
    return 'Acompanhar na Esteira';
  }

  if (!item.practitionerStaffId) {
    return 'Definir profissional/setor';
  }

  if (isPastScheduled(item)) {
    return 'Confirmar chegada ou no-show';
  }

  if (item.status === 'scheduled') {
    return 'Realizar check-in no horário';
  }

  return 'Manter acompanhamento';
}

export function deriveMarkers(item: SchedulingCockpitAppointmentSummary) {
  const haystack = normalizeText(
    `${item.reason} ${item.serviceName ?? ''} ${item.specialty ?? ''} ${item.resourceLabel ?? ''}`
  );
  const markers: string[] = [];

  if (item.visitType === 'return') markers.push('Retorno');
  if (haystack.includes('vacin')) markers.push('Vacina');
  if (haystack.includes('verm')) markers.push('Vermífugo');
  if (item.conflicts.length > 0) markers.push('Ajuste operacional');
  if (!item.practitionerStaffId) markers.push('Sem profissional');

  return markers;
}

export interface AgendaProfessionalColumn {
  id: string;
  label: string;
}

export interface AgendaGridSource {
  filteredItems: () => readonly SchedulingCockpitAppointmentSummary[];
  blocks: () => readonly SchedulingOperationalBlockSummary[];
  professionalColumns: () => readonly AgendaProfessionalColumn[];
}

/**
 * Keeps calendar slot derivation outside the page shell. The source getters
 * make the boundary explicit and preserve reactive data without duplicating
 * state or moving service calls into a presentation helper.
 */
export function createAgendaGridHelpers(source: AgendaGridSource) {
  function appointmentsByDay(date: string) {
    return source.filteredItems().filter((item) => item.scheduledAt.slice(0, 10) === date);
  }

  function columnIdForAppointment(item: SchedulingCockpitAppointmentSummary) {
    return item.practitionerStaffId || 'unassigned';
  }

  function occupiedSlotKeysByDay(date: string) {
    const keys = new Set<string>();

    appointmentsByDay(date).forEach((item) => {
      keys.add(`${columnIdForAppointment(item)}-${new Date(item.scheduledAt).getHours()}`);
    });

    source
      .blocks()
      .filter((block) => block.startsAt.slice(0, 10) === date && block.practitionerStaffId)
      .forEach((block) => {
        keys.add(`${block.practitionerStaffId}-${new Date(block.startsAt).getHours()}`);
      });

    return keys;
  }

  function availableSlotsByDay(date: string) {
    const totalSlots = source.professionalColumns().length * timelineHours.length;
    return Math.max(totalSlots - occupiedSlotKeysByDay(date).size, 0);
  }

  function dayGridSummary(date: string) {
    const appointments = appointmentsByDay(date).length;
    const available = availableSlotsByDay(date);
    return `${appointments} agendados · ${available} horários disponíveis`;
  }

  function appointmentsByColumn(date: string, columnId: string) {
    return appointmentsByDay(date)
      .filter((item) => {
        if (columnId === 'unassigned') return !item.practitionerStaffId;
        return item.practitionerStaffId === columnId;
      })
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  }

  function appointmentsBySlot(date: string, columnId: string, hour: number) {
    return appointmentsByColumn(date, columnId).filter(
      (item) => new Date(item.scheduledAt).getHours() === hour
    );
  }

  function visibleAppointmentsBySlot(date: string, columnId: string, hour: number) {
    return appointmentsBySlot(date, columnId, hour).slice(0, maxVisibleAppointmentsPerSlot);
  }

  function hiddenSlotCount(date: string, columnId: string, hour: number) {
    return Math.max(
      appointmentsBySlot(date, columnId, hour).length - maxVisibleAppointmentsPerSlot,
      0
    );
  }

  function isDenseSlot(date: string, columnId: string, hour: number) {
    return appointmentsBySlot(date, columnId, hour).length > maxVisibleAppointmentsPerSlot;
  }

  function blocksByColumn(date: string, columnId: string) {
    return source.blocks().filter((block) => {
      if (block.startsAt.slice(0, 10) !== date) return false;
      if (columnId === 'unassigned') return false;
      return block.practitionerStaffId === columnId;
    });
  }

  function blocksBySlot(date: string, columnId: string, hour: number) {
    return blocksByColumn(date, columnId).filter(
      (block) => new Date(block.startsAt).getHours() === hour
    );
  }

  function weekBlocksBySlot(date: string, hour: number) {
    return source.blocks().filter(
      (block) => block.startsAt.slice(0, 10) === date && new Date(block.startsAt).getHours() === hour
    );
  }

  function appointmentsByWeekSlot(date: string, hour: number) {
    return appointmentsByDay(date)
      .filter((item) => new Date(item.scheduledAt).getHours() === hour)
      .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
  }

  function occupiedProfessionalIdsByWeekSlot(date: string, hour: number) {
    const ids = new Set<string>();

    appointmentsByWeekSlot(date, hour).forEach((item) => {
      ids.add(columnIdForAppointment(item));
    });

    weekBlocksBySlot(date, hour).forEach((block) => {
      if (block.practitionerStaffId) ids.add(block.practitionerStaffId);
    });

    return ids;
  }

  function hasAvailableWeekSlot(date: string, hour: number) {
    return occupiedProfessionalIdsByWeekSlot(date, hour).size < source.professionalColumns().length;
  }

  function firstAvailablePractitionerForWeekSlot(date: string, hour: number) {
    const occupied = occupiedProfessionalIdsByWeekSlot(date, hour);
    return source.professionalColumns().find((column) => !occupied.has(column.id))?.id ?? 'unassigned';
  }

  function visibleAppointmentsByWeekSlot(date: string, hour: number) {
    return appointmentsByWeekSlot(date, hour).slice(0, maxVisibleAppointmentsPerSlot);
  }

  function hiddenWeekSlotCount(date: string, hour: number) {
    return Math.max(appointmentsByWeekSlot(date, hour).length - maxVisibleAppointmentsPerSlot, 0);
  }

  function isDenseWeekSlot(date: string, hour: number) {
    return appointmentsByWeekSlot(date, hour).length > maxVisibleAppointmentsPerSlot;
  }

  return {
    appointmentsByDay,
    availableSlotsByDay,
    dayGridSummary,
    appointmentsByColumn,
    appointmentsBySlot,
    visibleAppointmentsBySlot,
    hiddenSlotCount,
    isDenseSlot,
    blocksByColumn,
    blocksBySlot,
    weekBlocksBySlot,
    appointmentsByWeekSlot,
    hasAvailableWeekSlot,
    firstAvailablePractitionerForWeekSlot,
    visibleAppointmentsByWeekSlot,
    hiddenWeekSlotCount,
    isDenseWeekSlot
  };
}
