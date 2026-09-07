import { computed, type Ref } from 'vue';
import type { PatientSummary } from '@/types/patient';
import type { OwnerSummary } from '@/types/owner';
import type { BillingRecordSummary } from '@/types/billing';
import type { QuoteSummary } from '@/services/quotes';
import type { MedicalRecordListSummary } from '@/types/medicalRecords';
import type { EncounterSummary } from '@/types/encounter';
import type { AppointmentSummary } from '@/types/appointment';
import type { InpatientStaySummary } from '@/types/inpatient';
import { formatDateTime } from '@/utils/labels';

interface SuggestedPackage {
  id: string;
  title: string;
  category: string;
  description: string;
  reason: string;
  referenceValue: number;
}

interface ContextualMessage {
  id: string;
  title: string;
  preview: string;
  href: string | null;
}

interface RelationshipContext {
  patient: Ref<PatientSummary | null>;
  ownerSnapshot: Ref<OwnerSummary | null>;
  ownerName: Ref<string>;
  ownerBillingRecords: Ref<BillingRecordSummary[]>;
  ownerQuotes: Ref<QuoteSummary[]>;
  patientRecords: Ref<MedicalRecordListSummary[]>;
  sortedEncounters: Ref<EncounterSummary[]>;
  upcomingAppointments: Ref<AppointmentSummary[]>;
  focalInpatientStay: Ref<InpatientStaySummary | null>;
  formatCurrency: (amount: number, currency: string) => string;
}

