export const speciesMap: Record<string, string> = {
  not_defined: '❓ Não Definido',
  avian: '🐦 Avícola',
  bovine: '🐄 Bovino',
  canine: '🐕 Canina',
  rabbit: '🐇 Cunícula',
  equine: '🐎 Equina',
  feline: '🐈 Felina',
  other: '🐾 Outras',
  primate: '🐒 Primata',
  rodent: '🐹 Roedor',
  reptile: '🦎 Réptil'
};

export function speciesLabel(s: string): string {
  return speciesMap[s] || s || '—';
}

export const sexMap: Record<string, string> = {
  male: '♂ Macho',
  female: '♀ Fêmea',
  unknown: '❓ Desconhecido'
};

export function sexLabel(s: string): string {
  return sexMap[s] || s || '—';
}

export const patientStatusMap: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  deceased: 'Falecido'
};

export function patientStatusLabel(s: string): string {
  return patientStatusMap[s] || s || '—';
}

export const patientSizeMap: Record<string, string> = {
  small: 'Pequeno',
  medium: 'Médio',
  large: 'Grande'
};

export function patientSizeLabel(s: string): string {
  return patientSizeMap[s] || s || '—';
}

export const visitTypeMap: Record<string, string> = {
  walk_in: '🚶 Walk-in',
  scheduled: '📅 Agendado',
  return: '🔄 Retorno'
};

export function visitTypeLabel(t: string): string {
  return visitTypeMap[t] || t;
}

export const encounterStatusMap: Record<string, string> = {
  reception: '📋 Recepção',
  in_triage: '🏷️ Em triagem',
  in_care: '🩺 Em atendimento',
  observation: '👁️ Observação',
  closed: '✅ Finalizado'
};

export function encounterStatusLabel(s: string): string {
  return encounterStatusMap[s] || s;
}

export const encounterOriginMap: Record<string, string> = {
  reception: 'Recepção',
  schedule: 'Agendamento',
  return: 'Retorno'
};

export function encounterOriginLabel(o: string): string {
  return encounterOriginMap[o] || o;
}

export const encounterEventTypeMap: Record<string, string> = {
  encounter_opened: '🩺 Aberto',
  status_changed: '🔄 Status',
  queue_checked_in: '📋 Check-in',
  queue_called: '📢 Chamado',
  triage_recorded: '🏷️ Triagem',
  handoff_sent_to_reception: '📨 Handoff enviado',
  handoff_acknowledged: '✅ Handoff recebido',
  encounter_closed: '✅ Fechado'
};

export function encounterEventTypeLabel(e: string): string {
  return encounterEventTypeMap[e] || e;
}

export const appointmentStatusMap: Record<string, string> = {
  scheduled: 'Agendado',
  checked_in: 'Em atendimento',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export function appointmentStatusLabel(s: string): string {
  return appointmentStatusMap[s] || s;
}

export const ownerStatusMap: Record<string, string> = {
  active: 'Ativo',
  inactive: 'Inativo'
};

export function ownerStatusLabel(s: string): string {
  return ownerStatusMap[s] || s;
}

export const encounterAllowedTransitions: Record<string, string[]> = {
  reception: ['in_triage', 'in_care', 'closed'],
  in_triage: ['in_care', 'observation', 'closed'],
  in_care: ['observation', 'closed'],
  observation: ['in_care', 'closed'],
  closed: []
};

export function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('pt-BR');
  } catch {
    return dateStr;
  }
}

export function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

export function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '...' : s;
}
