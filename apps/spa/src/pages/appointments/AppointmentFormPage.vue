<template>
  <div class="appointment-form-page">
    <AppPageHeader>
      <template #title>📅 Novo Agendamento</template>
      <template #subtitle>
        Atendimento &gt; Agenda. Use o fluxo rápido com tutor e paciente inline, valide disponibilidade e deixe a recepção pronta para seguir para fila e atendimento.
      </template>
      <template #actions>
        <DsButton variant="secondary" tag="a" href="/appointments">Voltar à agenda</DsButton>
      </template>
    </AppPageHeader>

    <AppointmentQuickCreateForm
      submit-label="Salvar agendamento"
      :preset-owner-id="prefill.ownerId"
      :preset-patient-id="prefill.patientId"
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
import type { AppointmentSummary } from '@/types/appointment';

const router = useRouter();

const prefill = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return {
    ownerId: params.get('ownerId')?.trim() || '',
    patientId: params.get('patientId')?.trim() || ''
  };
});

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
