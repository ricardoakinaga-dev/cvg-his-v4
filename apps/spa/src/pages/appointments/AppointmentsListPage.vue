<template>
  <div class="appointments-cockpit">
    <AppPageHeader>
      <template #title>📅 Agenda</template>
      <template #subtitle>
        Atendimento &gt; Agenda. Cockpit multiprofissional com mini calendário lateral, filtros
        operacionais e visões de mês, semana e dia alinhadas ao fluxo ambulatorial.
      </template>
      <template #actions>
        <DsButton variant="secondary" :loading="loading" @click="loadOverview">Atualizar</DsButton>
        <DsButton variant="secondary" tag="a" href="/queue">Fila operacional</DsButton>
        <DsButton
          v-if="canManageScheduling"
          variant="primary"
          class="agenda-cta"
          @click="openCreateFlow"
        >
          + Criar agendamento
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
          <DsCard title="Filtro e contexto" class="sidebar-card">
            <div class="sidebar-stack">
              <section class="mini-calendar">
                <div class="mini-calendar__header">
                  <DsButton variant="ghost" size="sm" @click="shiftMiniCalendar(-1)">◀</DsButton>
                  <strong>{{ miniCalendarLabel }}</strong>
                  <DsButton variant="ghost" size="sm" @click="shiftMiniCalendar(1)">▶</DsButton>
                </div>

                <div class="mini-calendar__weekdays">
                  <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
                </div>

                <div class="mini-calendar__grid">
                  <button
                    v-for="day in miniCalendarDays"
                    :key="day.date"
                    type="button"
                    class="mini-calendar__day"
                    :class="{
                      'mini-calendar__day--muted': !day.inCurrentMonth,
                      'mini-calendar__day--today': day.isToday,
                      'mini-calendar__day--selected': day.date === referenceDate
                    }"
                    @click="selectDate(day.date)"
                  >
                    {{ day.dayNumber }}
                  </button>
                </div>
              </section>

              <DsInput
                id="referenceDate"
                v-model="referenceDate"
                type="date"
                label="Data base"
                @change="loadOverview"
              />

              <DsInput
                id="clientFilter"
                v-model="localFilters.clientSearch"
                type="search"
                label="Cliente/Tutor"
                placeholder="Pesquisar tutor ou paciente"
              />

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
                label="Busca geral"
                placeholder="Tutor, paciente, sala, motivo..."
                @keyup.enter="loadOverview"
              />

              <DsInput
                id="markerFilter"
                v-model="localFilters.marker"
                type="select"
                label="Marcador"
              >
                <option value="">Todos</option>
                <option v-for="marker in markerOptions" :key="marker" :value="marker">
                  {{ marker }}
                </option>
              </DsInput>

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
                <DsButton variant="secondary" @click="resetFilters">Limpar filtros</DsButton>
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
            <div class="board-toolbar__group board-toolbar__group--right">
              <DsButton variant="secondary" @click="jumpToToday">Hoje</DsButton>
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
              <DsButton variant="ghost" tag="a" href="/appointments/new">
                Abrir formulário completo
              </DsButton>
            </div>
          </DsCard>

          <div v-if="loading" class="page-loading">
            <DsSpinner size="md" />
          </div>

          <EmptyState
            v-else-if="!overview || filteredItems.length === 0"
            icon="📅"
            title="Nenhum agendamento no período"
            description="Ajuste filtros, troque a visão ou abra o fluxo de criação para registrar o primeiro compromisso."
          >
            <template v-if="canManageScheduling" #action>
              <DsButton variant="primary" @click="openCreateFlow">+ Criar agendamento</DsButton>
            </template>
          </EmptyState>

          <template v-else-if="viewMode === 'month'">
            <section class="month-board">
              <div class="month-board__weekdays">
                <span v-for="weekday in weekdayLabels" :key="weekday">{{ weekday }}</span>
              </div>
              <div class="month-grid">
                <DsCard
                  v-for="day in monthCalendarDays"
                  :key="day.date"
                  class="month-cell"
                  :class="{
                    'month-cell--muted': !day.inCurrentMonth,
                    'month-cell--selected': day.date === referenceDate
                  }"
                >
                  <button type="button" class="month-cell__header" @click="selectDate(day.date)">
                    <strong>{{ day.dayNumber }}</strong>
                    <span>{{ appointmentsByDay(day.date).length }}</span>
                  </button>
                  <div class="month-cell__body">
                    <button
                      v-for="item in appointmentsByDay(day.date).slice(0, 5)"
                      :key="item.id"
                      type="button"
                      class="month-item"
                      @click="goToDetail(item.id)"
                    >
                      <span>{{ timeLabel(item.scheduledAt) }}</span>
                      <strong>{{ patientName(item.patientId) }}</strong>
                      <small>{{ item.practitionerName || 'Sem profissional' }}</small>
                      <small>{{ operationalLabel(item) }}</small>
                    </button>
                    <span v-if="appointmentsByDay(day.date).length > 5" class="month-item__more">
                      +{{ appointmentsByDay(day.date).length - 5 }} compromissos
                    </span>
                  </div>
                </DsCard>
              </div>
            </section>
          </template>

          <template v-else-if="viewMode === 'week'">
            <section class="week-board">
              <div
                class="time-matrix"
                :style="{ gridTemplateColumns: `88px repeat(${visibleDays.length}, minmax(180px, 1fr))` }"
              >
                <div class="time-matrix__corner">Horário</div>
                <div
                  v-for="day in visibleDays"
                  :key="`${day.date}-header`"
                  class="time-matrix__column-title time-matrix__column-title--day"
                >
                  <strong>{{ day.label }}</strong>
                  <span>{{ appointmentsByDay(day.date).length }}</span>
                </div>

                <template v-for="hour in timelineHours" :key="`week-${hour}`">
                  <div class="time-matrix__hour">{{ formatHour(hour) }}</div>

                  <div
                    v-for="day in visibleDays"
                    :key="`${day.date}-${hour}`"
                    class="time-matrix__slot"
                  >
                    <div v-if="weekBlocksBySlot(day.date, hour).length" class="timeline-blocks">
                      <div
                        v-for="block in weekBlocksBySlot(day.date, hour)"
                        :key="block.id"
                        class="timeline-block"
                      >
                        {{ block.title }}
                      </div>
                    </div>

                    <div v-if="appointmentsByWeekSlot(day.date, hour).length" class="timeline-items">
                      <button
                        v-for="item in appointmentsByWeekSlot(day.date, hour)"
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
                      </button>
                    </div>

                    <span v-else class="time-matrix__empty">Disponível</span>
                  </div>
                </template>
              </div>
            </section>
          </template>

          <template v-else>
            <section v-for="day in visibleDays" :key="day.date" class="day-board">
              <div class="day-board__header">
                <div>
                  <strong>{{ day.label }}</strong>
                  <p>{{ appointmentsByDay(day.date).length }} agendamentos no período</p>
                </div>
                <DsButton
                  v-if="canManageScheduling"
                  variant="ghost"
                  size="sm"
                  @click="selectDate(day.date)"
                >
                  Fixar data
                </DsButton>
              </div>

              <div
                class="time-matrix"
                :style="{ gridTemplateColumns: `88px repeat(${columnCount}, minmax(220px, 1fr))` }"
              >
                <div class="time-matrix__corner">Horário</div>
                <div
                  v-for="column in professionalColumns"
                  :key="`${day.date}-${column.id}-header`"
                  class="time-matrix__column-title"
                >
                  <strong>{{ column.label }}</strong>
                  <span>{{ appointmentsByColumn(day.date, column.id).length }}</span>
                </div>

                <template v-for="hour in timelineHours" :key="`${day.date}-${hour}`">
                  <div class="time-matrix__hour">{{ formatHour(hour) }}</div>

                  <div
                    v-for="column in professionalColumns"
                    :key="`${day.date}-${column.id}-${hour}`"
                    class="time-matrix__slot"
                  >
                    <div v-if="blocksBySlot(day.date, column.id, hour).length" class="timeline-blocks">
                      <div
                        v-for="block in blocksBySlot(day.date, column.id, hour)"
                        :key="block.id"
                        class="timeline-block"
                      >
                        {{ block.title }}
                      </div>
                    </div>

                    <div v-if="appointmentsBySlot(day.date, column.id, hour).length" class="timeline-items">
                      <button
                        v-for="item in appointmentsBySlot(day.date, column.id, hour)"
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
                          Agenda: {{ statusLabel(item.status) }} · {{ item.practitionerName || 'Sem profissional' }}
                        </small>

                        <div v-if="item.conflicts.length" class="timeline-item__conflicts">
                          <span
                            v-for="conflict in item.conflicts.slice(0, 2)"
                            :key="`${item.id}-${conflict.type}-${conflict.startsAt}`"
                          >
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

                    <span v-else class="time-matrix__empty">Disponível</span>
                  </div>
                </template>
              </div>
            </section>
          </template>

          <section v-if="legendItems.length > 0" class="appointments-legend">
            <strong>Legenda operacional</strong>
            <div class="appointments-legend__items">
              <span
                v-for="item in legendItems"
                :key="item.label"
                class="appointments-legend__pill"
                :class="item.kind === 'status' ? `appointments-legend__pill--${item.tone}` : 'appointments-legend__pill--marker'"
              >
                {{ item.label }}
              </span>
            </div>
          </section>
        </section>
      </div>
    </template>

    <AppointmentClientSelectorModal
      :open="showClientSelector"
      @close="showClientSelector = false"
      @selected="handleClientSelected"
    />

    <DsModal
      :open="showQuickCreate"
      title="Criar agendamento"
      size="lg"
      @close="closeQuickCreate"
    >
      <AppointmentQuickCreateForm
        v-if="showQuickCreate"
        submit-label="Salvar e voltar ao cockpit"
        :preset-owner-id="selectedClient?.id ?? ''"
        :hide-owner-selection="Boolean(selectedClient)"
        :lock-owner-selection="Boolean(selectedClient)"
        :restrict-patients-to-owner="Boolean(selectedClient)"
        :owner-snapshot="selectedClient"
        @created="handleCreated"
        @cancel="closeQuickCreate"
      />
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
import AppointmentClientSelectorModal from '@/components/appointments/AppointmentClientSelectorModal.vue';
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
import type { OwnerSummary } from '@/types/owner';

