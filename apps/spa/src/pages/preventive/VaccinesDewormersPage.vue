<template>
  <div class="preventive-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Vacinas e Vermífugos']"
      title="Vacinas e Vermífugos"
      subtitle="Agenda preventiva por cliente, animal, data, execução e aviso ao tutor.">
      <template #actions>
        <DsButton variant="primary" @click="openScheduleModal()">Agendar Vacina ou Vermífugo</DsButton>
        <DsButton variant="secondary" :loading="emailLoading" @click="sendBulkEmail">Enviar Email de Aviso</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>
    <DsAlert v-if="notice" :variant="notice.variant" dismissible @dismiss="notice = null">
      {{ notice.message }}
    </DsAlert>

    <DsCard title="Filtrar por...">
      <form class="filters-grid" @submit.prevent="applyFilters">
        <DsInput v-model="draftFilters.dateFrom" type="date" label="Data Inicial" />
        <DsInput v-model="draftFilters.dateTo" type="date" label="Data Final" />
        <DsInput
          v-model="draftFilters.client"
          label="Cliente (branco = Todos)"
          placeholder="Nome, CPF ou ID do cliente"
        />
        <DsInput v-model="draftFilters.animal" label="Animal" placeholder="Nome ou ID do animal" />
        <DsInput v-model="draftFilters.itemType" type="select" label="Tipo">
          <option value="">Todos</option>
          <option v-for="option in preventiveItemTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </DsInput>
        <label class="filters-grid__check">
          <input v-model="draftFilters.includeExecuted" type="checkbox" />
          <span>Pesquisar aplicações executadas</span>
        </label>
        <div class="filters-grid__actions">
          <DsButton variant="secondary" type="button" @click="clearFilters">Todos</DsButton>
          <DsButton variant="primary" type="submit" :loading="loading">Pesquisar</DsButton>
        </div>
      </form>
    </DsCard>

    <section class="quick-filters" aria-label="Filtros rápidos">
      <span class="quick-filters__label">Filtros rápidos</span>
      <DsButton
        v-for="filter in quickFilters"
        :key="filter.value"
        size="sm"
        :variant="activeQuickFilter === filter.value ? 'primary' : 'secondary'"
        type="button"
        @click="activeQuickFilter = filter.value"
      >
        {{ filter.label }}
      </DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="💉"
      empty-title="Nenhuma vacina nem vermífugo encontrado."
      empty-description="Agende uma vacina ou vermífugo para acompanhar prevenção, execução e avisos."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton variant="primary" @click="openScheduleModal()">Agendar Vacina ou Vermífugo</DsButton>
      </template>
      <template #cell-eventDate="{ row }">
        {{ formatDate((row as PreventiveEventSummary).eventDate) }}
      </template>
      <template #cell-itemType="{ row }">
        {{ preventiveItemTypeLabel((row as PreventiveEventSummary).itemType) }}
      </template>
      <template #cell-protocolCode="{ row }">
        {{ (row as PreventiveEventSummary).protocolCode || 'Sem protocolo' }}
      </template>
      <template #cell-lotNumber="{ row }">
        {{ (row as PreventiveEventSummary).lotNumber || 'Sem lote' }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel((row as PreventiveEventSummary).status)"
          :variant="(row as PreventiveEventSummary).status === 'executed' ? 'success' : 'warning'"
          size="sm"
        />
      </template>
      <template #cell-scheduleStatus="{ row }">
        <span
          class="schedule-status"
          :class="`schedule-status--${scheduleStatus(row as PreventiveEventSummary).tone}`"
        >
          {{ scheduleStatus(row as PreventiveEventSummary).label }}
        </span>
      </template>
      <template #cell-links="{ row }">
        <div class="record-links">
          <a
            v-if="(row as PreventiveEventSummary).patientId"
            :href="`/patients/${(row as PreventiveEventSummary).patientId}`"
            class="record-link"
          >
            Abrir paciente
          </a>
          <a
            v-if="(row as PreventiveEventSummary).ownerId"
            :href="`/owners/${(row as PreventiveEventSummary).ownerId}`"
            class="record-link"
          >
            Abrir tutor
          </a>
          <span
            v-if="!(row as PreventiveEventSummary).patientId && !(row as PreventiveEventSummary).ownerId"
            class="record-links__empty"
          >
            Sem vínculo
          </span>
        </div>
      </template>
      <template #cell-reminder="{ row }">
        <span
          class="reminder-status"
          :class="{ 'reminder-status--prepared': (row as PreventiveEventSummary).reminderEmailPreparedAt }"
        >
          {{ reminderLabel(row as PreventiveEventSummary) }}
        </span>
      </template>
      <template #cell-execute="{ row }">
        <DsButton
          size="sm"
          :variant="(row as PreventiveEventSummary).status === 'executed' ? 'secondary' : 'success'"
          :disabled="(row as PreventiveEventSummary).status === 'executed'"
          @click="openExecuteModal(row as PreventiveEventSummary)"
        >
          {{ (row as PreventiveEventSummary).status === 'executed' ? 'Baixado' : 'Executar' }}
        </DsButton>
      </template>
      <template #cell-open="{ row }">
        <DsButton size="sm" variant="secondary" @click="openScheduleModal(row as PreventiveEventSummary)">
          Abrir
        </DsButton>
      </template>
      <template #cell-email="{ row }">
        <DsButton size="sm" variant="secondary" @click="sendEmail(row as PreventiveEventSummary)">Email</DsButton>
      </template>
    </DataTable>

    <DsModal
      :open="scheduleModalOpen"
      :teleport="false"
      title="Agendamento"
      size="lg"
      @close="closeScheduleModal"
    >
      <div class="modal-grid">
        <DsInput v-model="scheduleForm.clientName" label="Cliente" placeholder="Cliente" />
        <DsInput v-model="scheduleForm.animalName" label="Animal" placeholder="Não Definido" />
        <DsInput v-model="scheduleForm.itemType" type="select" label="Tipo">
          <option v-for="option in preventiveItemTypeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </DsInput>
        <DsInput v-model="scheduleForm.eventDate" type="date" label="Data" />
        <DsInput
          v-model="scheduleForm.protocolCode"
          label="Protocolo"
          placeholder="V10, antirrábica..."
        />
        <DsInput v-model="scheduleForm.lotNumber" label="Lote" placeholder="Lote do produto" />
        <DsInput
          v-model="scheduleForm.description"
          class="modal-grid__wide"
          label="Vacina/Vermífugo"
          placeholder="V10, antirrábica..."
        />
        <DsInput
          v-model="scheduleForm.observation"
          class="modal-grid__wide"
          type="textarea"
          label="Observação"
          placeholder="Dose, reforço, lote ou orientação ao tutor"
          :rows="3"
        />
      </div>
      <template #footer>
        <DsButton variant="secondary" @click="closeScheduleModal">Cancelar</DsButton>
        <DsButton variant="danger" :disabled="!selectedEvent" @click="deleteSelectedEvent">Excluir</DsButton>
        <DsButton variant="primary" :disabled="!canSaveSchedule" :loading="saving" @click="saveSchedule">Salvar</DsButton>
      </template>
    </DsModal>

    <DsModal
      :open="executeModalOpen"
      :teleport="false"
      title="Baixar e Reagendar"
      size="md"
      @close="closeExecuteModal"
    >
      <div class="modal-grid">
        <DsInput
          v-model="executeForm.observation"
          label="Observação"
          placeholder="Observação da aplicação"
        />
        <DsInput
          v-model="executeForm.rescheduleTo"
          type="date"
          label="Reagendar para / próxima dose"
        />
      </div>
      <template #footer>
        <DsButton variant="secondary" @click="closeExecuteModal">Cancelar</DsButton>
        <DsButton variant="success" :disabled="!selectedEvent" :loading="saving" @click="executeSelectedEvent">
          Baixar
        </DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  preventiveItemTypeLabel,
  preventiveItemTypeOptions,
  vaccinesDewormersService,
  type PreventiveEventListFilters,
  type PreventiveEventSummary,
  type PreventiveItemType
} from '@/services/vaccinesDewormers';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

