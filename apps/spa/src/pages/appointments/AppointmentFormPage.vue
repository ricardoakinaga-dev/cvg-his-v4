<template>
  <div class="appointment-form-page">
    <AppPageHeader>
      <template #title>{{ pageTitle }}</template>
      <template #subtitle>
        {{ pageSubtitle }}
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/appointments">Voltar à agenda</DsButton>
      </template>
    </AppPageHeader>

    <AppointmentQuickCreateForm
      submit-label="Salvar agendamento"
      :preset-owner-id="prefill.ownerId"
      :preset-patient-id="prefill.patientId"
      :preset-scheduled-at="prefill.scheduledAt"
      :preset-duration-minutes="prefill.durationMinutes"
      :preset-practitioner-staff-id="prefill.practitionerStaffId"
      :preset-visit-type="prefill.visitType"
      :preset-service-id="prefill.serviceId"
      :preset-unit="prefill.unit"
      :preset-specialty="prefill.specialty"
      :preset-resource-label="prefill.resourceLabel"
      :preset-reason="prefill.reason"
      @created="handleCreated"
      @cancel="goBack"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppointmentQuickCreateForm from '@/components/appointments/AppointmentQuickCreateForm.vue';
import type { AppointmentSummary, AppointmentVisitType } from '@/types/appointment';

const router = useRouter();

const prefill = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return {
    appointmentId: params.get('appointmentId')?.trim() || '',
    ownerId: params.get('ownerId')?.trim() || '',
    patientId: params.get('patientId')?.trim() || '',
    scheduledAt: normalizeDateTimeLocal(params.get('scheduledAt')),
    durationMinutes: Number(params.get('durationMinutes') || 30),
    practitionerStaffId: params.get('practitionerStaffId')?.trim() || '',
    visitType: normalizeVisitType(params.get('visitType')),
    serviceId: params.get('serviceId')?.trim() || '',
    unit: params.get('unit')?.trim() || '',
    specialty: params.get('specialty')?.trim() || '',
    resourceLabel: params.get('resourceLabel')?.trim() || '',
    reason: params.get('reason')?.trim() || ''
  };
});

const isEditingPrefill = computed(() => Boolean(prefill.value.appointmentId));
const pageTitle = computed(() =>
  isEditingPrefill.value ? '✏️ Editar agendamento' : '📅 Novo Agendamento'
);
const pageSubtitle = computed(() =>
  isEditingPrefill.value
    ? 'Atendimento > Agenda. Ajuste os dados do compromisso selecionado e mantenha o fluxo operacional sem sair do contexto da agenda.'
    : 'Atendimento > Agenda. Use o fluxo rápido com tutor e paciente inline, valide disponibilidade e deixe a recepção pronta para seguir para fila e atendimento.'
);

function normalizeDateTimeLocal(value: string | null) {
  if (!value?.trim()) return '';
  const raw = value.trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function normalizeVisitType(value: string | null): AppointmentVisitType {
  if (value === 'walk_in' || value === 'return' || value === 'scheduled') {
    return value;
  }
  return 'scheduled';
}

function handleCreated(appointment: AppointmentSummary) {
  router.push(`/appointments/${appointment.id}`);
}

function goBack() {
  router.push('/appointments');
}
</script>

<style scoped>
.appointment-form-page {
  max-width: 1180px;
}
</style>
