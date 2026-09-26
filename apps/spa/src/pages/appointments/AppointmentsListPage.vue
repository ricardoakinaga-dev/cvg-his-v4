<template>
  <div class="appointments-cockpit">
    <AppPageHeader
      class="app-page-header--agenda"
      title="Agenda"
      subtitle="Grade operacional por data, profissional e status."
      :breadcrumb-items="headerBreadcrumbItems"
      :next-steps="headerNextSteps"
      :primary-action="headerPrimaryAction"
      :secondary-actions="headerSecondaryActions"
      :collapse-secondary-actions-on-mobile="true"
    />

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
      <div class="appointments-cockpit__layout">
        <section class="appointments-cockpit__main">
          <DsCard class="board-toolbar">
            <div class="board-toolbar__group">
              <DsButton variant="secondary" aria-label="Período anterior" @click="shiftReferenceDate(-1)">◀</DsButton>
              <strong>{{ periodLabel }}</strong>
              <DsButton variant="secondary" aria-label="Próximo período" @click="shiftReferenceDate(1)">▶</DsButton>
            </div>
            <div class="board-toolbar__group board-toolbar__group--right">
              <DsButton class="agenda-today-button" variant="secondary" @click="jumpToToday">Hoje</DsButton>
          <DsButton
            class="agenda-filter-toggle"
            variant="secondary"
            :aria-expanded="showFilters"
            aria-controls="agenda-filters"
            @click="showFilters = !showFilters"
          >{{ showFilters ? 'Ocultar filtros' : 'Filtrar agenda' }}</DsButton>

              <div class="view-toggle" role="group" aria-label="Modo da agenda">
                <button
                  v-for="mode in viewOptions"
                  :key="mode.value"
                  type="button"
                  class="view-toggle__button"
                  :class="{ 'view-toggle__button--active': selectedView === mode.value }"
                  :aria-pressed="selectedView === mode.value"
                  @click="setViewMode(mode.value)"
                >
                  {{ mode.label }}
                </button>
              </div>
            </div>
          </DsCard>
        <aside class="appointments-cockpit__sidebar" :class="{ 'appointments-cockpit__sidebar--expanded': showFilters }">
          <DsCard v-show="showFilters" id="agenda-filters" title="Filtrar por..." class="sidebar-card">
            <div class="sidebar-stack">
              <section class="mini-calendar">
                <div class="mini-calendar__header">
                  <DsButton variant="ghost" size="sm" aria-label="Mês anterior" @click="shiftMiniCalendar(-1)">◀</DsButton>
                  <strong>{{ miniCalendarLabel }}</strong>
                  <DsButton variant="ghost" size="sm" aria-label="Próximo mês" @click="shiftMiniCalendar(1)">▶</DsButton>
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
                    :aria-label="`Selecionar ${day.date}`"
                    :aria-current="day.date === referenceDate ? 'date' : undefined"
                    @click="selectDate(day.date)"
                  >
                    {{ day.dayNumber }}
                  </button>
                </div>
              </section>

              <div class="agenda-filter-block">
                <div class="agenda-filter-block__title">Status:</div>
                <div class="status-chips">
                  <button
                    v-for="status in overview?.filterOptions.statuses ?? []"
                    :key="status"
                    type="button"
                    class="status-chip"
                    :class="{ 'status-chip--active': selectedStatuses.includes(status) }"
                    :aria-pressed="selectedStatuses.includes(status)"
                    @click="toggleStatus(status)"
                  >
                    {{ statusLabel(status) }}
                  </button>
                </div>
                <button
                  type="button"
                  class="agenda-filter-block__clear"
                  @click="clearStatusFilters"
                >
                  Limpar filtros
                </button>
              </div>

              <div class="agenda-filter-block">
                <DsInput
                  id="practitionerFilter"
                  v-model="filters.practitionerStaffId"
                  type="select"
                  label="Profissional"
                  @change="loadOverview"
                >
                  <option value="">Pesquisar Profissional</option>
                  <option value="unassigned">Sem profissional</option>
                  <option
                    v-for="professional in overview?.professionals ?? []"
                    :key="professional.id"
                    :value="professional.id"
                  >
                    {{ professional.fullName }}
                  </option>
                </DsInput>
                <button
                  type="button"
                  class="agenda-filter-block__clear"
                  @click="clearPractitionerFilter"
                >
                  Limpar filtros
                </button>
              </div>

              <div class="agenda-filter-block">
                <DsInput
                  id="serviceFilter"
                  v-model="filters.serviceId"
                  type="select"
                  label="Serviço"
                  @change="loadOverview"
                >
                  <option value="">Serviço</option>
                  <option v-for="service in services" :key="service.id" :value="service.id">
                    {{ service.name }}
                  </option>
                </DsInput>
                <button
                  type="button"
                  class="agenda-filter-block__clear"
                  @click="clearServiceFilter"
                >
                  Limpar filtros
                </button>
              </div>

              <div class="agenda-filter-block">
                <DsInput
                  id="clientFilter"
                  v-model="localFilters.clientSearch"
                  type="search"
                  :label="clinicalLabels.tutor.singular"
                  :placeholder="`Pesquisar ${clinicalLabels.tutor.singularLower}`"
                />
                <button type="button" class="agenda-filter-block__clear" @click="clearClientFilter">
                  Limpar filtros
                </button>
              </div>

              <div class="agenda-filter-block">
                <DsInput
                  id="markerFilter"
                  v-model="localFilters.marker"
                  type="select"
                  label="Marcador"
                >
                  <option value="">Marcador</option>
                  <option v-for="marker in markerOptions" :key="marker" :value="marker">
                    {{ marker }}
                  </option>
                </DsInput>
                <button type="button" class="agenda-filter-block__clear" @click="clearMarkerFilter">
                  Limpar filtros
                </button>
              </div>

              <details class="agenda-filter-block agenda-filter-block--advanced">
                <summary>Filtros avançados CVG</summary>

                <DsInput
                  id="unitFilter"
                  v-model="filters.unit"
                  type="select"
                  label="Unidade/Setor"
                  @change="loadOverview"
                >
                  <option value="">Todas</option>
                  <option
                    v-for="unit in overview?.filterOptions.units ?? []"
                    :key="unit"
                    :value="unit"
                  >
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
              </details>

              <div class="sidebar-actions">
                <DsButton variant="primary" @click="loadOverview">Aplicar</DsButton>
                <DsButton variant="secondary" @click="resetFilters">Limpar filtros</DsButton>
              </div>
            </div>
          </DsCard>
        </aside>

          <div v-if="loading" class="page-loading">
            <DsSpinner size="md" />
          </div>

          <EmptyState
            v-else-if="!overview"
            icon="📅"
            title="Agenda indisponível"
            description="Não foi possível carregar a grade operacional da agenda neste momento."
          />

          <template v-else>
            <details
              class="agenda-summary-disclosure"
              :open="agendaSummaryOpen"
              @toggle="handleAgendaSummaryToggle"
            >
              <summary>
                <span>Resumo da grade</span>
                <span class="agenda-summary-disclosure__meta">
                  {{ filteredItems.length }} agendamento(s) · {{ agendaAttentionCount }} alerta(s)
                </span>
              </summary>
              <section class="agenda-grid-summary" aria-label="Resumo da grade da agenda">
                <div>
                  <span>Grade da agenda</span>
                  <strong>{{ periodLabel }}</strong>
                </div>
                <div>
                  <span>Agendados</span>
                  <strong>{{ filteredItems.length }}</strong>
                </div>
                <div>
                  <span>Pendentes</span>
                  <strong>{{ pendingAgendaCount }}</strong>
                </div>
                <div>
                  <span>Sem profissional</span>
                  <strong>{{ unassignedCount }}</strong>
                </div>
                <div>
                  <span>Alertas</span>
                  <strong>{{ agendaAttentionCount }}</strong>
                </div>
                <div>
                  <span>Horários disponíveis</span>
                  <strong>{{ totalAvailableSlots }}</strong>
                </div>
              </section>
            </details>

            <AgendaCalendarOrList
              :selected-view="selectedView"
              :view-mode="viewMode"
              :reference-date="referenceDate"
              :items="filteredItems"
              :blocks="overview?.blocks ?? []"
              :professional-columns="professionalColumns"
              :can-manage-scheduling="canManageScheduling"
              :owner-cache="ownerCache"
              :patient-cache="patientCache"
              :action-loading-id="actionLoadingId"
              :action-kind="actionKind"
              :can-check-in="canCheckIn"
              :can-mark-no-show="canMarkNoShow"
              :should-show-queue-action="shouldShowQueueAction"
              :should-show-encounter-action="shouldShowEncounterAction"
              :encounter-action-label="encounterActionLabel"
              @open-appointment="openAppointmentDetails"
              @create-slot="openSlotCreateFlow"
              @select-date="selectDate"
              @change-view="setViewMode"
              @check-in="checkIn"
              @no-show="markNoShow"
              @open-encounter="openEncounter"
            />
          </template>
        </section>
      </div>
    </template>

    <AppointmentCreateFlow
      :open="showCreateFlow"
      :slot-preset="pendingSlotPreset"
      :professionals="overview?.professionals ?? []"
      @close="closeCreateFlow"
      @created="handleCreated"
    />

    <AppointmentDetailsDrawer
      :appointment="selectedAppointment"
      :owner-name="selectedAppointmentOwnerName"
      :patient-name="selectedAppointmentPatientName"
      :can-cancel="selectedAppointment ? canCancelFromAgenda(selectedAppointment) : false"
      :can-check-in="selectedAppointment ? canCheckIn(selectedAppointment) : false"
      :can-mark-no-show="selectedAppointment ? canMarkNoShow(selectedAppointment) : false"
      :action-loading-id="actionLoadingId"
      :action-kind="actionKind"
      @close="selectedAppointment = null"
      @cancel="cancelAppointmentFromAgenda"
      @check-in="checkIn"
      @no-show="markNoShow"
      @open-encounter="openEncounter"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import './AppointmentsListPage.css';