export function usePatientRelationship({
  patient,
  ownerSnapshot,
  ownerName,
  ownerBillingRecords,
  ownerQuotes,
  patientRecords,
  sortedEncounters,
  upcomingAppointments,
  focalInpatientStay,
  formatCurrency,
}: RelationshipContext) {
  const ownerPrimaryContact = computed(() => {
    if (!ownerSnapshot.value) {
      return 'Não informado';
    }

    return (
      ownerSnapshot.value.contacts.find((contact) => contact.primary)?.value ||
      ownerSnapshot.value.contacts[0]?.value ||
      'Não informado'
    );
  });

  const ownerPhoneLabel = computed(() => {
    if (!ownerSnapshot.value) {
      return 'Não informado';
    }

    return (
      ownerSnapshot.value.contacts.find(
        (contact) => contact.type === 'whatsapp' || contact.type === 'phone'
      )?.value || 'Não informado'
    );
  });

  const ownerEmailLabel = computed(() => {
    if (!ownerSnapshot.value) {
      return 'Não informado';
    }

    return (
      ownerSnapshot.value.contacts.find((contact) => contact.type === 'email')?.value ||
      'Não informado'
    );
  });

  const ownerWhatsAppLink = computed(() => {
    if (!ownerSnapshot.value) {
      return null;
    }

    const whatsappContact = ownerSnapshot.value.contacts.find(
      (contact) => contact.type === 'whatsapp'
    );
    if (!whatsappContact) {
      return null;
    }

    const normalized = whatsappContact.value.replace(/\D/g, '');
    return `https://wa.me/${normalized}`;
  });

  const ownerOpenBillingAmount = computed(() =>
    ownerBillingRecords.value
      .filter((record) => record.status !== 'settled')
      .reduce((sum, record) => sum + record.subtotalAmount, 0)
  );

  const ownerActiveQuotes = computed(() =>
    ownerQuotes.value.filter((quote) => quote.status === 'draft' || quote.status === 'approved')
  );

  const ownerSettledBillingAmount = computed(() =>
    ownerBillingRecords.value
      .filter((record) => record.status === 'settled')
      .reduce((sum, record) => sum + record.subtotalAmount, 0)
  );

  const ownerConvertedQuotes = computed(
    () => ownerQuotes.value.filter((quote) => Boolean(quote.convertedToSaleId)).length
  );

  const ownerPoints = computed(() =>
    Math.round(
      ownerSettledBillingAmount.value / 20 +
        ownerConvertedQuotes.value * 30 +
        patientRecords.value.length * 10 +
        sortedEncounters.value.length * 8
    )
  );

  const ownerRedeemableValue = computed(() => Math.floor(ownerPoints.value / 100) * 25);

  const ownerTier = computed(() => {
    if (ownerPoints.value >= 300) return { label: 'Platinum' };
    if (ownerPoints.value >= 180) return { label: 'Gold' };
    if (ownerPoints.value >= 90) return { label: 'Silver' };
    return { label: 'Start' };
  });

  const ownerCrmStage = computed(() => {
    if (ownerOpenBillingAmount.value > 0) {
      return {
        label: 'Cobrança ativa',
        description: 'Tutor com pendências abertas. Priorize negociação e comunicação contextual.'
      };
    }

    if (ownerActiveQuotes.value.length > 0) {
      return {
        label: 'Negociação em curso',
        description: 'Há orçamento ativo para o tutor. Bom momento para conversão comercial.'
      };
    }

    if (upcomingAppointments.value.length > 0) {
      return {
        label: 'Assistência programada',
        description: 'Tutor com jornada futura ativa. Ideal para lembrete e pacote preventivo.'
      };
    }

    return {
      label: 'Relacionamento estável',
      description: 'Sem pendências críticas. Use a janela para fidelização e recompra.'
    };
  });

  const suggestedPackage = computed<SuggestedPackage | null>(() => {
    if (!patient.value) {
      return null;
    }

    if (focalInpatientStay.value) {
      return {
        id: 'recovery-care',
        title: 'Pacote Recuperação Assistida',
        category: 'Pós-internação',
        description: 'Revisões, retornos curtos e monitoramento de evolução após estabilização.',
        reason: 'Paciente com internação recente ou ativa.',
        referenceValue: 680
      };
    }

    if (sortedEncounters.value.length >= 3) {
      return {
        id: 'continuity-clinic',
        title: 'Pacote Continuidade Clínica',
        category: 'Acompanhamento',
        description: 'Monitoramento recorrente para pacientes com histórico assistencial frequente.',
        reason: 'Paciente com recorrência de atendimentos.',
        referenceValue: 720
      };
    }

    if (patient.value.species === 'canine') {
      return {
        id: 'preventive-canine',
        title: 'Pacote Preventivo Canino',
        category: 'Preventivo',
        description: 'Consultas de rotina, janela vacinal e acompanhamento de peso.',
        reason: 'Perfil preventivo canino aderente ao cadastro atual.',
        referenceValue: 360
      };
    }

    if (patient.value.species === 'feline') {
      return {
        id: 'preventive-feline',
        title: 'Pacote Cuidado Felino',
        category: 'Preventivo',
        description: 'Retornos estruturados, revisão clínica e lembretes de prevenção.',
        reason: 'Paciente felino com oportunidade de rotina assistida.',
        referenceValue: 340
      };
    }

    return {
      id: 'baseline-care',
      title: 'Pacote Base de Acompanhamento',
      category: 'Relacionamento',
      description: 'Estrutura mínima de retornos e comunicação clínica para fidelização.',
      reason: 'Paciente ativo com oportunidade de relacionamento contínuo.',
      referenceValue: 290
    };
  });

  const contextualMessages = computed<ContextualMessage[]>(() => {
    if (!patient.value) {
      return [];
    }

    const ownerLabel = ownerSnapshot.value?.fullName || ownerName.value;
    const nextAppointment = upcomingAppointments.value[0];
    const messages: ContextualMessage[] = [];

    if (nextAppointment) {
      messages.push({
        id: 'appointment-reminder',
        title: 'Lembrete de retorno',
        preview: `Olá, ${ownerLabel}. Confirmando o próximo atendimento de ${patient.value.name} em ${formatDateTime(nextAppointment.scheduledAt)}.`,
        href: buildWhatsAppLink(
          `Olá, ${ownerLabel}. Confirmando o próximo atendimento de ${patient.value.name} em ${formatDateTime(nextAppointment.scheduledAt)}.`
        )
      });
    }

    if (suggestedPackage.value) {
      messages.push({
        id: 'package-offer',
        title: 'Oferta de pacote',
        preview: `${patient.value.name} está elegível ao ${suggestedPackage.value.title}. Posso te explicar como funciona?`,
        href: buildWhatsAppLink(
          `Olá, ${ownerLabel}. ${patient.value.name} está elegível ao ${suggestedPackage.value.title}. Posso te explicar como funciona?`
        )
      });
    }

    if (ownerOpenBillingAmount.value > 0) {
      messages.push({
        id: 'billing-followup',
        title: 'Follow-up financeiro',
        preview: `Temos pendências de ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} relacionadas ao acompanhamento de ${patient.value.name}.`,
        href: buildWhatsAppLink(
          `Olá, ${ownerLabel}. Temos pendências de ${formatCurrency(ownerOpenBillingAmount.value, 'BRL')} relacionadas ao acompanhamento de ${patient.value.name}.`
        )
      });
    }

    if (messages.length === 0) {
      messages.push({
        id: 'relationship',
        title: 'Mensagem de acompanhamento',
        preview: `Olá, ${ownerLabel}. Passando para acompanhar como ${patient.value.name} está evoluindo e se podemos apoiar em algo mais.`,
        href: buildWhatsAppLink(
          `Olá, ${ownerLabel}. Passando para acompanhar como ${patient.value.name} está evoluindo e se podemos apoiar em algo mais.`
        )
      });
    }

    return messages;
  });

  function buildWhatsAppLink(message: string): string | null {
    if (!ownerWhatsAppLink.value) {
      return null;
    }

    return `${ownerWhatsAppLink.value}?text=${encodeURIComponent(message)}`;
  }

  const relationshipSummary = computed(
    () =>
      `${ownerTier.value.label} · ${ownerPoints.value} ponto(s) · ${ownerActiveQuotes.value.length} orçamento(s) ativo(s)`
  );

  const patientBillingRecords = computed(() =>
    ownerBillingRecords.value
      .filter((record) => record.patientId === patient.value?.id)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
  );

  const patientOpenBillingAmount = computed(() =>
    patientBillingRecords.value
      .filter((record) => record.status !== 'settled')
      .reduce((sum, record) => sum + record.subtotalAmount, 0)
  );

  return {
    relationshipSummary,
    patientBillingRecords,
    patientOpenBillingAmount,
    ownerPrimaryContact,
    ownerPhoneLabel,
    ownerEmailLabel,
    ownerWhatsAppLink,
    ownerOpenBillingAmount,
    ownerActiveQuotes,
    ownerPoints,
    ownerRedeemableValue,
    ownerTier,
    ownerCrmStage,
    suggestedPackage,
    contextualMessages,
  };
}