interface SessionAccessResponse {
  access?: {
    permissionCodes?: string[];
  };
}

interface CalendarDayCell {
  date: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
}

const router = useRouter();
const loading = ref(false);
const error = ref('');
const permissionCodes = ref<string[] | null>(null);
const overview = ref<SchedulingOverviewResponse | null>(null);
const services = ref<ServiceSummary[]>([]);
const showClientSelector = ref(false);
const showQuickCreate = ref(false);
const selectedClient = ref<OwnerSummary | null>(null);
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
const localFilters = ref({
  clientSearch: '',
  marker: ''
});
const selectedStatuses = ref<AppointmentStatus[]>([]);
const ownerCache = ref<Record<string, string>>({});
const patientCache = ref<Record<string, string>>({});

const viewOptions = [
  { value: 'month' as const, label: 'Mês' },
  { value: 'week' as const, label: 'Semana' },
  { value: 'day' as const, label: 'Dia' }
];

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const timelineHours = Array.from({ length: 13 }, (_, index) => 7 + index);

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
const filteredItems = computed(() => {
  const clientSearch = normalizeText(localFilters.value.clientSearch);
  const marker = localFilters.value.marker;

  return (overview.value?.items ?? []).filter((item) => {
    if (clientSearch) {
      const haystack = normalizeText(
        `${ownerName(item.ownerId)} ${patientName(item.patientId)} ${item.reason} ${item.practitionerName ?? ''}`
      );
      if (!haystack.includes(clientSearch)) {
        return false;
      }
    }

    if (marker && !deriveMarkers(item).includes(marker)) {
      return false;
    }

    return true;
  });
});
const summaryCards = computed(() => {
  const items = filteredItems.value;
  if (!overview.value) return [];

  const queueCount = items.filter((item) =>
    ['checked_in', 'called'].includes(item.operational.stage)
  ).length;
  const triageCount = items.filter((item) => item.operational.stage === 'in_triage').length;
  const inCareCount = items.filter((item) =>
    ['in_care', 'observation'].includes(item.operational.stage)
  ).length;

  return [
    { label: 'Total', value: String(items.length), hint: 'Carga no período visível' },
    { label: 'Fila', value: String(queueCount), hint: 'Check-in e chamada ativas' },
    { label: 'Triagem', value: String(triageCount), hint: 'Aguardando decisão clínica' },
    { label: 'Atendimento', value: String(inCareCount), hint: 'Consulta ou observação em curso' },
    {
      label: 'Conflitos',
      value: String(items.filter((item) => item.conflicts.length > 0).length),
      hint: 'Demandam ajuste operacional'
    },
    {
      label: 'Sem profissional',
      value: String(items.filter((item) => !item.practitionerStaffId).length),
      hint: 'Precisam de alocação'
    }
  ];
});
const normalizedReferenceDate = computed(() =>
  viewMode.value === 'month' ? startOfMonth(referenceDate.value) : referenceDate.value
);
const periodLabel = computed(() => {
  const base = new Date(`${normalizedReferenceDate.value}T00:00:00`);
  if (viewMode.value === 'day') {
    return base.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  if (viewMode.value === 'week') {
    const end = new Date(base);
    end.setDate(end.getDate() + 6);
    return `${base.toLocaleDateString('pt-BR', { day: '2-digit' })} - ${end.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: '2-digit'
    })}`;
  }
  return base.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
});
const visibleDays = computed(() => buildVisibleDays(viewMode.value, referenceDate.value));
const miniCalendarLabel = computed(() =>
  new Date(`${startOfMonth(referenceDate.value)}T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
);
const miniCalendarDays = computed(() => buildMonthCalendar(referenceDate.value));
const monthCalendarDays = computed(() => buildMonthCalendar(referenceDate.value));
const markerOptions = computed(() =>
  [...new Set((overview.value?.items ?? []).flatMap((item) => deriveMarkers(item)))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )
);
const legendItems = computed(() => {
  const statusLegend = selectedStatuses.value.length
    ? selectedStatuses.value
    : (overview.value?.filterOptions.statuses ?? []);
  const markerLegend = localFilters.value.marker
    ? [localFilters.value.marker]
    : markerOptions.value.slice(0, 6);

  return [
    ...statusLegend.map((status) => ({
      label: statusLabel(status),
      kind: 'status' as const,
      tone: status
    })),
    ...markerLegend.map((marker) => ({
      label: marker,
      kind: 'marker' as const,
      tone: 'marker'
    }))
  ];
});

function startOfMonth(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  date.setDate(1);
  return date.toISOString().slice(0, 10);
}

function buildVisibleDays(mode: 'day' | 'week' | 'month', baseDate: string) {
  const normalizedBase = mode === 'month' ? startOfMonth(baseDate) : baseDate;
  const start = new Date(`${normalizedBase}T00:00:00`);
  const count = mode === 'day' ? 1 : mode === 'week' ? 7 : 31;

  return Array.from({ length: count }).map((_, index) => {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    const date = current.toISOString().slice(0, 10);
    return {
      date,
      label: current.toLocaleDateString('pt-BR', {
        weekday: mode === 'month' ? undefined : 'long',
        day: '2-digit',
        month: '2-digit'
      })
    };
  });
}

function buildMonthCalendar(baseDate: string): CalendarDayCell[] {
  const monthStart = new Date(`${startOfMonth(baseDate)}T00:00:00`);
  const firstVisible = new Date(monthStart);
  firstVisible.setDate(monthStart.getDate() - monthStart.getDay());

  return Array.from({ length: 42 }).map((_, index) => {
    const current = new Date(firstVisible);
    current.setDate(firstVisible.getDate() + index);
    const currentDate = current.toISOString().slice(0, 10);
    const now = new Date().toISOString().slice(0, 10);

    return {
      date: currentDate,
      dayNumber: current.getDate(),
      inCurrentMonth: current.getMonth() === monthStart.getMonth(),
      isToday: currentDate === now
    };
  });
}

function ownerName(ownerId: string) {
  return ownerCache.value[ownerId] || `Tutor ${ownerId.slice(0, 6)}`;
}

function patientName(patientId: string) {
  return patientCache.value[patientId] || `Paciente ${patientId.slice(0, 6)}`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatHour(hour: number) {
  return `${String(hour).padStart(2, '0')}:00`;
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
  return filteredItems.value.filter((item) => item.scheduledAt.slice(0, 10) === date);
}

function appointmentsByColumn(date: string, columnId: string) {
  return appointmentsByDay(date)
    .filter((item) => {
      if (columnId === 'unassigned') return !item.practitionerStaffId;
      return item.practitionerStaffId === columnId;
    })
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

function appointmentsBySlot(date: string, columnId: string, hour: number) {
  return appointmentsByColumn(date, columnId).filter(
    (item) => new Date(item.scheduledAt).getHours() === hour
  );
}

function blocksByColumn(date: string, columnId: string) {
  return (overview.value?.blocks ?? []).filter((block) => {
    if (block.startsAt.slice(0, 10) !== date) return false;
    if (columnId === 'unassigned') return false;
    return block.practitionerStaffId === columnId;
  });
}

function blocksBySlot(date: string, columnId: string, hour: number) {
  return blocksByColumn(date, columnId).filter(
    (block) => new Date(block.startsAt).getHours() === hour
  );
}

function weekBlocksBySlot(date: string, hour: number) {
  return (overview.value?.blocks ?? []).filter(
    (block) => block.startsAt.slice(0, 10) === date && new Date(block.startsAt).getHours() === hour
  );
}

function appointmentsByWeekSlot(date: string, hour: number) {
  return appointmentsByDay(date)
    .filter((item) => new Date(item.scheduledAt).getHours() === hour)
    .sort((left, right) => left.scheduledAt.localeCompare(right.scheduledAt));
}

function deriveMarkers(item: SchedulingCockpitAppointmentSummary) {
  const haystack = normalizeText(
    `${item.reason} ${item.serviceName ?? ''} ${item.specialty ?? ''} ${item.resourceLabel ?? ''}`
  );
  const markers: string[] = [];

  if (item.visitType === 'return') markers.push('Retorno');
  if (haystack.includes('vacin')) markers.push('Vacina');
  if (haystack.includes('verm')) markers.push('Vermífugo');
  if (item.conflicts.length > 0) markers.push('Ajuste operacional');
  if (!item.practitionerStaffId) markers.push('Sem profissional');

  return markers;
}

function setViewMode(mode: 'day' | 'week' | 'month') {
  viewMode.value = mode;
  if (mode === 'month') {
    referenceDate.value = startOfMonth(referenceDate.value);
  }
  void loadOverview();
}

function shiftReferenceDate(direction: -1 | 1) {
  const current = new Date(`${referenceDate.value}T00:00:00`);
  if (viewMode.value === 'month') {
    current.setMonth(current.getMonth() + direction);
    current.setDate(1);
  } else if (viewMode.value === 'week') {
    current.setDate(current.getDate() + direction * 7);
  } else {
    current.setDate(current.getDate() + direction);
  }
  referenceDate.value = current.toISOString().slice(0, 10);
  void loadOverview();
}

function shiftMiniCalendar(direction: -1 | 1) {
  const current = new Date(`${startOfMonth(referenceDate.value)}T00:00:00`);
  current.setMonth(current.getMonth() + direction);
  referenceDate.value = current.toISOString().slice(0, 10);
  void loadOverview();
}

function selectDate(date: string) {
  referenceDate.value = date;
  if (viewMode.value === 'month') {
    viewMode.value = 'day';
  }
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
  localFilters.value = {
    clientSearch: '',
    marker: ''
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
        referenceDate: `${normalizedReferenceDate.value}T00:00:00.000Z`,
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
  if (!item.operational.encounterId) return;
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

function openCreateFlow() {
  selectedClient.value = null;
  showClientSelector.value = true;
}

function handleClientSelected(owner: OwnerSummary) {
  selectedClient.value = owner;
  showClientSelector.value = false;
  showQuickCreate.value = true;
}

function closeQuickCreate() {
  showQuickCreate.value = false;
  selectedClient.value = null;
}

function handleCreated(appointment: AppointmentSummary) {
  closeQuickCreate();
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
  max-width: 1560px;
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

.sidebar-card {
  overflow: hidden;
}

.sidebar-stack {
  display: grid;
  gap: 14px;
}

.mini-calendar {
  display: grid;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.mini-calendar__header,
.mini-calendar__weekdays,
.board-toolbar,
.board-toolbar__group,
.day-board__header,
.timeline-item__head,
.timeline-column__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mini-calendar__header,
.day-board__header,
.timeline-column__title {
  justify-content: space-between;
}

.mini-calendar__weekdays,
.month-board__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  text-align: center;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  text-transform: uppercase;
}

.mini-calendar__grid,
.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.mini-calendar__day {
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.03);
  color: var(--color-text, #0f172a);
  cursor: pointer;
}

.mini-calendar__day--muted {
  opacity: 0.35;
}

.mini-calendar__day--today {
  border-color: rgba(59, 130, 246, 0.35);
}

.mini-calendar__day--selected {
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(249, 115, 22, 0.35);
  color: #c2410c;
  font-weight: 700;
}

.view-toggle {
  display: inline-grid;
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
  border-color: rgba(249, 115, 22, 0.3);
  background: rgba(249, 115, 22, 0.08);
  color: #c2410c;
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

.sidebar-actions {
  display: flex;
  gap: 8px;
}

.board-toolbar {
  justify-content: space-between;
  margin-bottom: 16px;
}

.board-toolbar__group--right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.week-board {
  margin-bottom: 20px;
}

.month-board {
  display: grid;
  gap: 10px;
}

.month-cell {
  min-height: 180px;
  display: grid;
  gap: 10px;
}

.month-cell--muted {
  opacity: 0.5;
}

.month-cell--selected {
  border-color: rgba(249, 115, 22, 0.3);
}

.month-cell__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  background: none;
  border: none;
  padding: 0;
  color: inherit;
  cursor: pointer;
}

.month-cell__body,
.timeline-items,
.timeline-blocks {
  display: grid;
  gap: 8px;
}

.month-item,
.timeline-item {
  display: grid;
  gap: 6px;
  width: 100%;
  text-align: left;
  border: 1px solid var(--color-border, #dbe2ea);
  border-left: 4px solid transparent;
  border-radius: 14px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  padding: 12px;
  cursor: pointer;
}

.month-item__more {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.day-board {
  display: grid;
  gap: 12px;
  margin-bottom: 20px;
}

.day-board__header p {
  margin: 4px 0 0;
  color: var(--color-text-muted, #64748b);
}

.time-matrix {
  display: grid;
  gap: 1px;
  background: rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  overflow: auto;
}

.time-matrix__corner,
.time-matrix__column-title,
.time-matrix__hour,
.time-matrix__slot {
  background: var(--color-surface, #fff);
  padding: 12px;
}

.time-matrix__corner,
.time-matrix__column-title {
  position: sticky;
  top: 0;
  z-index: 1;
}

.time-matrix__corner {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

.time-matrix__column-title {
  display: grid;
  gap: 4px;
}

.time-matrix__column-title--day {
  min-width: 180px;
}

.time-matrix__hour {
  color: var(--color-text-muted, #64748b);
  font-weight: 700;
}

.time-matrix__slot {
  min-height: 126px;
  display: grid;
  align-content: start;
  gap: 8px;
}

.time-matrix__empty {
  color: var(--color-text-muted, #94a3b8);
  font-size: 13px;
}

.timeline-block {
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  padding: 10px 12px;
  font-size: 12px;
}

.timeline-item--scheduled {
  border-left-color: #2563eb;
}

.timeline-item--checked_in,
.timeline-item--called {
  border-left-color: #f59e0b;
}

.timeline-item--in_triage {
  border-left-color: #0ea5e9;
}

.timeline-item--in_care,
.timeline-item--observation {
  border-left-color: #10b981;
}

.timeline-item--completed {
  border-left-color: #16a34a;
}

.timeline-item--cancelled {
  border-left-color: #94a3b8;
}

.status-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
}

.status-pill--scheduled {
  background: rgba(37, 99, 235, 0.1);
  color: #1d4ed8;
}

.status-pill--checked_in,
.status-pill--called {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
}

.status-pill--in_triage {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.status-pill--in_care,
.status-pill--observation {
  background: rgba(16, 185, 129, 0.12);
  color: #047857;
}

.status-pill--completed {
  background: rgba(22, 163, 74, 0.12);
  color: #15803d;
}

.status-pill--cancelled {
  background: rgba(148, 163, 184, 0.12);
  color: #64748b;
}

.timeline-item__meta {
  color: var(--color-text-muted, #64748b);
}

.timeline-item__conflicts {
  display: grid;
  gap: 4px;
  color: #b91c1c;
  font-size: 12px;
}

.timeline-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.appointments-legend {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
}

.appointments-legend__items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.appointments-legend__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid transparent;
}

.appointments-legend__pill--scheduled {
  background: rgba(37, 99, 235, 0.1);
  border-color: rgba(37, 99, 235, 0.18);
  color: #1d4ed8;
}

.appointments-legend__pill--checked_in {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.22);
  color: #b45309;
}

.appointments-legend__pill--completed {
  background: rgba(22, 163, 74, 0.12);
  border-color: rgba(22, 163, 74, 0.2);
  color: #15803d;
}

.appointments-legend__pill--cancelled {
  background: rgba(239, 68, 68, 0.08);
  border-color: rgba(239, 68, 68, 0.18);
  color: #b91c1c;
}

.appointments-legend__pill--marker {
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(249, 115, 22, 0.18);
  color: #c2410c;
}

.agenda-cta {
  box-shadow: 0 12px 24px rgba(249, 115, 22, 0.18);
}

@media (max-width: 1180px) {
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

  .board-toolbar__group--right {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .month-grid {
    grid-template-columns: 1fr;
  }

  .mini-calendar__grid {
    gap: 6px;
  }

  .sidebar-actions {
    flex-direction: column;
  }
}
</style>
