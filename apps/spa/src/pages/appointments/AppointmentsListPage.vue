<template>
  <div class="appointments-cockpit">
    <AppPageHeader>
      <template #title>📅 Agenda Premium</template>
      <template #subtitle>
        Atendimento &gt; Agenda. Cockpit multiprofissional com filtros laterais, leitura por período e ações rápidas para recepção, fila e atendimento.
      </template>
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadOverview">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" href="/queue">Fila operacional</DsButton>
        <DsButton v-if="canManageScheduling" variant="primary" @click="showQuickCreate = true">
          + Agendamento rápido
        </DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <EmptyState
      v-if="!canReadScheduling"
      icon="🔒"
      title="Acesso indisponível para agenda"
      description="Sua sessão atual não possui permissão para acompanhar a agenda operacional do Atendimento."
    />

    <template v-else>
      <section class="appointments-cockpit__summary">
        <DsCard v-for="card in summaryCards" :key="card.label" class="metric-card">
          <span class="metric-card__label">{{ card.label }}</span>
          <strong class="metric-card__value">{{ card.value }}</strong>
          <span class="metric-card__hint">{{ card.hint }}</span>
        </DsCard>
      </section>

      <div class="appointments-cockpit__layout">
        <aside class="appointments-cockpit__sidebar">
          <DsCard title="Filtro operacional">
            <div class="sidebar-stack">
              <DsInput
                id="referenceDate"
                v-model="referenceDate"
                type="date"
                label="Data base"
                @change="loadOverview"
              />

              <div class="view-toggle" role="tablist" aria-label="Modo da agenda">
                <button
                  v-for="mode in viewOptions"
                  :key="mode.value"
                  type="button"
                  class="view-toggle__button"
                  :class="{ 'view-toggle__button--active': viewMode === mode.value }"
                  @click="setViewMode(mode.value)"
                >
                  {{ mode.label }}
                </button>
              </div>

              <DsInput
                id="practitionerFilter"
                v-model="filters.practitionerStaffId"
                type="select"
                label="Profissional"
                @change="loadOverview"
              >
                <option value="">Todos</option>
                <option value="unassigned">Sem profissional</option>
                <option
                  v-for="professional in overview?.professionals ?? []"
                  :key="professional.id"
                  :value="professional.id"
                >
                  {{ professional.fullName }}
                </option>
              </DsInput>

              <DsInput
                id="serviceFilter"
                v-model="filters.serviceId"
                type="select"
                label="Serviço"
                @change="loadOverview"
              >
                <option value="">Todos</option>
                <option v-for="service in services" :key="service.id" :value="service.id">
                  {{ service.name }}
                </option>
              </DsInput>

              <DsInput
                id="unitFilter"
                v-model="filters.unit"
                type="select"
                label="Unidade/Setor"
                @change="loadOverview"
              >
                <option value="">Todas</option>
                <option v-for="unit in overview?.filterOptions.units ?? []" :key="unit" :value="unit">
                  {{ unit }}
                </option>
              </DsInput>

              <DsInput
                id="specialtyFilter"
                v-model="filters.specialty"
                type="select"
                label="Especialidade"
                @change="loadOverview"
              >
                <option value="">Todas</option>
                <option
                  v-for="specialty in overview?.filterOptions.specialties ?? []"
                  :key="specialty"
                  :value="specialty"
                >
                  {{ specialty }}
                </option>
              </DsInput>

              <DsInput
                id="search"
                v-model="filters.search"
                type="search"
                label="Busca"
                placeholder="Tutor, paciente, sala, motivo..."
                @keyup.enter="loadOverview"
              />

              <div class="status-chips">
                <button
                  v-for="status in overview?.filterOptions.statuses ?? []"
                  :key="status"
                  type="button"
                  class="status-chip"
                  :class="{ 'status-chip--active': selectedStatuses.includes(status) }"
                  @click="toggleStatus(status)"
                >
                  {{ statusLabel(status) }}
                </button>
              </div>

              <div class="sidebar-actions">
                <DsButton variant="primary" @click="loadOverview">Aplicar</DsButton>
                <DsButton variant="secondary" @click="resetFilters">Limpar</DsButton>
              </div>
            </div>
          </DsCard>
        </aside>

        <section class="appointments-cockpit__main">
          <DsCard class="board-toolbar">
            <div class="board-toolbar__group">
              <DsButton variant="secondary" @click="shiftReferenceDate(-1)">◀</DsButton>
              <strong>{{ periodLabel }}</strong>
              <DsButton variant="secondary" @click="shiftReferenceDate(1)">▶</DsButton>
            </div>
            <div class="board-toolbar__group">
              <DsButton variant="secondary" @click="jumpToToday">Hoje</DsButton>
              <DsButton variant="ghost" tag="a" href="/appointments/new">Abrir formulário completo</DsButton>
            </div>
          </DsCard>

          <div v-if="loading" class="page-loading">
            <DsSpinner size="md" />
          </div>

          <EmptyState
            v-else-if="!overview || overview.items.length === 0"
            icon="📅"
            title="Nenhum agendamento no período"
            description="Ajuste filtros, troque a visão ou use o fluxo rápido para abrir o primeiro compromisso."
          >
            <template v-if="canManageScheduling" #action>
              <DsButton variant="primary" @click="showQuickCreate = true">+ Agendamento rápido</DsButton>
            </template>
          </EmptyState>

          <template v-else-if="viewMode === 'month'">
            <div class="month-grid">
              <DsCard v-for="day in calendarDays" :key="day.date" class="month-cell">
                <div class="month-cell__header">
                  <strong>{{ day.label }}</strong>
                  <span>{{ appointmentsByDay(day.date).length }}</span>
                </div>
                <div class="month-cell__body">
                  <button
                    v-for="item in appointmentsByDay(day.date).slice(0, 4)"
                    :key="item.id"
                    type="button"
                    class="month-item"
                    @click="goToDetail(item.id)"
                  >
                    <span>{{ timeLabel(item.scheduledAt) }}</span>
                    <strong>{{ patientName(item.patientId) }}</strong>
                    <small>{{ operationalLabel(item) }}</small>
                    <small>{{ item.practitionerName || 'Sem profissional' }}</small>
                  </button>
                  <span v-if="appointmentsByDay(day.date).length > 4" class="month-item__more">
                    +{{ appointmentsByDay(day.date).length - 4 }} compromissos
                  </span>
                </div>
              </DsCard>
            </div>
          </template>

          <template v-else>
            <section v-for="day in visibleDays" :key="day.date" class="day-board">
              <div class="day-board__header">
                <strong>{{ day.label }}</strong>
                <span>{{ appointmentsByDay(day.date).length }} agendamentos</span>
              </div>

              <div class="timeline-grid" :style="{ gridTemplateColumns: `repeat(${columnCount}, minmax(220px, 1fr))` }">
                <DsCard v-for="column in professionalColumns" :key="`${day.date}-${column.id}`" class="timeline-column">
                  <template #title>
                    <div class="timeline-column__title">
                      <strong>{{ column.label }}</strong>
                      <span>{{ appointmentsByColumn(day.date, column.id).length }}</span>
                    </div>
                  </template>

                  <div v-if="blocksByColumn(day.date, column.id).length" class="timeline-blocks">
                    <div
                      v-for="block in blocksByColumn(day.date, column.id)"
                      :key="block.id"
                      class="timeline-block"
                    >
                      {{ block.title }} · {{ timeLabel(block.startsAt) }}-{{ timeLabel(block.endsAt) }}
                    </div>
                  </div>

                  <div class="timeline-items">
                    <button
                      v-for="item in appointmentsByColumn(day.date, column.id)"
                      :key="item.id"
                      type="button"
                      class="timeline-item"
                      :class="`timeline-item--${item.operational.stage}`"
                      @click="goToDetail(item.id)"
                    >
                      <div class="timeline-item__head">
                        <span>{{ timeLabel(item.scheduledAt) }} · {{ item.durationMinutes || 30 }} min</span>
                        <span class="status-pill" :class="`status-pill--${item.operational.stage}`">
                          {{ operationalLabel(item) }}
                        </span>
                      </div>
                      <strong>{{ patientName(item.patientId) }}</strong>
                      <span>{{ ownerName(item.ownerId) }}</span>
                      <small>{{ item.serviceName || item.specialty || item.reason }}</small>
                      <small class="timeline-item__meta">
                        Agenda: {{ statusLabel(item.status) }} · Atualizado {{ timeLabel(item.operational.updatedAt) }}
                      </small>

                      <div v-if="item.conflicts.length" class="timeline-item__conflicts">
                        <span v-for="conflict in item.conflicts.slice(0, 2)" :key="`${item.id}-${conflict.type}-${conflict.startsAt}`">
                          {{ conflict.message }}
                        </span>
                      </div>

                      <div class="timeline-item__actions" @click.stop>
                        <DsButton variant="ghost" size="sm" @click="goToDetail(item.id)">Ver</DsButton>
                        <DsButton
                          v-if="canCheckIn(item)"
                          variant="success"
                          size="sm"
                          :loading="actionLoadingId === item.id && actionKind === 'checkin'"
                          @click="checkIn(item)"
                        >
                          Check-in
                        </DsButton>
                        <DsButton
                          v-if="canMarkNoShow(item)"
                          variant="danger"
                          size="sm"
                          :loading="actionLoadingId === item.id && actionKind === 'noshow'"
                          @click="markNoShow(item)"
                        >
                          No-show
                        </DsButton>
                        <DsButton
                          v-if="shouldShowQueueAction(item)"
                          variant="secondary"
                          size="sm"
                          tag="a"
                          href="/queue"
                        >
                          Ver fila
                        </DsButton>
                        <DsButton
                          v-if="shouldShowEncounterAction(item)"
                          variant="secondary"
                          size="sm"
                          @click="openEncounter(item)"
                        >
                          {{ encounterActionLabel(item) }}
                        </DsButton>
                      </div>
                    </button>
                  </div>
                </DsCard>
              </div>
            </section>
          </template>
        </section>
      </div>
    </template>

    <DsModal :open="showQuickCreate" title="Agendamento rápido" size="lg" @close="showQuickCreate = false">
      <AppointmentQuickCreateForm compact submit-label="Salvar e voltar ao cockpit" @created="handleCreated" @cancel="showQuickCreate = false" />
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import AppointmentQuickCreateForm from '@/components/appointments/AppointmentQuickCreateForm.vue';
import { apiRequest, ApiError } from '@/services/api';
import { appointmentService } from '@/services/appointment';
import { getSchedulingOverview, checkInQueue } from '@/services/scheduling';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { servicesService, type ServiceSummary } from '@/services/services';
import type {
  AppointmentStatus,
  AppointmentSummary,
  SchedulingCockpitAppointmentSummary,
  SchedulingOverviewResponse
} from '@/types/appointment';

