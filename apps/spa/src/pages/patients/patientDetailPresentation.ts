import { preventiveItemTypeLabel, type PreventiveEventStatus, type PreventiveEventSummary } from '@/services/vaccinesDewormers';
import type {
  BillingItemType,
  BillingStatus
} from '@/types/billing';
import type { EncounterStatus } from '@/types/encounter';
import type { InpatientStatus } from '@/types/inpatient';
import type {
  ClinicalEntrySummary,
  ClinicalTimelineEventSummary,
  MedicalRecordStatus
} from '@/types/medicalRecords';
import type { PatientStatus } from '@/types/patient';
import type { TriagePriority } from '@/types/triage';
import type { DiagnosticOrderSummary } from '@cvg-his-v2/shared-types';

export function patientStatusVariant(status: PatientStatus): 'success' | 'warning' | 'danger' {
  if (status === 'active') return 'success';
  return status === 'deceased' ? 'danger' : 'warning';
}

export function encounterStatusVariant(status: EncounterStatus): 'info' | 'warning' | 'success' {
  if (status === 'closed') return 'success';
  return status === 'reception' || status === 'observation' ? 'warning' : 'info';
}

export function triagePriorityLabel(priority: TriagePriority): string {
  return {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  }[priority];
}

export function medicalRecordStatusLabel(status: MedicalRecordStatus): string {
  return status === 'open' ? 'Aberto' : 'Concluído';
}

export function billingStatusLabel(status: BillingStatus): string {
  return {
    draft: 'Rascunho',
    estimated: 'Estimado',
    open: 'Aberto',
    settled: 'Liquidado'
  }[status];
}

export function billingItemTypeLabel(type: BillingItemType): string {
  return {
    service: 'Serviço',
    supply: 'Material',
    procedure: 'Procedimento',
    exam: 'Exame',
    daily_rate: 'Diária',
    other: 'Outro'
  }[type];
}

export function preventiveStatusLabel(status: PreventiveEventStatus): string {
  return status === 'executed' ? 'Executada' : 'Agendada';
}

export function preventiveEventMeta(event: PreventiveEventSummary, fallbackOwnerName: string): string {
  return [
    preventiveItemTypeLabel(event.itemType),
    preventiveStatusLabel(event.status),
    event.clientName || fallbackOwnerName
  ].join(' · ');
}

export function inpatientStatusLabel(status: InpatientStatus): string {
  return {
    admitted: 'Admitido',
    stable: 'Estável',
    transferred: 'Transferido',
    discharged: 'Alta'
  }[status];
}

export function diagnosticStatusLabel(status: DiagnosticOrderSummary['status']): string {
  return {
    requested: 'Solicitado',
    collected: 'Coletado',
    resulted: 'Resultado',
    cancelled: 'Cancelado'
  }[status];
}

export function clinicalEntryTypeLabel(entryType: ClinicalEntrySummary['entryType']): string {
  return {
    anamnesis: 'Anamnese',
    physical_exam: 'Exame físico',
    progress_note: 'Evolução',
    assessment: 'Avaliação',
    plan: 'Plano',
    prescription: 'Prescrição',
    conduct: 'Conduta'
  }[entryType];
}

export function clinicalEventLabel(eventType: ClinicalTimelineEventSummary['eventType']): string {
  return {
    record_created: 'Prontuário criado',
    entry_added: 'Entrada adicionada',
    entry_updated: 'Entrada atualizada',
    entry_archived: 'Entrada arquivada',
    attachment_added: 'Anexo adicionado',
    inpatient_admitted: 'Internação iniciada',
    inpatient_progressed: 'Evolução hospitalar',
    surgery_requested: 'Cirurgia solicitada',
    surgery_status_changed: 'Status cirúrgico alterado',
    diagnostic_requested: 'Diagnóstico solicitado',
    diagnostic_collected: 'Coleta realizada',
    diagnostic_resulted: 'Resultado liberado',
    inpatient_transferred: 'Transferência hospitalar',
    inpatient_discharged: 'Alta da internação',
    surgery_pre_op: 'Pré-operatório',
    surgery_in_progress: 'Cirurgia em andamento'
  }[eventType];
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function truncateText(value: string, maxLength: number): string {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

export function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
