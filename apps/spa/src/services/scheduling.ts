/**
 * Scheduling / Queue — Service Layer (Equipe B — Sprint 1)
 *
 * Endpoints mapeados conforme auditoria em apps/api/src/server.ts:
 *   GET    /appointments              → já coberto por appointmentService.list()
 *   POST   /appointments              → já coberto por appointmentService.create()
 *   POST   /appointments/:id/cancel   → já coberto por appointmentService.cancel()
 *   GET    /queue                     → listQueue()
 *   POST   /queue/check-in            → checkInQueue()
 *   POST   /queue/:id/call            → callQueueEntry()
 *   POST   /queue/:id/transfer        → transferQueueEntry()
 *   POST   /queue/:id/start-care      → startCareQueueEntry()  [Sprint 1 — backend fino]
 *   POST   /queue/:id/complete        → completeQueueEntry()
 *   POST   /queue/:id/no-show         → noShowQueueEntry()     [Sprint 1 — backend fino]
 *
 * Nota: Operações de appointment já existem em @/services/appointment.ts.
 * Este módulo cobre exclusivamente as operações da fila operacional.
 */

import { apiRequest } from './api';
import type {
  SchedulingOverviewResponse
} from '@/types/appointment';
import type {
  QueueEntrySummary,
  QueueListResponse,
  CheckInQueueRequest,
  TransferQueueEntryRequest
} from '@/types/scheduling';

export interface SchedulingOverviewParams {
  viewMode?: 'day' | 'week' | 'month';
  referenceDate?: string;
  statuses?: string[];
  practitionerStaffId?: string;
  serviceId?: string;
  specialty?: string;
  unit?: string;
  search?: string;
}

export async function getSchedulingOverview(
  params: SchedulingOverviewParams = {}
): Promise<SchedulingOverviewResponse> {
  const search = new URLSearchParams();

  if (params.viewMode) search.set('viewMode', params.viewMode);
  if (params.referenceDate) search.set('referenceDate', params.referenceDate);
  if (params.statuses?.length) search.set('statuses', params.statuses.join(','));
  if (params.practitionerStaffId) search.set('practitionerStaffId', params.practitionerStaffId);
  if (params.serviceId) search.set('serviceId', params.serviceId);
  if (params.specialty) search.set('specialty', params.specialty);
  if (params.unit) search.set('unit', params.unit);
  if (params.search) search.set('search', params.search);

  const suffix = search.toString() ? `?${search.toString()}` : '';
  return apiRequest<SchedulingOverviewResponse>(`/scheduling/overview${suffix}`);
}

/**
 * Lista todas as entradas da fila operacional da conta atual.
 * Retorna entries ordenadas pelo backend (prioridade + check-in mais antigo primeiro).
 */
export async function listQueue(): Promise<QueueEntrySummary[]> {
  const response = await apiRequest<QueueListResponse>('/queue');
  return response.items ?? [];
}

/**
 * Realiza check-in de um paciente na fila operacional.
 *
 * O backend valida:
 * - existência do patientId e ownerId
 * - conflito de janela de 30 minutos se appointmentId informado
 * - transição de estado válida da state machine
 *
 * @returns A queue entry criada com status 'waiting'.
 */
export async function checkInQueue(payload: CheckInQueueRequest): Promise<QueueEntrySummary> {
  return apiRequest<QueueEntrySummary>('/queue/check-in', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Chama uma entrada da fila (transição waiting → called).
 *
 * O backend valida:
 * - existência da entry
 * - status atual ser 'waiting'
 *
 * @returns A queue entry atualizada com status 'called' e calledAt preenchido.
 */
export async function callQueueEntry(queueEntryId: string): Promise<QueueEntrySummary> {
  return apiRequest<QueueEntrySummary>(`/queue/${queueEntryId}/call`, {
    method: 'POST'
  });
}

/**
 * Encaminha uma entrada da esteira para outro setor/responsável com histórico auditável.
 */
export async function transferQueueEntry(
  queueEntryId: string,
  payload: TransferQueueEntryRequest
): Promise<QueueEntrySummary> {
  return apiRequest<QueueEntrySummary>(`/queue/${queueEntryId}/transfer`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

/**
 * Transiciona uma entrada da fila para 'in_care' (em atendimento).
 *
 * O backend valida:
 * - existência da entry
 * - status atual permitir transição para 'in_care'
 *   (válido a partir de: in_triage)
 *
 * @returns A queue entry atualizada com status 'in_care'.
 */
export async function startCareQueueEntry(queueEntryId: string): Promise<QueueEntrySummary> {
  return apiRequest<QueueEntrySummary>(`/queue/${queueEntryId}/start-care`, {
    method: 'POST'
  });
}

/**
 * Conclui uma entrada da fila operacional.
 *
 * O backend valida:
 * - existência da entry
 * - status atual permitir transição para 'completed'
 *   (válido a partir de: in_care, observation)
 *
 * @returns A queue entry atualizada com status 'completed'.
 */
export async function completeQueueEntry(queueEntryId: string): Promise<QueueEntrySummary> {
  return apiRequest<QueueEntrySummary>(`/queue/${queueEntryId}/complete`, {
    method: 'POST'
  });
}

/**
 * Marca uma entrada da fila como no-show (não compareceu).
 *
 * Internamente o backend transiciona para 'cancelled' com auditoria de no-show.
 *
 * O backend valida:
 * - existência da entry
 * - status atual permitir cancelamento
 *   (válido a partir de: waiting, called, in_triage, in_care, observation)
 *
 * @returns A queue entry atualizada com status 'cancelled'.
 */
export async function noShowQueueEntry(queueEntryId: string): Promise<QueueEntrySummary> {
  return apiRequest<QueueEntrySummary>(`/queue/${queueEntryId}/no-show`, {
    method: 'POST'
  });
}
