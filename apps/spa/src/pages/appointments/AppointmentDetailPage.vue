<template>
  <div class="appointment-detail-page">
    <div v-if="!appointment" class="page-loading">
      <p>Carregando ou agendamento não encontrado.</p>
      <DsButton variant="secondary" tag="a" href="/appointments">Voltar à agenda</DsButton>
    </div>
    <template v-else>
      <AppPageHeader :subtitle="detailSubtitle">
        <template #title>📅 Agendamento</template>
        <template #subtitle>
          <StatusBadge
            :label="appointmentStatusLabel(appointment.status)"
            :variant="appointmentStatusVariant(appointment.status)"
          />
        </template>
        <template #actions>
          <DsButton tag="a" :to="`/patients/${appointment.patientId}`" variant="secondary">
            Abrir paciente
          </DsButton>
          <DsButton v-if="canCancel" variant="danger" :loading="cancelling" @click="handleCancel">
            {{ cancelling ? 'Cancelando...' : 'Cancelar Agendamento' }}
          </DsButton>
          <DsButton variant="secondary" tag="a" href="/appointments">Voltar</DsButton>
        </template>
      </AppPageHeader>

      <DsCard title="Ficha resumida">
        <div class="summary-grid">
          <div v-for="card in summaryCards" :key="card.label" class="summary-card">
            <span class="summary-card__label">{{ card.label }}</span>
            <strong class="summary-card__value">{{ card.value }}</strong>
            <span class="summary-card__hint">{{ card.hint }}</span>
          </div>
        </div>
      </DsCard>

      <div class="appointment-detail-page__grid">
        <DsCard title="Visão rápida">
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-item__label">Data/Hora</span>
              <strong>{{ formatDateTime(appointment.scheduledAt) }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Tipo</span>
              <strong>{{ visitTypeLabel(appointment.visitType) }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Paciente</span>
              <strong>{{ patientName || 'Carregando...' }}</strong>
            </div>
            <div class="summary-item">
              <span class="summary-item__label">Tutor</span>
              <strong>{{ ownerName || 'Carregando...' }}</strong>
            </div>
          </div>
        </DsCard>

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
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';

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

const detailSubtitle = computed(() => {
  if (!appointment.value) return '';
  return `${appointment.value.id} • ${patientName.value || 'Paciente em carregamento'}`;
});

const summaryCards = computed(() => {
  if (!appointment.value) return [];
  return [
    { label: 'Data/Hora', value: formatDateTime(appointment.value.scheduledAt), hint: 'Momento agendado' },
    { label: 'Tipo', value: visitTypeLabel(appointment.value.visitType), hint: 'Natureza da visita' },
    { label: 'Paciente', value: patientName.value || '—', hint: 'Atendimento vinculado' },
    { label: 'Tutor', value: ownerName.value || '—', hint: 'Responsável principal' }
  ];
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

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.summary-card {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.summary-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.summary-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.summary-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.summary-item {
  padding: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  background: var(--color-bg-subtle, #f8fafc);
}

.summary-item__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
</style>
