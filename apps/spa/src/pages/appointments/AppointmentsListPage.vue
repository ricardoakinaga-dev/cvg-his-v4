<template>
  <div class="appointments-list-page">
    <AppPageHeader
      title="📅 Agenda"
      subtitle="Gestão operacional de agendamentos e fluxo do hospital"
    >
      <template #actions>
        <DsButton tag="a" to="/appointments/new" variant="primary">+ Novo Agendamento</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <!-- Status filter -->
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
