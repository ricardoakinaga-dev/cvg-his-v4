<template>
  <div class="appointment-detail-page">
    <div v-if="!appointment" class="page-loading">
      <p>Carregando ou agendamento não encontrado.</p>
      <DsButton variant="secondary" tag="a" href="/appointments">Voltar à agenda</DsButton>
    </div>
    <template v-else>
      <AppPageHeader>
        <template #title>📅 Agendamento</template>
        <template #subtitle>
          <StatusBadge
            :label="appointmentStatusLabel(appointment.status)"
            :variant="appointmentStatusVariant(appointment.status)"
          />
        </template>
        <template #actions>
          <DsButton v-if="canCancel" variant="danger" :loading="cancelling" @click="handleCancel">
            {{ cancelling ? 'Cancelando...' : 'Cancelar Agendamento' }}
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/appointments">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <div class="appointment-detail-page__grid">
        <AppDetailSection title="Informações">
          <div class="detail-row">
            <span class="detail-row__label">Data/Hora</span>
            <span>{{ formatDateTime(appointment.scheduledAt) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Tipo</span>
            <span>{{ visitTypeLabel(appointment.visitType) }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Paciente</span>
            <span>{{ patientName }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-row__label">Tutor</span>
            <span>{{ ownerName }}</span>
          </div>
        </AppDetailSection>

        <AppDetailSection v-if="appointment.reason" title="Motivo">
          <p>{{ appointment.reason }}</p>
        </AppDetailSection>

        <AppDetailSection title="Informações Administrativas">
          <p class="muted">Criado em: {{ formatDate(appointment.createdAt) }}</p>
          <p class="muted">Atualizado em: {{ formatDate(appointment.updatedAt) }}</p>
        </AppDetailSection>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { appointmentService } from '@/services/appointment';
import type { AppointmentSummary } from '@/types/appointment';
import { visitTypeLabel, appointmentStatusLabel, formatDateTime, formatDate } from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import StatusBadge from '@/components/StatusBadge.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppDetailSection from '@/components/AppDetailSection.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';

const route = useRoute();
const appointment = ref<AppointmentSummary | null>(null);
const cancelling = ref(false);
const entityCache = useEntityCache();

const patientName = ref('');
const ownerName = ref('');

function appointmentStatusVariant(s: string) {
  const map: Record<string, string> = {
    scheduled: 'info',
    checked_in: 'warning',
    completed: 'neutral',
    cancelled: 'danger'
  };
  return (map[s] || 'default') as any;
}

async function loadEntityNames(appt: AppointmentSummary) {
  patientName.value = await entityCache.getPatientName(appt.patientId);
  ownerName.value = await entityCache.getOwnerName(appt.ownerId);
}

const canCancel = computed(() => {
  return (
    appointment.value &&
    (appointment.value.status === 'scheduled' || appointment.value.status === 'checked_in')
  );
});

async function handleCancel() {
  if (!appointment.value) return;
  if (!confirm('Deseja cancelar este agendamento?')) return;
  cancelling.value = true;
  try {
    await appointmentService.cancel(appointment.value.id);
    appointment.value.status = 'cancelled';
  } catch (err: unknown) {
    alert(err instanceof Error ? err.message : 'Erro ao cancelar');
  } finally {
    cancelling.value = false;
  }
}

onMounted(async () => {
  const fromState = history.state?.appointment as AppointmentSummary | undefined;
  if (fromState) {
    appointment.value = fromState;
    await loadEntityNames(fromState);
    return;
  }
  const id = route.params.id as string;
  try {
    const appt = await appointmentService.getById(id);
    appointment.value = appt;
    await loadEntityNames(appt);
  } catch {
    // Appointment not found, keep null
  }
});
</script>

<style scoped>
.appointment-detail-page__grid {
  display: grid;
  gap: 16px;
}
</style>
