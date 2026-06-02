/**
 * Scheduling / Queue — Domain Types (Equipe B — Sprint 1)
 *
 * Fonte de verdade: packages/shared/types/src/index.ts (QueueEntrySummary)
 * + auditoria da state machine em packages/modules/scheduling/src/index.ts
 *
 * Nota: AppointmentSummary, AppointmentStatus, CreateAppointmentRequest
 * já existem em @/types/appointment.ts e não devem ser duplicados aqui.
 * Este arquivo cobre exclusivamente o domínio da Queue Operacional.
 */

/**
 * Estados válidos da fila operacional.
 * Alinhado com packages/shared/types/src/index.ts:QueueEntrySummary.status
 * e a state machine QUEUE_TRANSITIONS no módulo de scheduling.
 *
 * Transições válidas:
 *   waiting     → called, cancelled
 *   called      → in_triage, cancelled
 *   in_triage   → in_care, observation, cancelled
 *   in_care     → observation, completed, cancelled
 *   observation → in_care, completed, cancelled
 *   completed   → (terminal)
 *   cancelled   → (terminal)
 *
 * Nota: não existe status 'no_show' na state machine.
 * No-show é implementado como transição para 'cancelled' via POST /queue/:id/no-show.
 */
export type QueueStatus =
  | 'waiting'
  | 'called'
  | 'in_triage'
  | 'in_care'
  | 'observation'
  | 'completed'
  | 'cancelled';

/**
 * Níveis de prioridade suportados pela fila.
 * Usado tanto no check-in quanto na ordenação operacional.
 */
export type QueuePriority = 'low' | 'medium' | 'high' | 'critical';

export type QueueEntryType =
  | 'standard'
  | 'emergency'
  | 'return'
  | 'quote'
  | 'counter_sale'
  | 'service_sale'
  | 'exam';

/**
 * Representa uma entrada na fila operacional.
 * Espelha o contrato QueueEntrySummary do shared types.
 */
export interface QueueEntrySummary {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  appointmentId: string | null;
  encounterId: string | null;
  entryType?: QueueEntryType;
  status: QueueStatus;
  priority: QueuePriority;
  reason: string;
  checkedInAt: string;
  calledAt: string | null;
  currentSector?: string | null;
  currentResponsibleUserId?: string | null;
  currentResponsibleStaffId?: string | null;
  nextSector?: string | null;
  operationalStatus?:
    | 'waiting'
    | 'called'
    | 'in_triage'
    | 'in_care'
    | 'observation'
    | 'waiting_handoff'
    | 'sent_to_finance'
    | 'completed'
    | 'cancelled'
    | null;
  clinicalStatus?: 'not_started' | 'in_progress' | 'pending' | 'completed' | null;
  billingStatus?:
    | 'not_started'
    | 'pending_origin'
    | 'ready_for_finance'
    | 'in_billing'
    | 'closed'
    | null;
  handoffStatus?:
    | 'not_started'
    | 'sent_to_reception'
    | 'acknowledged_by_reception'
    | 'waiting_pending_resolution'
    | 'returned_to_clinic'
    | 'sent_to_finance'
    | null;
  lastTransferredAt?: string | null;
  lastTransferredByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payload para realizar check-in de um paciente na fila.
 * Espelha o contrato CheckInQueueRequest do shared contracts.
 *
 * appointmentId é opcional — check-in pode vir de walk-in sem agendamento prévio.
 * priority é opcional — padrão definido pelo backend.
 */
export interface CheckInQueueRequest {
  patientId: string;
  ownerId: string;
  appointmentId?: string;
  reason: string;
  priority?: QueuePriority;
  entryType?: QueueEntryType;
  currentSector?: string;
  currentResponsibleUserId?: string;
  currentResponsibleStaffId?: string;
  nextSector?: string;
}

export interface TransferQueueEntryRequest {
  toSector: string;
  sentByUserId?: string;
  receivedByUserId?: string;
  responsibleUserId?: string;
  responsibleStaffId?: string;
  nextSector?: string;
  reason: string;
  urgency?: QueuePriority;
  billingRecordId?: string;
  counterSaleId?: string;
}

/**
 * Resposta paginada da lista de entradas na fila.
 */
export interface QueueListResponse {
  items: QueueEntrySummary[];
}

/**
 * Labels de status da queue para exibição na UI.
 * Exportado como const map para evitar duplicação em componentes.
 */
export const QUEUE_STATUS_LABELS: Record<QueueStatus, string> = {
  waiting: 'Aguardando',
  called: 'Chamado',
  in_triage: 'Em Triagem',
  in_care: 'Em Atendimento',
  observation: 'Observação',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

/**
 * Labels de prioridade para exibição na UI.
 */
export const QUEUE_PRIORITY_LABELS: Record<QueuePriority, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa'
};