import {
  buildMonthCalendar,
  buildVisibleDays,
  startOfMonth
} from './appointmentCalendar';
import {
  appointmentNeedsAttention,
  createAgendaGridHelpers,
  deriveMarkers,
  isActiveQueueStage,
  isQueueLinked,
  normalizeText,
  statusLabel
} from './agendaPresentation';
import { useRoute, useRouter } from 'vue-router';
import { agendaContextKey, emptyAgendaContext, isAgendaPath, localCalendarDate, readAgendaContext, writeAgendaQuery, type AgendaContext } from './agendaContext';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsSpinner from '@cvg-his-v2/design-system/vue/DsSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import AppPageHeader, {
  type PageAction,
  type PageBreadcrumb,
  type PageNextStep
} from '@/components/AppPageHeader.vue';
import AgendaCalendarOrList from './AgendaCalendarOrList.vue';
import { createAppointmentActionController } from './appointmentActionController';
import AppointmentCreateFlow from './AppointmentCreateFlow.vue';
import { useAppointmentsOverview } from './useAppointmentsOverview';
import AppointmentDetailsDrawer from '@/components/appointments/AppointmentDetailsDrawer.vue';
import { apiRequest, ApiError } from '@/services/api';
import { appointmentService } from '@/services/appointment';
import { getSchedulingOverview, checkInQueue, noShowQueueEntry } from '@/services/scheduling';
import { ownerService } from '@/services/owner';
import { patientService } from '@/services/patient';
import { servicesService } from '@/services/services';
import { clinicalLabels } from '@/utils/labels';
import type {
  AppointmentStatus,
  AppointmentSummary,
  SchedulingCockpitAppointmentSummary
} from '@/types/appointment';

interface SessionAccessResponse {
  access?: {
    permissionCodes?: string[];
  };
}

interface AppointmentSlotPreset {
  date: string;
  hour?: number;
  practitionerStaffId?: string;
}

const router = useRouter();
const route = useRoute();
const contextMemory = inject(agendaContextKey, { current: null });
const initialContext = readAgendaContext(route.query, contextMemory.current ?? emptyAgendaContext());
let disposed = false;
const error = ref('');
const permissionCodes = ref<string[] | null>(null);
const showCreateFlow = ref(false);
const selectedAppointment = ref<SchedulingCockpitAppointmentSummary | null>(null);
const pendingSlotPreset = ref<AppointmentSlotPreset | null>(null);