interface SessionAccessResponse {
  access?: {
    permissionCodes?: string[];
  };
}

const router = useRouter();
const loading = ref(false);
const error = ref('');
const permissionCodes = ref<string[] | null>(null);
const overview = ref<SchedulingOverviewResponse | null>(null);
const services = ref<ServiceSummary[]>([]);
const showQuickCreate = ref(false);
const actionLoadingId = ref('');
const actionKind = ref<'checkin' | 'noshow' | ''>('');

const viewMode = ref<'day' | 'week' | 'month'>('day');
const referenceDate = ref(new Date().toISOString().slice(0, 10));
const filters = ref({
  practitionerStaffId: '',
  serviceId: '',
  unit: '',
  specialty: '',
  search: ''
});
const selectedStatuses = ref<AppointmentStatus[]>([]);
const ownerCache = ref<Record<string, string>>({});
const patientCache = ref<Record<string, string>>({});

const viewOptions = [
  { value: 'day' as const, label: 'Dia' },
  { value: 'week' as const, label: 'Semana' },
  { value: 'month' as const, label: 'Mês' }
];

const canReadScheduling = computed(() => permissionCodes.value?.includes('scheduling.read') ?? false);
const canManageScheduling = computed(() => permissionCodes.value?.includes('scheduling.manage') ?? false);
const professionalColumns = computed(() => [
  { id: 'unassigned', label: 'Sem profissional' },
  ...(overview.value?.professionals ?? []).map((professional) => ({
    id: professional.id,
    label: professional.fullName
  }))
]);
const columnCount = computed(() => professionalColumns.value.length);
const summaryCards = computed(() => {
  const stats = overview.value?.stats;
  const items = overview.value?.items ?? [];
  if (!stats) return [];

  const queueCount = items.filter((item) =>
    ['checked_in', 'called'].includes(item.operational.stage)
  ).length;
  const triageCount = items.filter((item) => item.operational.stage === 'in_triage').length;
  const inCareCount = items.filter((item) =>
    ['in_care', 'observation'].includes(item.operational.stage)
  ).length;

  return [
    { label: 'Total', value: String(stats.total), hint: 'No período visível' },
    { label: 'Fila', value: String(queueCount), hint: 'Check-in e chamada ativas' },
    { label: 'Triagem', value: String(triageCount), hint: 'Em avaliação inicial' },
    { label: 'Atendimento', value: String(inCareCount), hint: 'Em consulta ou observação' },
    { label: 'Conflitos', value: String(stats.conflicts), hint: 'Ajustes pendentes' },
    { label: 'Sem profissional', value: String(stats.unassigned), hint: 'Demandam alocação' }
  ];
});
const periodLabel = computed(() => {
  const base = new Date(`${referenceDate.value}T00:00:00`);
  if (viewMode.value === 'day') {
    return base.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  if (viewMode.value === 'week') {
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    return `${base.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${end.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }
  return base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
});
const visibleDays = computed(() => buildVisibleDays(viewMode.value, referenceDate.value));
const calendarDays = computed(() => buildVisibleDays('month', referenceDate.value));

function buildVisibleDays(mode: 'day' | 'week' | 'month', baseDate: string) {
  const start = new Date(`${baseDate}T00:00:00`);
  const count = mode === 'day' ? 1 : mode === 'week' ? 7 : 31;

  return Array.from({ length: count }).map((_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const date = current.toISOString().slice(0, 10);
    return {
      date,
      label: current.toLocaleDateString('pt-BR', {
        weekday: mode === 'month' ? undefined : 'short',
        day: '2-digit',
        month: '2-digit'
      })
    };
  });
}

function ownerName(ownerId: string) {
  return ownerCache.value[ownerId] || `Tutor ${ownerId.slice(0, 6)}`;
}

function patientName(patientId: string) {
  return patientCache.value[patientId] || `Paciente ${patientId.slice(0, 6)}`;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(status: AppointmentStatus) {
  return {
    scheduled: 'Agendado',
    checked_in: 'Check-in',
    completed: 'Concluído',
    cancelled: 'Cancelado'
  }[status];
}

function operationalLabel(item: SchedulingCockpitAppointmentSummary) {
  return item.operational.label;
}

function appointmentsByDay(date: string) {
  return (overview.value?.items ?? []).filter((item) => item.scheduledAt.slice(0, 10) === date);
}

function appointmentsByColumn(date: string, columnId: string) {
  return appointmentsByDay(date)
    .filter((item) => {
      if (columnId === 'unassigned') return !item.practitionerStaffId;
      return item.practitionerStaffId === columnId;
    })
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

function blocksByColumn(date: string, columnId: string) {
  return (overview.value?.blocks ?? []).filter((block) => {
    if (block.startsAt.slice(0, 10) !== date) return false;
    if (columnId === 'unassigned') return false;
    return block.practitionerStaffId === columnId;
  });
}

function setViewMode(mode: 'day' | 'week' | 'month') {
  viewMode.value = mode;
  void loadOverview();
}

function shiftReferenceDate(direction: -1 | 1) {
  const current = new Date(`${referenceDate.value}T00:00:00`);
  const delta = viewMode.value === 'month' ? 31 : viewMode.value === 'week' ? 7 : 1;
  current.setDate(current.getDate() + direction * delta);
  referenceDate.value = current.toISOString().slice(0, 10);
  void loadOverview();
}

function jumpToToday() {
  referenceDate.value = new Date().toISOString().slice(0, 10);
  void loadOverview();
}

function toggleStatus(status: AppointmentStatus) {
  if (selectedStatuses.value.includes(status)) {
    selectedStatuses.value = selectedStatuses.value.filter((item) => item !== status);
  } else {
    selectedStatuses.value = [...selectedStatuses.value, status];
  }
  void loadOverview();
}

function resetFilters() {
  filters.value = {
    practitionerStaffId: '',
    serviceId: '',
    unit: '',
    specialty: '',
    search: ''
  };
  selectedStatuses.value = [];
  void loadOverview();
}

async function loadReferenceData(items: SchedulingCockpitAppointmentSummary[]) {
  const ownerIds = [...new Set(items.map((item) => item.ownerId))];
  const patientIds = [...new Set(items.map((item) => item.patientId))];

  await Promise.all([
    Promise.all(
      ownerIds.map(async (ownerId) => {
        if (!ownerCache.value[ownerId]) {
          try {
            ownerCache.value[ownerId] = (await ownerService.getById(ownerId)).fullName;
          } catch {
            ownerCache.value[ownerId] = `Tutor ${ownerId.slice(0, 6)}`;
          }
        }
      })
    ),
    Promise.all(
      patientIds.map(async (patientId) => {
        if (!patientCache.value[patientId]) {
          try {
            patientCache.value[patientId] = (await patientService.getById(patientId)).name;
          } catch {
            patientCache.value[patientId] = `Paciente ${patientId.slice(0, 6)}`;
          }
        }
      })
    )
  ]);
}

async function loadOverview() {
  if (!canReadScheduling.value) return;

  loading.value = true;
  error.value = '';

  try {
    const [overviewResponse, servicesResponse] = await Promise.all([
      getSchedulingOverview({
        viewMode: viewMode.value,
        referenceDate: `${referenceDate.value}T00:00:00.000Z`,
        statuses: selectedStatuses.value,
        practitionerStaffId: filters.value.practitionerStaffId || undefined,
        serviceId: filters.value.serviceId || undefined,
        unit: filters.value.unit || undefined,
        specialty: filters.value.specialty || undefined,
        search: filters.value.search.trim() || undefined
      }),
      servicesService.list().catch(() => [])
    ]);

    overview.value = overviewResponse;
    services.value = servicesResponse;
    await loadReferenceData(overviewResponse.items);
  } catch (loadError) {
    if (loadError instanceof ApiError && loadError.status === 403) {
      permissionCodes.value = [];
      return;
    }
    error.value = loadError instanceof Error ? loadError.message : 'Erro ao carregar agenda premium';
  } finally {
    loading.value = false;
  }
}

function goToDetail(appointmentId: string) {
  router.push(`/appointments/${appointmentId}`);
}

function canCheckIn(item: SchedulingCockpitAppointmentSummary) {
  return item.operational.stage === 'scheduled' && canManageScheduling.value;
}

function canMarkNoShow(item: SchedulingCockpitAppointmentSummary) {
  return item.operational.stage === 'scheduled' && canManageScheduling.value;
}

function shouldShowQueueAction(item: SchedulingCockpitAppointmentSummary) {
  return ['checked_in', 'called'].includes(item.operational.stage);
}

function shouldShowEncounterAction(item: SchedulingCockpitAppointmentSummary) {
  return Boolean(item.operational.encounterId);
}

function encounterActionLabel(item: SchedulingCockpitAppointmentSummary) {
  return item.operational.stage === 'completed' ? 'Ver atendimento' : 'Atendimento';
}

function openEncounter(item: SchedulingCockpitAppointmentSummary) {
  if (!item.operational.encounterId) {
    return;
  }
  router.push(`/encounters/${item.operational.encounterId}`);
}

async function checkIn(item: SchedulingCockpitAppointmentSummary) {
  actionLoadingId.value = item.id;
  actionKind.value = 'checkin';
  error.value = '';

  try {
    await checkInQueue({
      appointmentId: item.id,
      patientId: item.patientId,
      ownerId: item.ownerId,
      reason: item.reason,
      priority: 'medium'
    });
    await loadOverview();
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao realizar check-in';
  } finally {
    actionLoadingId.value = '';
    actionKind.value = '';
  }
}

async function markNoShow(item: SchedulingCockpitAppointmentSummary) {
  actionLoadingId.value = item.id;
  actionKind.value = 'noshow';
  error.value = '';

  try {
    await appointmentService.cancel(item.id, 'No-show registrado pela agenda premium');
    await loadOverview();
  } catch (actionError) {
    error.value = actionError instanceof Error ? actionError.message : 'Erro ao registrar no-show';
  } finally {
    actionLoadingId.value = '';
    actionKind.value = '';
  }
}

function handleCreated(appointment: AppointmentSummary) {
  showQuickCreate.value = false;
  void loadOverview();
  router.push(`/appointments/${appointment.id}`);
}

onMounted(async () => {
  try {
    const session = await apiRequest<SessionAccessResponse>('/auth/session');
    permissionCodes.value = session.access?.permissionCodes ?? [];
  } catch {
    permissionCodes.value = [];
  }

  if (canReadScheduling.value) {
    await loadOverview();
  }
});
</script>

<style scoped>
.appointments-cockpit {
  max-width: 1480px;
}

.appointments-cockpit__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 16px 0;
}

.metric-card {
  display: grid;
  gap: 6px;
}

.metric-card__label {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted, #64748b);
}

.metric-card__value {
  font-size: 28px;
  color: var(--color-text, #0f172a);
}

.metric-card__hint {
  color: var(--color-text-secondary, #475569);
}

.appointments-cockpit__layout {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.appointments-cockpit__sidebar {
  position: sticky;
  top: 24px;
}

.sidebar-stack {
  display: grid;
  gap: 14px;
}

.view-toggle {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.view-toggle__button {
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #fff);
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
}

.view-toggle__button--active {
  border-color: rgba(37, 99, 235, 0.3);
  background: rgba(37, 99, 235, 0.08);
  color: #1d4ed8;
}

.status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.status-chip {
  border: 1px solid var(--color-border, #cbd5e1);
  background: var(--color-surface, #fff);
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
}

.status-chip--active {
  background: rgba(14, 165, 233, 0.08);
  border-color: rgba(14, 165, 233, 0.3);
  color: #0369a1;
}

.sidebar-actions,
.board-toolbar,
.board-toolbar__group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.board-toolbar {
  justify-content: space-between;
  margin-bottom: 16px;
}

.day-board {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.day-board__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-grid {
  display: grid;
  gap: 12px;
  overflow-x: auto;
}

.timeline-column {
  min-width: 0;
}

.timeline-column__title {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.timeline-blocks,
.timeline-items {
  display: grid;
  gap: 10px;
}

.timeline-block {
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  padding: 10px 12px;
  font-size: 12px;
}

.timeline-item {
  display: grid;
  gap: 8px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-border, #dbe2ea);
  border-left: 4px solid transparent;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  padding: 14px;
  cursor: pointer;
}

.timeline-item--scheduled {
  border-left-color: #2563eb;
}

.timeline-item--checked_in {
  border-left-color: #f59e0b;
}

.timeline-item--called {
  border-left-color: #ea580c;
}

.timeline-item--in_triage {
  border-left-color: #f59e0b;
}

.timeline-item--in_care {
  border-left-color: #0f766e;
}

.timeline-item--observation {
  border-left-color: #0284c7;
}

.timeline-item--completed {
  border-left-color: #16a34a;
}

.timeline-item--cancelled {
  border-left-color: #ef4444;
  opacity: 0.72;
}

.timeline-item__head,
.timeline-item__actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.status-pill {
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.06);
  padding: 4px 8px;
  font-size: 11px;
  text-transform: uppercase;
}

.status-pill--checked_in,
.status-pill--called,
.status-pill--in_triage {
  background: rgba(245, 158, 11, 0.14);
  color: #92400e;
}

.status-pill--in_care,
.status-pill--completed {
  background: rgba(22, 163, 74, 0.12);
  color: #166534;
}

.status-pill--observation {
  background: rgba(2, 132, 199, 0.12);
  color: #0c4a6e;
}

.status-pill--cancelled {
  background: rgba(239, 68, 68, 0.12);
  color: #991b1b;
}

.timeline-item__meta {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.timeline-item__conflicts {
  display: grid;
  gap: 4px;
  color: #b45309;
  font-size: 12px;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.month-cell {
  min-height: 180px;
}

.month-cell__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.month-cell__body {
  display: grid;
  gap: 8px;
}

.month-item {
  display: grid;
  gap: 2px;
  border: 1px solid var(--color-border, #dbe2ea);
  border-radius: 12px;
  background: #fff;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
}

.month-item__more {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

@media (max-width: 1120px) {
  .appointments-cockpit__layout {
    grid-template-columns: 1fr;
  }

  .appointments-cockpit__sidebar {
    position: static;
  }

  .board-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
