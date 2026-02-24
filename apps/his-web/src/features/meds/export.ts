import type { MedicationOrderRecord } from '@/lib/api';

/**
 * Formata uma ordem para texto simples (pt-BR)
 */
export function formatMedicationOrder(order: MedicationOrderRecord): string {
    const startAt = order.startAt ? new Date(order.startAt).toLocaleString('pt-BR') : 'n/a';
    const endAt = order.endAt ? new Date(order.endAt).toLocaleString('pt-BR') : 'n/a';
    const statusLabel = order.status === 'active' ? 'ativo' : 'suspenso';
    const posologia = order.prescriptionText ? ` — Posologia: ${order.prescriptionText}` : '';

    return `${order.medicationName} ${order.doseValue} ${order.doseUnit} ${order.route} ${order.frequencyType} — Início: ${startAt} — Fim: ${endAt} — Status: ${statusLabel}${posologia}`;
}

/**
 * Gera o texto completo do resumo da prescrição
 */
export function buildPrescriptionSummary(input: {
    patientLabel?: string; // Optional label (e.g. "Paciente: Rex") or just ID if missing
    encounterId: string;
    orders: MedicationOrderRecord[];
    generatedAt: Date;
}): string {
    const { patientLabel, encounterId, orders, generatedAt } = input;
    const dateStr = generatedAt.toLocaleString('pt-BR');
    const shortEncounterId = encounterId.slice(0, 8); // Display only first 8 chars for brevity

    let output = `RESUMO DA PRESCRIÇÃO\n`;
    output += `Gerado em: ${dateStr}\n`;
    if (patientLabel) {
        output += `${patientLabel}\n`;
    }
    output += `Atendimento: ${shortEncounterId}...\n\n`;

    if (orders.length === 0) {
        output += `(Nenhuma prescrição ativa encontrada neste momento.)\n`;
        return output;
    }

    output += `Total de ordens: ${orders.length}\n`;
    output += `----------------------------------------\n`;

    orders.forEach((order) => {
        output += `${formatMedicationOrder(order)}\n`;
    });

    output += `----------------------------------------\n`;

    return output;
}

/**
 * Utility to verify if we can simply fetch again (Option B)
 * YES: this is safer to ensure we get the latest server state.
 */