const viewMode = ref<'day' | 'week' | 'month'>(initialContext.view === 'list' ? 'day' : initialContext.view);
const selectedView = ref<'list' | 'day' | 'week' | 'month'>(initialContext.view);
const referenceDate = ref(initialContext.date);
const filters = ref({
  practitionerStaffId: initialContext.practitionerStaffId,
  serviceId: initialContext.serviceId,
  unit: initialContext.unit,
  specialty: initialContext.specialty,
  search: initialContext.search
});
const localFilters = ref({
  clientSearch: initialContext.clientSearch,
  marker: initialContext.marker
});
const selectedStatuses = ref<AppointmentStatus[]>(initialContext.statuses);
const selectedAppointmentOwnerName = computed(() =>
  selectedAppointment.value ? ownerName(selectedAppointment.value.ownerId) : ''
);
const selectedAppointmentPatientName = computed(() =>
  selectedAppointment.value ? patientName(selectedAppointment.value.patientId) : ''
);

const viewOptions = [
  { value: 'list' as const, label: 'Lista' },
  { value: 'month' as const, label: 'Mês' },
  { value: 'week' as const, label: 'Semana' },
  { value: 'day' as const, label: 'Dia' }
];

const weekdayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const canReadScheduling = computed(
  () => permissionCodes.value?.includes('scheduling.read') ?? false
);
const canManageScheduling = computed(
  () => permissionCodes.value?.includes('scheduling.manage') ?? false
);
const appointmentsOverview = useAppointmentsOverview({
  canReadScheduling: () => canReadScheduling.value,
  isDisposed: () => disposed,
  getParams: () => ({
    viewMode: viewMode.value,
    referenceDate: `${viewMode.value === 'month' ? startOfMonth(referenceDate.value) : referenceDate.value}T00:00:00.000Z`,
    statuses: [...selectedStatuses.value],
    practitionerStaffId: filters.value.practitionerStaffId || undefined,
    serviceId: filters.value.serviceId || undefined,
    unit: filters.value.unit || undefined,
    specialty: filters.value.specialty || undefined,
    search: filters.value.search.trim() || undefined
  }),
  getSelectedAppointmentId: () => selectedAppointment.value?.id,
  setSelectedAppointment: (appointment) => {
    selectedAppointment.value = appointment;
  },
  isForbiddenError: (candidate) => candidate instanceof ApiError && candidate.status === 403,
  onForbidden: () => {
    permissionCodes.value = [];
  },
  setError: (message) => {
    error.value = message;
  },
  services: {
    getOverview: getSchedulingOverview,
    listServices: () => servicesService.list(),
    getOwner: (ownerId) => ownerService.getById(ownerId),
    getPatient: (patientId) => patientService.getById(patientId)
  }
});
const {
  loading,
  overview,
  services,
  ownerCache,
  patientCache,
  loadOverview: loadOverviewData,
  invalidate: invalidateOverviewData
} = appointmentsOverview;
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
const agendaGrid = createAgendaGridHelpers({
  filteredItems: () => filteredItems.value,
  blocks: () => overview.value?.blocks ?? [],
  professionalColumns: () => professionalColumns.value
});
const { availableSlotsByDay } = agendaGrid;
const activeQueueCount = computed(
  () => filteredItems.value.filter((item) => isActiveQueueStage(item.operational.stage)).length
);
const unassignedCount = computed(
  () => filteredItems.value.filter((item) => !item.practitionerStaffId).length
);
const pendingAgendaCount = computed(
  () => filteredItems.value.filter((item) => item.operational.stage === 'scheduled').length
);
const agendaAttentionCount = computed(
  () => filteredItems.value.filter((item) => appointmentNeedsAttention(item)).length
);

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
    return `${base.toLocaleDateString('pt-BR', { day: '2-digit' })} - ${end.toLocaleDateString(
      'pt-BR',
      {
        day: '2-digit',
        month: 'long',
        year: '2-digit'
      }
    )}`;
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
const totalAvailableSlots = computed(() =>
  visibleDays.value.reduce((total, day) => total + availableSlotsByDay(day.date), 0)
);
const markerOptions = computed(() =>
  [...new Set([...(localFilters.value.marker ? [localFilters.value.marker] : []), ...(overview.value?.items ?? []).flatMap((item) => deriveMarkers(item))])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  )
);

const headerBreadcrumbItems = computed<PageBreadcrumb[]>(() => [
  { key: 'home', label: 'Início', to: '/' },
  { key: 'attendance', label: 'Atendimento' },
  { key: 'appointments', label: 'Agenda', current: true }
]);

const showFilters = ref(false);
const isCompactViewport = ref(false);
const agendaSummaryExpanded = ref(true);
const agendaSummaryOpen = computed(
  () => !isCompactViewport.value || agendaSummaryExpanded.value
);
let compactViewportMediaQuery: MediaQueryList | undefined;

function updateCompactViewport() {
  isCompactViewport.value = compactViewportMediaQuery?.matches ?? false;
  agendaSummaryExpanded.value = !isCompactViewport.value;
}

function handleAgendaSummaryToggle(event: Event) {
  if (isCompactViewport.value) {
    agendaSummaryExpanded.value = (event.currentTarget as HTMLDetailsElement).open;
  }
}

const headerNextSteps = computed<PageNextStep[]>(() => {
  if (!canReadScheduling.value) {
    return [
      {
        key: 'access',
        label: 'Validar acesso',
        description: 'Agenda depende de permissão de leitura'
      }
    ];
  }

  if (canManageScheduling.value && isCompactViewport.value) return [];

  if (activeQueueCount.value > 0) {
    return [
      {
        key: 'queue',
        label: 'Acompanhar check-ins',
        description: `${activeQueueCount.value} item(ns) devem seguir pela Esteira`,
        to: '/queue'
      }
    ];
  }

  return [
    {
      key: 'schedule',
      label: canManageScheduling.value ? 'Criar próximo agendamento' : 'Acompanhar grade',
      description: canManageScheduling.value
        ? 'Agenda organiza a chegada antes da Esteira'
        : 'Confira horários, profissional e status',
      to: canManageScheduling.value ? undefined : '/queue'
    }
  ];
});

