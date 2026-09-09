import type { InjectionKey } from 'vue';
import type { LocationQuery, LocationQueryRaw } from 'vue-router';
import type { AppointmentStatus } from '@/types/appointment';

export type AgendaView = 'list' | 'day' | 'week' | 'month';
export interface AgendaContext {
  date: string;
  view: AgendaView;
  statuses: AppointmentStatus[];
  practitionerStaffId: string;
  serviceId: string;
  unit: string;
  specialty: string;
  marker: string;
  search: string;
  clientSearch: string;
}

export function localCalendarDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function emptyAgendaContext(): AgendaContext {
  return { date: localCalendarDate(), view: 'list', statuses: [], practitionerStaffId: '', serviceId: '', unit: '', specialty: '', marker: '', search: '', clientSearch: '' };
}

function scalar(value: LocationQuery[string]): string {
  return typeof value === 'string' && value.length <= 200 ? value.trim() : '';
}
function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
const statuses: AppointmentStatus[] = ['scheduled', 'checked_in', 'completed', 'cancelled'];
const keys = ['agendaDate', 'agendaView', 'agendaStatus', 'agendaProfessional', 'agendaService', 'agendaUnit', 'agendaSpecialty', 'agendaMarker'] as const;
const agendaPaths = new Set([
  '/appointments',
  '/agenda',
  '/agendamentos',
  '/atendimento/agenda',
  '/atendimento/atendimentos/agenda'
]);

export function isAgendaPath(path: string): boolean {
  return agendaPaths.has(path);
}

/** Structural filters may be shared. Free text stays in the workspace, not URL/history. */
export function readAgendaContext(query: LocationQuery, previous = emptyAgendaContext()): AgendaContext {
  const hasContext = keys.some(key => key in query);
  if (!hasContext) return { ...previous, statuses: [...previous.statuses] };
  const date = scalar(query.agendaDate);
  const view = scalar(query.agendaView);
  return {
    ...previous,
    date: validDate(date) ? date : localCalendarDate(),
    view: ['list', 'day', 'week', 'month'].includes(view) ? view as AgendaView : 'list',
    statuses: [...new Set(scalar(query.agendaStatus).split(',').filter((value): value is AppointmentStatus => statuses.includes(value as AppointmentStatus)))],
    practitionerStaffId: scalar(query.agendaProfessional), serviceId: scalar(query.agendaService),
    unit: scalar(query.agendaUnit), specialty: scalar(query.agendaSpecialty), marker: scalar(query.agendaMarker)
  };
}

export function writeAgendaQuery(query: LocationQuery, state: AgendaContext): LocationQueryRaw {
  const result: LocationQueryRaw = { ...query };
  for (const key of keys) delete result[key];
  delete result.search;
  delete result.clientSearch;
  result.agendaDate = state.date;
  result.agendaView = state.view;
  const fields = { agendaStatus: [...new Set(state.statuses)].sort().join(','), agendaProfessional: state.practitionerStaffId, agendaService: state.serviceId, agendaUnit: state.unit, agendaSpecialty: state.specialty, agendaMarker: state.marker };
  for (const [key, value] of Object.entries(fields)) if (value) result[key] = value;
  return result;
}

export interface AgendaContextMemory { current: AgendaContext | null }
/** Provided by the authenticated workspace; released when it unmounts. */
export const agendaContextKey: InjectionKey<AgendaContextMemory> = Symbol('agenda-context');
