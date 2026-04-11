<template>
  <div class="scheduling-list-page">
    <AppPageHeader>
      <template #title>📅 Agenda</template>
      <template #subtitle>
        <span class="muted">Visão operacional de agendamentos com ações rápidas e leitura executiva.</span>
        <span v-if="lastRefresh" class="muted">Atualizado: {{ formatTime(lastRefresh.toISOString()) }}</span>
        <DsSpinner v-if="loading" size="sm" inline label="Atualizando..." />
      </template>
      <template #actions>
        <DsButton variant="secondary" @click="loadAppointments" :loading="loading">Atualizar</DsButton>
        <DsButton variant="primary" tag="a" href="/scheduling/new">Novo Agendamento</DsButton>
        <DsButton variant="secondary" tag="a" href="/queue">Ver Fila</DsButton>
      </template>
    </AppPageHeader>

    <section class="summary-grid">
      <DsCard v-for="card in summaryCards" :key="card.label" variant="elevated" class="summary-card">
        <div class="summary-card__icon">{{ card.icon }}</div>
        <div class="summary-card__body">
          <span class="summary-card__value">{{ card.value }}</span>
          <span class="summary-card__label">{{ card.label }}</span>
        </div>
      </DsCard>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div v-if="loading" class="page-loading">
      <DsSpinner size="md" />
    </div>

    <EmptyState
      v-else-if="appointments.length === 0"
      icon="📅"
      title="Nenhum agendamento encontrado."
      description="Crie o primeiro agendamento para iniciar a programação operacional do dia."
    />

    <div v-else class="table-wrapper">
      <table class="data-table">
        <caption class="sr-only">
          Lista de agendamentos
        </caption>
        <thead>
          <tr>
            <th>Paciente</th>
            <th>Data/Hora</th>
            <th>Tipo</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="apt in appointments" :key="apt.id">
            <td>
              <span v-if="patientNameCache[apt.patientId]">{{
                patientNameCache[apt.patientId]
              }}</span>
              <DsSpinner v-else size="sm" inline label="Carregando..." />
            </td>
            <td>{{ formatDateTime(apt.scheduledAt) }}</td>
            <td>{{ visitTypeLabel(apt.visitType) }}</td>
            <td>
              <DsBadge :variant="appointmentStatusVariant(apt.status)" size="sm">
                {{ appointmentStatusLabel(apt.status) }}
              </DsBadge>
            </td>
            <td class="table__actions-col">
              <DsButton variant="secondary" size="sm" tag="a" :href="`/appointments/${apt.id}`">
                Ver
              </DsButton>
              <DsButton
                v-if="canCancel(apt.status)"
                variant="danger"
                size="sm"
                :loading="cancellingId === apt.id"
                :disabled="cancellingId === apt.id"
                @click="handleCancel(apt.id)"
              >
                {{ cancellingId === apt.id ? 'Cancelando...' : 'Cancelar' }}
              </DsButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { appointmentService } from '@/services/appointment';
import type { AppointmentSummary, AppointmentStatus } from '@/types/appointment';
import { useEntityCache } from '@/composables/useEntityCache';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsBadge from '@cvg-his-v2/design-system/vue/DsBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const appointments = ref<AppointmentSummary[]>([]);
const loading = ref(true);
const error = ref('');
const cancellingId = ref<string | null>(null);
const entityCache = useEntityCache();
const lastRefresh = ref<Date | null>(null);

const patientNameCache = ref<Record<string, string>>({});

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: 'Agendado',
  checked_in: 'Check-in',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const STATUS_VARIANT: Record<AppointmentStatus, 'info' | 'warning' | 'success' | 'default'> = {
  scheduled: 'info',
  checked_in: 'warning',
  completed: 'success',
  cancelled: 'default'
};

const VISIT_TYPE_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  walk_in: 'Walk-in',
  return: 'Retorno'
};

const summaryCards = computed(() => {
  const scheduled = appointments.value.filter((apt) => apt.status === 'scheduled').length;
  const checkedIn = appointments.value.filter((apt) => apt.status === 'checked_in').length;
  const completed = appointments.value.filter((apt) => apt.status === 'completed').length;
  const cancelled = appointments.value.filter((apt) => apt.status === 'cancelled').length;

  return [
    { icon: '📅', label: 'Agendados', value: String(scheduled) },
    { icon: '🏥', label: 'Check-ins', value: String(checkedIn) },
    { icon: '✅', label: 'Concluídos', value: String(completed) },
    { icon: '⛔', label: 'Cancelados', value: String(cancelled) }
  ];
});

function appointmentStatusLabel(status: AppointmentStatus): string {
  return STATUS_LABELS[status] || status;
}

function appointmentStatusVariant(
  status: AppointmentStatus
): 'info' | 'warning' | 'success' | 'default' {
  return STATUS_VARIANT[status] || 'default';
}

function visitTypeLabel(type: string): string {
  return VISIT_TYPE_LABELS[type] || type;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function canCancel(status: AppointmentStatus): boolean {
  return status === 'scheduled' || status === 'checked_in';
}

function formatDateTime(d: string): string {
  try {
    return new Date(d).toLocaleString('pt-BR');
  } catch {
    return d;
  }
}

async function handleCancel(appointmentId: string) {
  cancellingId.value = appointmentId;
  try {
    await appointmentService.cancel(appointmentId);
    await loadAppointments();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao cancelar agendamento';
  } finally {
    cancellingId.value = null;
  }
}

async function loadAppointments() {
  loading.value = true;
  error.value = '';
  try {
    appointments.value = await appointmentService.list();
    await Promise.allSettled(
      appointments.value.map(async (apt) => {
        if (!patientNameCache.value[apt.patientId]) {
          patientNameCache.value[apt.patientId] = await entityCache.getPatientName(apt.patientId);
        }
      })
    );
    lastRefresh.value = new Date();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar agendamentos';
  } finally {
    loading.value = false;
  }
}

onMounted(loadAppointments);
</script>

<style scoped>
.scheduling-list-page {
  max-width: 1280px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin: 16px 0 20px;
}

.summary-card {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 18px;
}

.summary-card__icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: rgba(37, 99, 235, 0.08);
  font-size: 22px;
}

.summary-card__body {
  display: flex;
  flex-direction: column;
}

.summary-card__value {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
  line-height: 1;
}

.summary-card__label {
  font-size: 13px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 4px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