const headerPrimaryAction = computed<PageAction | null>(() => {
  if (!canManageScheduling.value) return null;
  return {
    key: 'create',
    label: 'Criar agendamento',
    onClick: openCreateFlow
  };
});

const headerSecondaryActions = computed<PageAction[]>(() => [
  {
    key: 'refresh',
    label: 'Atualizar',
    variant: 'secondary',
    loading: loading.value,
    onClick: () => loadOverview()
  },
  ...(canManageScheduling.value && (activeQueueCount.value === 0 || isCompactViewport.value)
    ? [{
        key: 'queue',
        label: 'Esteira',
        variant: 'secondary' as const,
        to: '/queue'
      }]
    : []),
  ...(canManageScheduling.value
    ? [{
        key: 'full-form',
        label: 'Abrir formulário completo',
        variant: 'secondary' as const,
        to: '/appointments/new'
      }]
    : [])
]);

function ownerName(ownerId: string) {
  return ownerCache.value[ownerId] || `Tutor ${ownerId.slice(0, 6)}`;
}

function patientName(patientId: string) {
  return patientCache.value[patientId] || `Paciente ${patientId.slice(0, 6)}`;
}

function setViewMode(mode: 'list' | 'day' | 'week' | 'month') {
  selectedView.value = mode;
  viewMode.value = mode === 'list' ? 'day' : mode;
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
  referenceDate.value = localCalendarDate(current);
  void loadOverview();
}

function shiftMiniCalendar(direction: -1 | 1) {
  const current = new Date(`${startOfMonth(referenceDate.value)}T00:00:00`);
  current.setMonth(current.getMonth() + direction);
  referenceDate.value = localCalendarDate(current);
  void loadOverview();
}

function selectDate(date: string) {
  referenceDate.value = date;
  if (viewMode.value === 'month') {
    viewMode.value = 'day';
    selectedView.value = 'day';
  }
  void loadOverview();
}

