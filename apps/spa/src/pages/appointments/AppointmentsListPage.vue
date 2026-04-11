<template>
  <div class="appointments-list-page">
    <AppPageHeader
      title="📅 Agenda"
      subtitle="Gestão operacional de agendamentos e fluxo do hospital"
    >
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadAppointments">
          Atualizar
        </DsButton>
        <DsButton tag="a" to="/appointments/new" variant="primary">+ Novo Agendamento</DsButton>
      </template>
    </AppPageHeader>

    <section class="appointments-list-page__overview">
      <DsCard title="Painel da agenda">
        <div class="overview-grid">
          <div class="overview-metric">
            <span class="overview-metric__value">{{ appointments.length }}</span>
            <span class="overview-metric__label">Agendamentos carregados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ scheduledCount }}</span>
            <span class="overview-metric__label">Programados</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ activeCount }}</span>
            <span class="overview-metric__label">Em andamento</span>
          </div>
          <div class="overview-metric">
            <span class="overview-metric__value">{{ closedCount }}</span>
            <span class="overview-metric__label">Concluídos / cancelados</span>
          </div>
        </div>
      </DsCard>

      <DsCard title="Filtros e busca">
        <div class="appointments-list-page__filters">
          <DsInput
            v-model="statusFilter"
            type="select"
            placeholder="Todos status"
            @change="applyFilters"
          >
            <option value="scheduled">📅 Agendado</option>
            <option value="checked_in">🔄 Em atendimento</option>
            <option value="completed">✔ Concluído</option>
            <option value="cancelled">✕ Cancelado</option>
          </DsInput>
          <DsInput
            v-model="search"
            type="search"
            placeholder="Buscar paciente ou tutor..."
            @keyup.enter="applyFilters"
          />
        </div>
      </DsCard>
    </section>

    <section class="appointments-list-page__story">
      <DsCard title="Leitura rápida">
        <div class="story-grid">
          <div v-for="card in storyCards" :key="card.label" class="story-card">
            <span class="story-card__label">{{ card.label }}</span>
            <strong class="story-card__value">{{ card.value }}</strong>
            <span class="story-card__hint">{{ card.hint }}</span>
          </div>
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
      v-else-if="filteredAppointments.length === 0"
      icon="📅"
      title="Nenhum agendamento encontrado"
      description="Crie o primeiro agendamento para começar."
    >
      <template #action>
        <DsButton tag="a" to="/appointments/new" variant="primary">+ Novo Agendamento</DsButton>
      </template>
    </EmptyState>

    <!-- Kanban View -->
    <div v-else class="kanban-view">
      <div v-for="col in kanbanColumns" :key="col.status" class="kanban-column">
        <div class="kanban-column__header">
          <strong>{{ col.label }}</strong>
          <span class="kanban-column__count">{{ getColumnItems(col.status).length }}</span>
        </div>
        <div class="kanban-column__body">
          <div
            v-for="appt in getColumnItems(col.status)"
            :key="appt.id"
            class="kanban-card"
            :style="{ borderLeftColor: statusColor(appt.status) }"
            @click="viewDetail(appt)"
          >
            <div class="kanban-card__time">{{ formatTime(appt.scheduledAt) }}</div>
            <div class="kanban-card__patient">🐾 {{ patientName(appt.patientId) }}</div>
            <div class="kanban-card__owner">👤 {{ ownerName(appt.ownerId) }}</div>
            <div v-if="appt.reason" class="kanban-card__reason">
              {{ truncate(appt.reason, 50) }}
            </div>
            <div class="kanban-card__type">{{ visitTypeLabel(appt.visitType) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { appointmentService } from '@/services/appointment';
import type { AppointmentSummary } from '@/types/appointment';
import { visitTypeLabel, formatTime, truncate } from '@/utils/labels';
import { useEntityCache } from '@/composables/useEntityCache';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';

const router = useRouter();
const appointments = ref<AppointmentSummary[]>([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const statusFilter = ref('');
const entityCache = useEntityCache();

const patientNames = ref<Record<string, string>>({});
const ownerNames = ref<Record<string, string>>({});

const filteredAppointments = computed(() => {
  let items = appointments.value;
  if (statusFilter.value) {
    items = items.filter((a) => a.status === statusFilter.value);
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    items = items.filter(
      (a) =>
        patientName(a.patientId).toLowerCase().includes(q) ||
        ownerName(a.ownerId).toLowerCase().includes(q)
    );
  }
  return items;
});

const kanbanColumns = [
  { status: 'scheduled', label: '📅 Agendados' },
  { status: 'checked_in', label: '🔄 Em Atendimento' },
  { status: 'completed', label: '✔ Concluídos' },
  { status: 'cancelled', label: '✕ Cancelados' }
];

function getColumnItems(status: string) {
  return filteredAppointments.value
    .filter((a) => a.status === status)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

const statusColorMap: Record<string, string> = {
  scheduled: '#3b82f6',
  checked_in: '#f59e0b',
  completed: '#6b7280',
  cancelled: '#ef4444'
};

const scheduledCount = computed(
  () => filteredAppointments.value.filter((a) => a.status === 'scheduled').length
);
const activeCount = computed(
  () => filteredAppointments.value.filter((a) => a.status === 'checked_in').length
);
const closedCount = computed(
  () =>
    filteredAppointments.value.filter(
      (a) => a.status === 'completed' || a.status === 'cancelled'
    ).length
);
const pendingCount = computed(() => filteredAppointments.value.filter((a) => a.status === 'scheduled').length);
const completionRate = computed(() => {
  if (!filteredAppointments.value.length) return '0%';
  return `${Math.round((closedCount.value / filteredAppointments.value.length) * 100)}%`;
});
const nextAppointment = computed(() => {
  const upcoming = [...filteredAppointments.value]
    .filter((appt) => new Date(appt.scheduledAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  if (!upcoming) return '—';
  return `${formatTime(upcoming.scheduledAt)} • ${patientName(upcoming.patientId)}`;
});
const storyCards = computed(() => [
  { label: 'Pendentes', value: pendingCount.value.toString(), hint: 'Ainda programados' },
  { label: 'Ativos', value: activeCount.value.toString(), hint: 'Em atendimento agora' },
  { label: 'Fechados', value: closedCount.value.toString(), hint: 'Concluídos ou cancelados' },
  { label: 'Próximo', value: nextAppointment.value, hint: 'Próxima ocorrência na fila' },
  { label: 'Fechamento', value: completionRate.value, hint: 'Percentual já encerrado' }
]);

function statusColor(s: string) {
  return statusColorMap[s] || '#ccc';
}

function patientName(id: string): string {
  return patientNames.value[id] || `Paciente ${id.slice(0, 8)}...`;
}

function ownerName(id: string): string {
  return ownerNames.value[id] || `Tutor ${id.slice(0, 8)}...`;
}

function viewDetail(appt: AppointmentSummary) {
  router.push({
    path: `/appointments/${appt.id}`,
    state: { appointment: JSON.parse(JSON.stringify(appt)) }
  });
}

function applyFilters() {
  // Reactive, no action needed
}

async function loadAppointments() {
  loading.value = true;
  error.value = '';
  try {
    appointments.value = await appointmentService.list();
    const patientIds = [...new Set(appointments.value.map((a) => a.patientId))];
    const ownerIds = [...new Set(appointments.value.map((a) => a.ownerId))];
    await Promise.all([
      ...patientIds.map(async (id) => {
        patientNames.value[id] = await entityCache.getPatientName(id);
      }),
      ...ownerIds.map(async (id) => {
        ownerNames.value[id] = await entityCache.getOwnerName(id);
      })
    ]);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar agendamentos';
  } finally {
    loading.value = false;
  }
}

onMounted(loadAppointments);
</script>

<style scoped>
.appointments-list-page__overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.appointments-list-page__story {
  margin-bottom: 16px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.overview-metric {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.overview-metric__value {
  display: block;
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.overview-metric__label {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-muted, #64748b);
}

.story-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.story-card {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--color-border, #e2e8f0);
  background: linear-gradient(180deg, var(--color-surface, #ffffff), var(--color-bg-subtle, #f8fafc));
}

.story-card__label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted, #64748b);
}

.story-card__value {
  display: block;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text, #0f172a);
}

.story-card__hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--color-text-muted, #64748b);
}

.appointments-list-page__filters {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.appointments-list-page__filter-select {
  padding: 10px 14px;
  font-size: 14px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  min-height: 44px;
}
.kanban-view {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
  overflow-x: auto;
}
.kanban-column {
  background: var(--color-bg-subtle, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 12px;
  min-height: 300px;
}
.kanban-column__header {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border, #e2e8f0);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
}
.kanban-column__count {
  background: var(--color-primary-50, #eff6ff);
  color: var(--color-primary-600, #2563eb);
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 9999px;
}
.kanban-column__body {
  padding: 8px;
  max-height: 500px;
  overflow-y: auto;
}
.kanban-card {
  padding: 10px;
  margin-bottom: 6px;
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  border-left: 3px solid #ccc;
  cursor: pointer;
  transition: box-shadow 0.15s ease;
}
.kanban-card:hover {
  box-shadow: var(--shadow-md, 0 4px 16px rgba(0, 0, 0, 0.08));
}
.kanban-card__time {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  margin-bottom: 4px;
}
.kanban-card__patient {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text, #0f172a);
}
.kanban-card__owner {
  font-size: 12px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 2px;
}
.kanban-card__reason {
  font-size: 13px;
  color: var(--color-text-secondary, #475569);
  margin-top: 4px;
}
.kanban-card__type {
  font-size: 11px;
  color: var(--color-text-muted, #94a3b8);
  margin-top: 6px;
}
</style>