type PreventiveStatus = 'scheduled' | 'executed';
type QuickFilter = 'all' | 'overdue' | 'today' | 'next7' | 'withoutReminder';

interface PreventiveFilters {
  dateFrom: string;
  dateTo: string;
  client: string;
  animal: string;
  patientId: string;
  ownerId: string;
  itemType: PreventiveItemType | '';
  includeExecuted: boolean;
}

const route = useRoute();

function queryParam(name: string): string {
  const value = route.query[name];
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

const columns: DataTableColumn[] = [
  { key: 'clientName', label: 'Cliente' },
  { key: 'animalName', label: 'Animal' },
  { key: 'eventDate', label: 'Data' },
  { key: 'itemType', label: 'Tipo' },
  { key: 'protocolCode', label: 'Protocolo' },
  { key: 'lotNumber', label: 'Lote' },
  { key: 'description', label: 'Descrição' },
  { key: 'status', label: 'Status' },
  { key: 'scheduleStatus', label: 'Agenda' },
  { key: 'links', label: 'Vínculo' },
  { key: 'reminder', label: 'Aviso' },
  { key: 'execute', label: 'Executar', class: 'table__actions-col' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' },
  { key: 'email', label: 'Email', class: 'table__actions-col' }
];

const defaultFilters = (): PreventiveFilters => ({
  dateFrom: '',
  dateTo: '',
  client: queryParam('client'),
  animal: queryParam('animal'),
  patientId: queryParam('patientId'),
  ownerId: queryParam('ownerId'),
  itemType: '',
  includeExecuted: false
});

const rows = ref<PreventiveEventSummary[]>([]);
const activeQuickFilter = ref<QuickFilter>('all');
const draftFilters = ref<PreventiveFilters>(defaultFilters());
const appliedFilters = ref<PreventiveFilters>(defaultFilters());
const loading = ref(false);
const saving = ref(false);
const emailLoading = ref(false);
const error = ref('');
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const scheduleModalOpen = ref(false);
const executeModalOpen = ref(false);
const selectedEvent = ref<PreventiveEventSummary | null>(null);
const scheduleForm = ref({
  clientName: '',
  animalName: queryParam('animal') || 'Não Definido',
  itemType: 'vaccine' as PreventiveItemType,
  protocolCode: '',
  lotNumber: '',
  description: '',
  eventDate: toLocalDateInputValue(new Date()),
  observation: ''
});
const executeForm = ref({
  observation: '',
  rescheduleTo: ''
});

const canSaveSchedule = computed(() => {
  return Boolean(
    scheduleForm.value.clientName.trim() &&
      scheduleForm.value.animalName.trim() &&
      scheduleForm.value.description.trim() &&
      scheduleForm.value.eventDate
  );
});

const quickFilters: readonly { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'Todos rápidos' },
  { value: 'overdue', label: 'Vencidos' },
  { value: 'today', label: 'Vence hoje' },
  { value: 'next7', label: 'Próximos 7 dias' },
  { value: 'withoutReminder', label: 'Sem aviso' }
];

const filteredRows = computed(() =>
  rows.value.filter((event) => matchesQuickFilter(event, activeQuickFilter.value))
);

async function loadData(filters: PreventiveFilters = appliedFilters.value) {
  loading.value = true;
  error.value = '';
  try {
    rows.value = await vaccinesDewormersService.list(toServiceFilters(filters));
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar vacinas e vermífugos';
  } finally {
    loading.value = false;
  }
}

async function applyFilters() {
  appliedFilters.value = { ...draftFilters.value };
  activeQuickFilter.value = 'all';
  await loadData(appliedFilters.value);
}

async function clearFilters() {
  draftFilters.value = defaultFilters();
  appliedFilters.value = defaultFilters();
  activeQuickFilter.value = 'all';
  await loadData(appliedFilters.value);
}

function openScheduleModal(event?: PreventiveEventSummary) {
  selectedEvent.value = event ?? null;
  scheduleForm.value = event
    ? {
        clientName: event.clientName,
        animalName: event.animalName,
        itemType: event.itemType,
        protocolCode: event.protocolCode ?? '',
        lotNumber: event.lotNumber ?? '',
        description: event.description,
        eventDate: event.eventDate,
        observation: event.observation ?? ''
      }
    : {
        clientName: '',
        animalName: queryParam('animal') || 'Não Definido',
        itemType: 'vaccine',
        protocolCode: '',
        lotNumber: '',
        description: '',
        eventDate: toLocalDateInputValue(new Date()),
        observation: ''
      };
  scheduleModalOpen.value = true;
}

function closeScheduleModal() {
  scheduleModalOpen.value = false;
  selectedEvent.value = null;
}

async function saveSchedule() {
  if (!canSaveSchedule.value) return;
  saving.value = true;
  error.value = '';
  notice.value = null;
  const payload = {
    clientName: scheduleForm.value.clientName.trim(),
    animalName: scheduleForm.value.animalName.trim(),
    patientId: selectedEvent.value?.patientId ?? (appliedFilters.value.patientId || null),
    ownerId: selectedEvent.value?.ownerId ?? (appliedFilters.value.ownerId || null),
    itemType: scheduleForm.value.itemType,
    protocolCode: scheduleForm.value.protocolCode.trim() || null,
    lotNumber: scheduleForm.value.lotNumber.trim() || null,
    description: scheduleForm.value.description.trim(),
    eventDate: scheduleForm.value.eventDate,
    observation: scheduleForm.value.observation.trim() || null
  };

  try {
    if (selectedEvent.value) {
      await vaccinesDewormersService.update(selectedEvent.value.id, payload);
      notice.value = { variant: 'success', message: 'Agendamento atualizado.' };
    } else {
      await vaccinesDewormersService.create(payload);
      notice.value = { variant: 'success', message: 'Vacina ou vermífugo agendado.' };
    }
    closeScheduleModal();
    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao salvar agendamento';
  } finally {
    saving.value = false;
  }
}

async function deleteSelectedEvent() {
  if (!selectedEvent.value) return;
  saving.value = true;
  error.value = '';
  notice.value = null;
  try {
    await vaccinesDewormersService.delete(selectedEvent.value.id);
    notice.value = { variant: 'success', message: 'Registro excluído.' };
    closeScheduleModal();
    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao excluir registro';
  } finally {
    saving.value = false;
  }
}

function openExecuteModal(event: PreventiveEventSummary) {
  if (event.status === 'executed') return;
  selectedEvent.value = event;
  executeForm.value = {
    observation: '',
    rescheduleTo: ''
  };
  executeModalOpen.value = true;
}

function closeExecuteModal() {
  executeModalOpen.value = false;
  selectedEvent.value = null;
}

async function executeSelectedEvent() {
  if (!selectedEvent.value) return;
  saving.value = true;
  error.value = '';
  notice.value = null;
  try {
    await vaccinesDewormersService.execute(selectedEvent.value.id, {
      observation: executeForm.value.observation.trim() || null,
      rescheduleTo: executeForm.value.rescheduleTo || null
    });
    notice.value = { variant: 'success', message: 'Aplicação baixada e rotina preventiva atualizada.' };
    closeExecuteModal();
    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao baixar aplicação';
  } finally {
    saving.value = false;
  }
}

async function sendEmail(event: PreventiveEventSummary) {
  error.value = '';
  notice.value = null;
  try {
    await vaccinesDewormersService.prepareEmail(event.id);
    notice.value = { variant: 'success', message: `Email de aviso preparado para ${event.clientName}.` };
    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao preparar email de aviso';
  }
}

async function sendBulkEmail() {
  emailLoading.value = true;
  error.value = '';
  notice.value = null;
  try {
    const result = await vaccinesDewormersService.prepareBulkEmail(toServiceFilters(appliedFilters.value));
    notice.value = {
      variant: 'success',
      message: `Emails de aviso preparados para ${result.preparedCount} registro(s).`
    };
    await loadData();
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao preparar emails de aviso';
  } finally {
    emailLoading.value = false;
  }
}

function toServiceFilters(filters: PreventiveFilters): PreventiveEventListFilters {
  return {
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    client: filters.client || undefined,
    animal: filters.animal || undefined,
    patientId: filters.patientId || undefined,
    ownerId: filters.ownerId || undefined,
    itemType: filters.itemType || undefined,
    includeExecuted: filters.includeExecuted
  };
}

function statusLabel(status: PreventiveStatus): string {
  return status === 'executed' ? 'Executada' : 'Agendada';
}

function toLocalDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function scheduleStatus(event: PreventiveEventSummary): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (event.status === 'executed') {
    return {
      label: event.nextDoseDate
        ? `Executada · próxima ${formatDate(event.nextDoseDate)}`
        : event.executedAt
          ? `Executada em ${formatDate(event.executedAt.slice(0, 10))}`
          : 'Executada',
      tone: 'success'
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${event.eventDate}T12:00:00`);
  eventDate.setHours(0, 0, 0, 0);
  const daysUntilEvent = Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);

  if (daysUntilEvent < 0) {
    return { label: `Vencido há ${Math.abs(daysUntilEvent)} dia(s)`, tone: 'danger' };
  }
  if (daysUntilEvent === 0) {
    return { label: 'Vence hoje', tone: 'warning' };
  }
  if (daysUntilEvent <= 7) {
    return { label: `Vence em ${daysUntilEvent} dia(s)`, tone: 'warning' };
  }
  return { label: 'Programado', tone: 'neutral' };
}

function matchesQuickFilter(event: PreventiveEventSummary, filter: QuickFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'withoutReminder') {
    return event.status === 'scheduled' && !event.reminderEmailPreparedAt;
  }

  if (event.status === 'executed') return false;
  const days = daysUntilEvent(event.eventDate);
  if (filter === 'overdue') return days < 0;
  if (filter === 'today') return days === 0;
  return days >= 0 && days <= 7;
}

function daysUntilEvent(eventDateValue: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const eventDate = new Date(`${eventDateValue}T12:00:00`);
  eventDate.setHours(0, 0, 0, 0);
  return Math.round((eventDate.getTime() - today.getTime()) / 86_400_000);
}

function reminderLabel(event: PreventiveEventSummary): string {
  if (event.reminderEmailPreparedAt) {
    return `Aviso preparado em ${formatDate(event.reminderEmailPreparedAt.slice(0, 10))}`;
  }
  return event.status === 'executed' ? 'Sem aviso pendente' : 'Aviso pendente';
}

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

onMounted(() => {
  void loadData();
});
</script>

<style scoped>
.preventive-page {
  display: grid;
  gap: 16px;
}

.filters-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 12px;
  align-items: end;
}

.filters-grid__check {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 600;
}

.filters-grid__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.quick-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.quick-filters__label {
  color: var(--color-text-secondary, #475569);
  font-size: 13px;
  font-weight: 700;
}

.modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
}

.modal-grid__wide {
  grid-column: 1 / -1;
}

.schedule-status,
.reminder-status {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #eef2f7;
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.schedule-status--success,
.reminder-status--prepared {
  background: #dcfce7;
  color: #166534;
}

.schedule-status--warning {
  background: #fef3c7;
  color: #92400e;
}

.schedule-status--danger {
  background: #fee2e2;
  color: #991b1b;
}

.record-links {
  display: grid;
  gap: 3px;
}

.record-link {
  color: #2563eb;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.record-link:hover {
  text-decoration: underline;
}

.record-links__empty {
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

@media (max-width: 960px) {
  .filters-grid,
  .modal-grid {
    grid-template-columns: 1fr;
  }

  .filters-grid__actions {
    justify-content: stretch;
  }
}
</style>