function jumpToToday() {
  referenceDate.value = localCalendarDate();
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

function clearStatusFilters() {
  selectedStatuses.value = [];
  void loadOverview();
}

function clearPractitionerFilter() {
  filters.value.practitionerStaffId = '';
  void loadOverview();
}

function clearServiceFilter() {
  filters.value.serviceId = '';
  void loadOverview();
}

function clearClientFilter() {
  localFilters.value.clientSearch = '';
}

function clearMarkerFilter() {
  localFilters.value.marker = '';
}

function currentAgendaContext(): AgendaContext {
  return {
    date: referenceDate.value,
    view: selectedView.value,
    statuses: [...selectedStatuses.value],
    ...filters.value,
    ...localFilters.value
  };
}

function structuralContext(context: AgendaContext) {
  return JSON.stringify(writeAgendaQuery({}, context));
}

function overviewContext(context: AgendaContext) {
  const { marker: _marker, clientSearch: _clientSearch, ...query } = context;
  return JSON.stringify({ ...query, view: context.view === 'list' ? 'day' : context.view });
}

function rememberAgendaContext(context: AgendaContext) {
  if (disposed || !isAgendaPath(route.path)) return;
  contextMemory.current = context;
  const query = writeAgendaQuery(route.query, context);
  const unchanged = Object.keys(query).length === Object.keys(route.query).length
    && Object.entries(query).every(([key, value]) => JSON.stringify(value) === JSON.stringify(route.query[key]));
  if (!unchanged) void router.replace({ query });
}

watch(currentAgendaContext, rememberAgendaContext, { deep: true });

watch(() => route.query, (query) => {
  if (disposed || !isAgendaPath(route.path)) return;
  const current = currentAgendaContext();
  const next = readAgendaContext(query, current);
  if (structuralContext(next) === structuralContext(current)) return;
  referenceDate.value = next.date;
  selectedView.value = next.view;
  viewMode.value = next.view === 'list' ? 'day' : next.view;
  selectedStatuses.value = next.statuses;
  filters.value = {
    practitionerStaffId: next.practitionerStaffId, serviceId: next.serviceId,
    unit: next.unit, specialty: next.specialty, search: next.search
  };
  localFilters.value = { marker: next.marker, clientSearch: next.clientSearch };
  if (canReadScheduling.value && overviewContext(next) !== overviewContext(current)) void loadOverview();
});

function invalidateOverview() {
  invalidateOverviewData();
  appointmentActionController.invalidate();
  selectedAppointment.value = null;
  error.value = '';
}

watch(canReadScheduling, (allowed) => {
  if (!allowed) invalidateOverview();
}, { flush: 'sync' });

onBeforeUnmount(() => {
  compactViewportMediaQuery?.removeEventListener('change', updateCompactViewport);
  compactViewportMediaQuery = undefined;
  contextMemory.current = currentAgendaContext();
  disposed = true;
  invalidateOverview();
});

async function loadOverview() {
  if (disposed || !canReadScheduling.value) {
    invalidateOverview();
    return;
  }
  await loadOverviewData();
}

const appointmentActionController = createAppointmentActionController({
  canManageScheduling: () => canManageScheduling.value,
  loadOverview,
  setError: (message) => {
    error.value = message;
  },
  services: {
    checkInQueue,
    noShowQueueEntry,
    cancelAppointment: (id, reason) => appointmentService.cancel(id, reason)
  }
});

const {
  actionLoadingId,
  actionKind,
  canCheckIn,
  canCancel: canCancelFromAgenda,
  canMarkNoShow,
  checkIn,
  markNoShow,
  cancel: cancelAppointmentFromAgenda
} = appointmentActionController;

function openAppointmentDetails(item: SchedulingCockpitAppointmentSummary) {
  selectedAppointment.value = item;
}

function shouldShowQueueAction(item: SchedulingCockpitAppointmentSummary) {
  return isQueueLinked(item) || isActiveQueueStage(item.operational.stage);
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

function openCreateFlow() {
  selectedAppointment.value = null;
  pendingSlotPreset.value = null;
  showCreateFlow.value = true;
}

function openSlotCreateFlow(slotPreset: AppointmentSlotPreset) {
  selectedAppointment.value = null;
  pendingSlotPreset.value = slotPreset;
  showCreateFlow.value = true;
}

function closeCreateFlow() {
  showCreateFlow.value = false;
  pendingSlotPreset.value = null;
}

async function handleCreated(appointment: AppointmentSummary) {
  closeCreateFlow();
  await loadOverview();
  selectedAppointment.value =
    overview.value?.items.find((item) => item.id === appointment.id) ?? null;
}

onMounted(async () => {
  if (typeof window.matchMedia === 'function') {
    compactViewportMediaQuery = window.matchMedia('(max-width: 720px)');
    compactViewportMediaQuery.addEventListener('change', updateCompactViewport);
    updateCompactViewport();
  }
  rememberAgendaContext(currentAgendaContext());
  try {
    const session = await apiRequest<SessionAccessResponse>('/auth/session');
    if (disposed) return;
    permissionCodes.value = session.access?.permissionCodes ?? [];
  } catch {
    if (disposed) return;
    permissionCodes.value = [];
  }

  if (canReadScheduling.value) {
    await loadOverview();
  }
});
</script>

<style scoped>
.appointments-cockpit {
  width: 100%;
  max-width: none;
  min-width: 0;
}

.agenda-appointment-list__count { margin: 0 0 8px; color: var(--color-text-secondary); }
.agenda-appointment-list__items { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.agenda-appointment-row {
  width: 100%; display: grid; grid-template-columns: 100px minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 16px; align-items: center; padding: 16px; text-align: left;
  border: 1px solid var(--color-border); border-radius: 8px;
  background: var(--color-surface); color: var(--color-text); font: inherit; cursor: pointer;
}
.agenda-appointment-row:hover { background: var(--color-surface-hover); }
.agenda-appointment-row:focus-visible { outline: 3px solid var(--color-primary-500, #2563eb); outline-offset: 3px; }
.agenda-appointment-row__time, .agenda-appointment-row__identity, .agenda-appointment-row__operation { display: grid; gap: 4px; overflow-wrap: anywhere; }
.agenda-appointment-row__time strong, .agenda-appointment-row__identity strong { font-size: 1.125rem; }
.agenda-appointment-row__details { font-weight: 600; }
.agenda-appointment-row__time { font-variant-numeric: tabular-nums; }
.agenda-appointment-row__alert {
  justify-self: start; padding: 4px 8px; border-inline-start: 3px solid var(--color-warning-600);
  border-radius: 4px; background: var(--color-warning-50); color: var(--color-text); font-weight: 600;
}
.agenda-appointment-row__alert--critical {
  border-inline-start-color: var(--color-danger-600); background: var(--color-danger-50);
}
@media (max-width: 720px) {
  .agenda-appointment-row { grid-template-columns: 86px minmax(0, 1fr); gap: 12px; padding: 12px; }
  .agenda-appointment-row__operation { grid-column: 2; }
  .agenda-appointment-row__details { grid-column: 2; }
  .board-toolbar__group:first-child { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center; }
}

.appointments-cockpit__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  min-width: 0;
}

.appointments-cockpit__main {
  min-width: 0;
}

.appointments-cockpit__sidebar {
  position: static;
  display: grid;
  gap: 12px;
}

.agenda-filter-toggle {
  display: inline-flex;
  justify-self: start;
}

.agenda-create-button {
  width: 100%;
  justify-content: center;
}

.sidebar-card {
  overflow: hidden;
  border: 1px solid rgba(226, 232, 240, 0.86);
  background: linear-gradient(180deg, rgba(250, 251, 253, 0.98), rgba(244, 247, 250, 0.96));
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.05);
}

.sidebar-card :deep(.ds-card__title) {
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
}

.sidebar-card :deep(.ds-card__body) {
  background: transparent;
  padding: 8px;
}

.sidebar-stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
  min-width: 0;
}

.mini-calendar {
  display: grid;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 6px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85);
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

.mini-calendar__grid {
  gap: 2px;
}

.mini-calendar__day {
  min-height: var(--touch-min, 44px);
  border: 1px solid transparent;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.76);
  color: var(--color-text, #0f172a);
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.mini-calendar__day:hover {
  background: rgba(255, 255, 255, 0.96);
  border-color: rgba(191, 219, 254, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(15, 23, 42, 0.06);
}

.mini-calendar__day--muted {
  color: var(--color-text-muted, #55717a);
  font-weight: 400;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  padding: 4px;
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.96);
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.view-toggle__button {
  min-height: var(--touch-min, 44px);
  border: 1px solid transparent;
  background: transparent;
  border-radius: 6px;
  padding: 8px 11px;
  cursor: pointer;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.view-toggle__button:hover {
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-text, #0f172a);
}

.view-toggle__button--active {
  border-color: rgba(249, 115, 22, 0.22);
  background: linear-gradient(180deg, rgba(255, 237, 213, 0.96), rgba(255, 247, 237, 0.92));
  color: #c2410c;
  box-shadow: 0 10px 22px rgba(249, 115, 22, 0.14);
}

.status-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.agenda-filter-block {
  display: grid;
  gap: 10px;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  background: rgba(255, 255, 255, 0.86);
}

.agenda-filter-block__title {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary, #475569);
}

.agenda-filter-block__clear {
  min-height: var(--touch-min, 44px);
  border: 0;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  background: transparent;
  color: var(--color-text-muted, #94a3b8);
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
}

.agenda-filter-block__clear:hover {
  color: #c2410c;
}

.agenda-filter-block--advanced {
  gap: 12px;
}

.agenda-filter-block--advanced summary {
  display: flex;
  min-height: var(--touch-min, 44px);
  align-items: center;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-secondary, #475569);
}

.agenda-filter-block--advanced[open] {
  align-content: start;
}

.status-chip {
  min-height: var(--touch-min, 44px);
  border: 1px solid rgba(203, 213, 225, 0.82);
  background: rgba(255, 255, 255, 0.88);
  padding: 8px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.status-chip:hover {
  background: rgba(255, 255, 255, 0.98);
  border-color: rgba(148, 163, 184, 0.46);
  color: var(--color-text, #0f172a);
}

.status-chip--active {
  background: rgba(14, 165, 233, 0.08);
  border-color: rgba(14, 165, 233, 0.3);
  color: #0369a1;
  transform: translateY(-1px);
}

.sidebar-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.board-toolbar {
  position: sticky;
  top: 20px;
  z-index: 3;
  justify-content: space-between;
  margin-bottom: 12px;
  border: 1px solid rgba(226, 232, 240, 0.88);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
  backdrop-filter: blur(14px);
}

.board-toolbar :deep(.ds-card__body) {
  display: flex; flex-wrap: wrap; width: 100%; align-items: center; justify-content: space-between; gap: 8px; padding: 12px;
}

.board-toolbar__group:first-child strong {
  min-width: 0;
  font-size: 0.95rem;
  line-height: 1.2;
  color: var(--color-text, #0f172a);
  overflow-wrap: anywhere;
}

.board-toolbar__group--right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.agenda-summary-disclosure {
  min-width: 0;
}

.agenda-summary-disclosure > summary {
  display: none;
}

.agenda-grid-summary {
  display: grid;
  grid-template-columns: minmax(180px, 1.35fr) repeat(5, minmax(104px, 0.7fr));
  gap: 8px;
  margin-bottom: 12px;
}

.agenda-grid-summary > div {
  display: grid;
  gap: 4px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.94));
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.04);
}

.agenda-grid-summary span {
  color: var(--color-text-muted, #64748b);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.agenda-grid-summary strong {
  color: var(--color-text, #0f172a);
  font-size: 0.98rem;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.week-board {
  margin-bottom: 20px;
}

.month-board {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.month-grid {
  min-width: 0;
}

.month-cell {
  min-height: 156px;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
}

.month-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.08);
}

.month-cell--muted {
  opacity: 0.58;
}

.month-cell--selected {
  border-color: rgba(249, 115, 22, 0.3);
  box-shadow: 0 16px 30px rgba(249, 115, 22, 0.1);
}

.month-cell :deep(.ds-card__body) {
  min-width: 0;
}

.month-cell__header {
  width: 100%;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  min-height: var(--touch-min, 44px);
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
  gap: 6px;
  min-width: 0;
}

.month-cell__availability {
  min-height: 28px;
  min-width: 0;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(236, 253, 245, 0.9);
  border: 1px solid rgba(16, 185, 129, 0.22);
  color: #047857;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.timeline-items {
  align-content: start;
}

.timeline-slot-summary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(241, 245, 249, 0.96);
  border: 1px solid rgba(203, 213, 225, 0.9);
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.timeline-slot-summary--action,
.month-item__more--action {
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.month-item__more--action {
  border: 0;
  padding: 0;
  background: transparent;
}

.timeline-slot-summary--action:hover,
.timeline-slot-summary--action:focus-visible,
.month-item__more--action:hover,
.month-item__more--action:focus-visible {
  color: var(--color-primary-700, #1d4ed8);
  text-decoration: underline;
}

.month-cell__empty-surface {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  background: linear-gradient(180deg, rgba(248, 250, 252, 0.96), rgba(241, 245, 249, 0.88));
  color: var(--color-text-muted, #64748b);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background 0.18s ease,
    color 0.18s ease,
    transform 0.18s ease;
}

.month-cell__empty-surface:hover {
  border-color: rgba(59, 130, 246, 0.38);
  background: linear-gradient(180deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.88));
  color: var(--color-primary-700, #1d4ed8);
  transform: translateY(-1px);
}

.month-item,
.timeline-item {
  display: grid;
  gap: 5px;
  width: 100%;
  min-width: 0;
  text-align: left;
  border: 1px solid var(--color-border, #dbe2ea);
  border-left: 3px solid transparent;
  border-radius: 8px;
  background: linear-gradient(180deg, #fff, #f8fafc);
  padding: 9px 10px;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease,
    background 0.18s ease;
}

.timeline-item__surface {
  display: grid;
  gap: 5px;
  width: 100%;
  min-width: 0;
  min-height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.timeline-item__surface:focus-visible {
  outline: 3px solid var(--color-primary-500, #2563eb);
  outline-offset: 2px;
  border-radius: 4px;
}

.timeline-item__patient {
  display: block;
  min-height: 44px;
  padding: 6px 0;
  font-weight: 700;
}

.timeline-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 26px rgba(15, 23, 42, 0.08);
  border-color: rgba(191, 219, 254, 0.9);
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(241, 245, 249, 0.96));
}

.month-item__more {
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
}

.month-item__next {
  color: var(--color-text, #0f172a);
  font-weight: 700;
}

.month-create-slot,
.time-matrix__empty-button {
  width: 100%;
  border: 1px dashed rgba(148, 163, 184, 0.45);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.9);
  color: #475569;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    background-color 0.18s ease,
    color 0.18s ease;
}

.month-create-slot {
  box-sizing: border-box;
  max-width: 100%;
  min-width: 0;
  min-height: var(--touch-min, 44px);
  padding: 9px 10px;
  text-align: left;
  line-height: 1.25;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.month-create-slot:hover,
.month-create-slot:focus-visible,
.time-matrix__empty-button:hover,
.time-matrix__empty-button:focus-visible {
  border-color: rgba(249, 115, 22, 0.35);
  background: rgba(255, 237, 213, 0.6);
  color: #c2410c;
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
  border-radius: 8px;
  overflow: auto;
  scrollbar-width: thin;
}

.time-matrix__corner,
.time-matrix__column-title,
.time-matrix__hour,
.time-matrix__slot {
  background: var(--color-surface, #fff);
  padding: 8px;
  min-width: 0;
}

.time-matrix__corner,
.time-matrix__column-title {
  position: sticky;
  top: 0;
  z-index: 1;
}

.time-matrix__corner {
  left: 0;
  z-index: 3;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-muted, #64748b);
}

.time-matrix__column-title {
  display: grid;
  gap: 4px;
  align-content: center;
}

.time-matrix__column-title strong,
.time-matrix__column-title span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-matrix__column-title--day {
  min-width: 150px;
}

.time-matrix__hour {
  position: sticky;
  left: 0;
  z-index: 2;
  color: var(--color-text-muted, #64748b);
  font-size: 12px;
  font-weight: 700;
}

.time-matrix__hour--all-day {
  color: #0f766e;
  background: rgba(240, 253, 250, 0.96);
}

.time-matrix__slot {
  min-height: 106px;
  display: grid;
  align-content: start;
  gap: 8px;
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.time-matrix__slot:hover {
  background: linear-gradient(180deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.94));
  box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.85);
}

.time-matrix__empty {
  color: var(--color-text-muted, #94a3b8);
  font-size: 12px;
}

.time-matrix__empty-button {
  min-height: var(--touch-min, 44px);
  padding: 12px 10px;
  font-size: 12px;
  text-align: left;
}

.time-matrix__slot--all-day {
  min-height: 52px;
  background: rgba(240, 253, 250, 0.55);
}

.time-matrix__empty-button--compact {
  min-height: var(--touch-min, 44px);
  padding: 8px 10px;
}

.timeline-block {
  border-radius: 8px;
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  padding: 8px 10px;
  font-size: 12px;
  overflow-wrap: anywhere;
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

.timeline-item--dense {
  gap: 4px;
  padding: 8px;
  border-radius: 8px;
}

.timeline-item--dense .timeline-item__head {
  gap: 6px;
  align-items: flex-start;
}

.timeline-item--dense .timeline-item__head span:first-child {
  font-size: 11px;
  color: var(--color-text-muted, #64748b);
}

.timeline-item--dense strong {
  font-size: 12px;
  line-height: 1.25;
}

.timeline-item strong,
.timeline-item span,
.timeline-item small,
.month-item strong,
.month-item span,
.month-item small {
  min-width: 0;
  overflow-wrap: anywhere;
}

.timeline-item > strong,
.month-item > strong {
  font-size: 13px;
  line-height: 1.25;
}

.timeline-item > span,
.timeline-item > small,
.month-item > span,
.month-item > small {
  font-size: 11px;
  line-height: 1.25;
  color: var(--color-text-secondary, #475569);
}

.timeline-item__head {
  justify-content: space-between;
  flex-wrap: wrap;
  min-width: 0;
}

.status-pill {
  display: inline-flex;
  max-width: 100%;
  border-radius: 999px;
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  white-space: normal;
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

.timeline-item__ops {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  padding: 7px 8px;
  border-radius: 8px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(248, 250, 252, 0.78);
}

.timeline-item__ops span,
.timeline-item__ops strong {
  min-width: 0;
  font-size: 11px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.timeline-item__ops span {
  color: var(--color-text-secondary, #475569);
}

.timeline-item__ops strong {
  color: var(--color-text, #0f172a);
}

.timeline-item__conflicts {
  display: grid;
  gap: 4px;
  color: #b91c1c;
  font-size: 11px;
  overflow-wrap: anywhere;
}

.timeline-item__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.appointments-legend {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.05);
}

.appointments-legend > strong {
  font-size: 13px;
  line-height: 1.4;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-muted, #64748b);
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

.appointments-legend__pill--time_off {
  background: rgba(226, 232, 240, 0.9);
  border-color: rgba(148, 163, 184, 0.3);
  color: #475569;
}

.appointments-legend__pill--no_show {
  background: rgba(255, 247, 237, 0.92);
  border-color: rgba(251, 146, 60, 0.35);
  color: #c2410c;
  text-decoration: line-through;
}

.appointments-legend__pill--vaccine {
  background: rgba(254, 249, 195, 0.95);
  border-color: rgba(250, 204, 21, 0.45);
  color: #854d0e;
}

.appointments-legend__pill--deworming {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.24);
  color: #4338ca;
}

.appointments-legend__pill--return {
  background: rgba(168, 85, 247, 0.12);
  border-color: rgba(168, 85, 247, 0.24);
  color: #7e22ce;
}

.appointments-legend__pill--marker {
  background: rgba(249, 115, 22, 0.08);
  border-color: rgba(249, 115, 22, 0.18);
  color: #c2410c;
}

.appointments-legend__hint {
  margin: 0;
  color: var(--color-text-secondary, #475569);
  font-size: 12px;
  line-height: 1.45;
}

@media (max-width: 1180px) {
  .appointments-cockpit__layout {
    grid-template-columns: 1fr;
  }

  .appointments-cockpit__sidebar {
    position: static;
  }

  .agenda-filter-toggle { display: inline-flex; }
  .agenda-create-button { display: none; }
  .appointments-cockpit__sidebar:not(.appointments-cockpit__sidebar--expanded) .sidebar-card {
    display: none;
  }

  .board-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .board-toolbar__group--right {
    justify-content: flex-start;
  }

  .agenda-grid-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .agenda-grid-summary > div:first-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .appointments-cockpit__layout {
    gap: 10px;
  }

  .appointments-cockpit__main:has(.agenda-appointment-list) {
    display: flex;
    flex-direction: column;
  }

  .appointments-cockpit__main:has(.agenda-appointment-list) > .board-toolbar {
    order: 1;
  }

  .appointments-cockpit__main:has(.agenda-appointment-list) > .appointments-cockpit__sidebar {
    order: 1;
  }

  .appointments-cockpit__main:has(.agenda-appointment-list) > .agenda-calendar-or-list {
    order: 2;
  }

  .appointments-cockpit__main:has(.agenda-appointment-list) > .agenda-summary-disclosure {
    order: 3;
  }

  :deep(.app-page-header__breadcrumbs),
  :deep(.app-page-header__subtitle) {
    display: none;
  }

  :deep(.agenda-today-button) {
    display: none;
  }

  .agenda-summary-disclosure {
    margin-bottom: 12px;
    border: 1px solid rgba(226, 232, 240, 0.9);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
  }

  .agenda-summary-disclosure > summary {
    display: flex;
    min-height: var(--touch-min, 44px);
    box-sizing: border-box;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 12px;
    color: var(--color-text, #0f172a);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    list-style: none;
  }

  .agenda-summary-disclosure > summary::-webkit-details-marker { display: none; }

  .agenda-summary-disclosure > summary::after {
    flex: 0 0 auto;
    color: var(--color-primary-700, #066b80);
    content: '+';
    font-size: 20px;
    line-height: 1;
  }

  .agenda-summary-disclosure[open] > summary::after { content: '−'; }

  .agenda-summary-disclosure__meta {
    min-width: 0;
    margin-inline-start: auto;
    color: var(--color-text-muted, #55717a);
    font-size: 11px;
    font-weight: 600;
    line-height: 1.3;
    text-align: right;
  }

  .agenda-summary-disclosure .agenda-grid-summary {
    margin: 0;
    padding: 0 8px 8px;
  }

  :deep(.app-page-header__context-item) {
    padding: 8px;
    gap: 5px;
  }

  :deep(.app-page-header__context-item dt) {
    font-size: 10px;
    letter-spacing: 0.02em;
  }

  .agenda-create-button {
    display: none;
  }

  .board-toolbar {
    position: static;
  }

  .board-toolbar :deep(.ds-card__body) { flex-direction: column; align-items: stretch; }

  .board-toolbar,
  .board-toolbar__group,
  .board-toolbar__group--right {
    align-items: stretch;
  }

  .view-toggle {
    width: 100%;
  }

  .month-grid {
    grid-template-columns: 1fr;
  }

  .mini-calendar__grid {
    gap: 2px;
  }

  .sidebar-actions {
    flex-direction: column;
  }

  .time-matrix {
    border-radius: 8px;
  }

  .time-matrix__corner,
  .time-matrix__column-title,
  .time-matrix__hour,
  .time-matrix__slot {
    padding: 7px;
  }

  .time-matrix__slot {
    min-height: 92px;
  }
}

/* Keep the operational board readable when the application switches to the
 * dark surface system. The agenda has intentionally richer status colors than
 * the generic cards, so its semantic accents are mapped explicitly here. */
/*
:global(:root[data-theme='dark']) .appointments-cockpit {
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .sidebar-card,
:global(:root[data-theme='dark']) .appointments-cockpit .mini-calendar,
:global(:root[data-theme='dark']) .appointments-cockpit .agenda-filter-block,
:global(:root[data-theme='dark']) .appointments-cockpit .board-toolbar,
:global(:root[data-theme='dark']) .appointments-cockpit .agenda-grid-summary > div,
:global(:root[data-theme='dark']) .appointments-cockpit .month-cell,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend {
  border-color: var(--color-border);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .mini-calendar {
  background: var(--color-surface-subtle);
}

:global(:root[data-theme='dark']) .appointments-cockpit .mini-calendar__day,
:global(:root[data-theme='dark']) .appointments-cockpit .status-chip,
:global(:root[data-theme='dark']) .appointments-cockpit .view-toggle {
  border-color: var(--color-border);
  background: var(--color-surface-elevated);
  color: var(--color-text-secondary);
}

:global(:root[data-theme='dark']) .appointments-cockpit .mini-calendar__day:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .status-chip:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .view-toggle__button:hover {
  border-color: var(--color-primary-400);
  background: var(--color-surface-hover);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .mini-calendar__day--selected,
:global(:root[data-theme='dark']) .appointments-cockpit .view-toggle__button--active {
  border-color: var(--color-warning-400);
  background: var(--color-warning-50);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-chip--active {
  border-color: var(--color-info-400);
  background: var(--color-info-50);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .agenda-filter-block__clear {
  border-top-color: var(--color-border);
  color: var(--color-text-muted);
}

:global(:root[data-theme='dark']) .appointments-cockpit .agenda-filter-block__clear:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .month-create-slot:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .month-create-slot:focus-visible,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button:focus-visible {
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .agenda-grid-summary > div,
:global(:root[data-theme='dark']) .appointments-cockpit .month-cell,
:global(:root[data-theme='dark']) .appointments-cockpit .month-item,
:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend {
  border-color: var(--color-border);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-cell__availability {
  border-color: var(--color-success-400);
  background: var(--color-success-50);
  color: var(--pulse-mint);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-slot-summary,
:global(:root[data-theme='dark']) .appointments-cockpit .month-cell__empty-surface,
:global(:root[data-theme='dark']) .appointments-cockpit .month-create-slot,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button {
  border-color: var(--color-border);
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-cell__empty-surface:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .month-cell__empty-surface:focus-visible {
  border-color: var(--color-primary-400);
  background: var(--color-primary-subtle);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-item,
:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item {
  background: var(--color-surface-elevated);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-item:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item:hover {
  border-color: var(--color-primary-400);
  background: var(--color-surface-hover);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-item__next,
:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__ops strong {
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .month-create-slot:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .month-create-slot:focus-visible,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button:hover,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__empty-button:focus-visible {
  border-color: var(--color-warning-400);
  background: var(--color-warning-50);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix {
  background: var(--color-border-subtle);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__corner,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__column-title,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__hour,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__slot {
  background: var(--color-surface);
  color: var(--color-text);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__slot:hover {
  background: var(--color-surface-hover);
  box-shadow: inset 0 0 0 1px var(--color-border);
}

:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__hour--all-day,
:global(:root[data-theme='dark']) .appointments-cockpit .time-matrix__slot--all-day {
  background: var(--color-success-50);
  color: var(--pulse-mint);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-block {
  background: var(--color-warning-50);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__ops {
  border-color: var(--color-border);
  background: var(--color-surface-subtle);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__ops span {
  color: var(--color-text-secondary);
}

:global(:root[data-theme='dark']) .appointments-cockpit .timeline-item__conflicts {
  color: var(--pulse-coral);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--scheduled,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--scheduled {
  background: var(--color-primary-50);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--checked_in,
:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--called,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--checked_in {
  background: var(--color-warning-50);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--in_triage {
  background: var(--color-info-50);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--in_care,
:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--observation,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--completed {
  background: var(--color-success-50);
  color: var(--pulse-mint);
}

:global(:root[data-theme='dark']) .appointments-cockpit .status-pill--cancelled,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--time_off {
  background: var(--color-neutral-100);
  color: var(--pulse-muted-strong);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--cancelled {
  background: var(--color-danger-50);
  border-color: var(--color-danger-400);
  color: var(--pulse-coral);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--no_show,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--marker {
  background: var(--color-warning-50);
  border-color: var(--color-warning-400);
  color: var(--pulse-sand);
}

:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--vaccine,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--deworming,
:global(:root[data-theme='dark']) .appointments-cockpit .appointments-legend__pill--return {
  background: var(--color-primary-50);
  border-color: var(--color-primary-400);
  color: var(--pulse-cyan-strong);
}

:global(:root[data-theme='dark']) {
  background: var(--color-bg);
  border-color: initial;
  color: var(--color-text);
  box-shadow: none;
}
*/
</style>
