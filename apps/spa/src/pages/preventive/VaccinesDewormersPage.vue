<template>
  <div class="preventive-page">
    <AppPageHeader
      :breadcrumbs="['Atendimento', 'Vacinas e Vermífugos']"
      title="Vacinas e Vermífugos"
      subtitle="Agenda preventiva por cliente, animal, data, execução e aviso ao tutor."
    >
      <template #actions>
        <DsButton variant="primary" @click="openScheduleModal()">Agendar Vacina ou Vermífugo</DsButton>
        <DsButton variant="secondary" @click="sendBulkEmail">Enviar Email de Aviso</DsButton>
      </template>
    </AppPageHeader>

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
        <label class="filters-grid__check">
          <input v-model="draftFilters.includeExecuted" type="checkbox" />
          <span>Pesquisar aplicações executadas</span>
        </label>
        <div class="filters-grid__actions">
          <DsButton variant="secondary" type="button" @click="clearFilters">Todos</DsButton>
          <DsButton variant="primary" type="submit">Pesquisar</DsButton>
        </div>
      </form>
    </DsCard>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      empty-icon="💉"
      empty-title="Nenhuma vacina nem vermífugo encontrado."
      empty-description="Agende uma vacina ou vermífugo para acompanhar prevenção, execução e avisos."
      variant="hoverable"
    >
      <template #emptyAction>
        <DsButton variant="primary" @click="openScheduleModal()">Agendar Vacina ou Vermífugo</DsButton>
      </template>
      <template #cell-date="{ row }">
        {{ formatDate((row as PreventiveEvent).date) }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel((row as PreventiveEvent).status)"
          :variant="(row as PreventiveEvent).status === 'executed' ? 'success' : 'warning'"
          size="sm"
        />
      </template>
      <template #cell-execute="{ row }">
        <DsButton
          size="sm"
          :variant="(row as PreventiveEvent).status === 'executed' ? 'secondary' : 'success'"
          :disabled="(row as PreventiveEvent).status === 'executed'"
          @click="openExecuteModal(row as PreventiveEvent)"
        >
          {{ (row as PreventiveEvent).status === 'executed' ? 'Baixado' : 'Executar' }}
        </DsButton>
      </template>
      <template #cell-open="{ row }">
        <DsButton size="sm" variant="secondary" @click="openScheduleModal(row as PreventiveEvent)">
          Abrir
        </DsButton>
      </template>
      <template #cell-email="{ row }">
        <DsButton size="sm" variant="secondary" @click="sendEmail(row as PreventiveEvent)">Email</DsButton>
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
        <DsInput v-model="scheduleForm.client" label="Cliente" placeholder="Cliente" />
        <DsInput v-model="scheduleForm.animal" label="Animal" placeholder="Não Definido" />
        <DsInput v-model="scheduleForm.description" label="Vacina/Vermífugo" placeholder="V10, antirrábica..." />
        <DsInput v-model="scheduleForm.date" type="date" label="Data" />
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
        <DsButton variant="primary" :disabled="!canSaveSchedule" @click="saveSchedule">Salvar</DsButton>
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
        <DsInput v-model="executeForm.rescheduleTo" type="date" label="Reagendar para" />
      </div>
      <template #footer>
        <DsButton variant="secondary" @click="closeExecuteModal">Cancelar</DsButton>
        <DsButton variant="success" :disabled="!selectedEvent" @click="executeSelectedEvent">Baixar</DsButton>
      </template>
    </DsModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsCard from '@cvg-his-v2/design-system/vue/DsCard.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsModal from '@cvg-his-v2/design-system/vue/DsModal.vue';

type PreventiveStatus = 'scheduled' | 'executed';

interface PreventiveEvent {
  id: string;
  client: string;
  animal: string;
  date: string;
  description: string;
  status: PreventiveStatus;
  observation: string;
}

interface PreventiveFilters {
  dateFrom: string;
  dateTo: string;
  client: string;
  animal: string;
  includeExecuted: boolean;
}

const columns: DataTableColumn[] = [
  { key: 'client', label: 'Cliente' },
  { key: 'animal', label: 'Animal' },
  { key: 'date', label: 'Data' },
  { key: 'description', label: 'Descrição' },
  { key: 'status', label: 'Status' },
  { key: 'execute', label: 'Executar', class: 'table__actions-col' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' },
  { key: 'email', label: 'Email', class: 'table__actions-col' }
];

const defaultFilters = (): PreventiveFilters => ({
  dateFrom: '2026-04-01',
  dateTo: '2026-04-30',
  client: '',
  animal: '',
  includeExecuted: false
});

const rows = ref<PreventiveEvent[]>([
  {
    id: 'prev-1',
    client: 'Maria Silva',
    animal: 'Rex',
    date: '2026-04-24',
    description: 'Vacina V10 - reforço anual',
    status: 'scheduled',
    observation: 'Avisar tutor com 3 dias de antecedência.'
  },
  {
    id: 'prev-2',
    client: 'João Costa',
    animal: 'Mimi',
    date: '2026-04-28',
    description: 'Vermífugo amplo espectro',
    status: 'scheduled',
    observation: 'Repetir conforme peso atualizado.'
  },
  {
    id: 'prev-3',
    client: 'Carla Nogueira',
    animal: 'Nina',
    date: '2026-04-12',
    description: 'Antirrábica',
    status: 'executed',
    observation: 'Aplicada sem intercorrências.'
  }
]);
const draftFilters = ref<PreventiveFilters>(defaultFilters());
const appliedFilters = ref<PreventiveFilters>(defaultFilters());
const notice = ref<{ variant: 'success' | 'danger'; message: string } | null>(null);
const scheduleModalOpen = ref(false);
const executeModalOpen = ref(false);
const selectedEvent = ref<PreventiveEvent | null>(null);
const scheduleForm = ref({
  client: '',
  animal: 'Não Definido',
  description: '',
  date: '2026-04-24',
  observation: ''
});
const executeForm = ref({
  observation: '',
  rescheduleTo: ''
});

const filteredRows = computed(() => {
  const filters = appliedFilters.value;
  const client = normalize(filters.client);
  const animal = normalize(filters.animal);
  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;

  return rows.value.filter((row) => {
    const rowTime = new Date(`${row.date}T12:00:00`).getTime();
    if (rowTime < dateFrom || rowTime > dateTo) return false;
    if (!filters.includeExecuted && row.status === 'executed') return false;
    if (client && !normalize(row.client).includes(client)) return false;
    if (animal && !normalize(row.animal).includes(animal)) return false;
    return true;
  });
});

const canSaveSchedule = computed(() => {
  return Boolean(
    scheduleForm.value.client.trim() &&
      scheduleForm.value.animal.trim() &&
      scheduleForm.value.description.trim() &&
      scheduleForm.value.date
  );
});

function applyFilters() {
  appliedFilters.value = { ...draftFilters.value };
}

function clearFilters() {
  draftFilters.value = defaultFilters();
  appliedFilters.value = defaultFilters();
}

function openScheduleModal(event?: PreventiveEvent) {
  selectedEvent.value = event ?? null;
  scheduleForm.value = event
    ? {
        client: event.client,
        animal: event.animal,
        description: event.description,
        date: event.date,
        observation: event.observation
      }
    : {
        client: '',
        animal: 'Não Definido',
        description: '',
        date: '2026-04-24',
        observation: ''
      };
  scheduleModalOpen.value = true;
}

function closeScheduleModal() {
  scheduleModalOpen.value = false;
  selectedEvent.value = null;
}

function saveSchedule() {
  if (!canSaveSchedule.value) return;
  const payload = {
    client: scheduleForm.value.client.trim(),
    animal: scheduleForm.value.animal.trim(),
    description: scheduleForm.value.description.trim(),
    date: scheduleForm.value.date,
    observation: scheduleForm.value.observation.trim()
  };

  if (selectedEvent.value) {
    rows.value = rows.value.map((row) =>
      row.id === selectedEvent.value?.id ? { ...row, ...payload } : row
    );
    notice.value = { variant: 'success', message: 'Agendamento atualizado.' };
  } else {
    rows.value = [
      {
        id: `prev-${Date.now()}`,
        status: 'scheduled',
        ...payload
      },
      ...rows.value
    ];
    notice.value = { variant: 'success', message: 'Vacina ou vermífugo agendado.' };
  }

  closeScheduleModal();
}

function deleteSelectedEvent() {
  if (!selectedEvent.value) return;
  rows.value = rows.value.filter((row) => row.id !== selectedEvent.value?.id);
  notice.value = { variant: 'success', message: 'Registro excluído.' };
  closeScheduleModal();
}

function openExecuteModal(event: PreventiveEvent) {
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

function executeSelectedEvent() {
  if (!selectedEvent.value) return;
  const current = selectedEvent.value;
  rows.value = rows.value.map((row) =>
    row.id === current.id
      ? {
          ...row,
          status: 'executed',
          observation: executeForm.value.observation.trim() || row.observation
        }
      : row
  );

  if (executeForm.value.rescheduleTo) {
    rows.value = [
      {
        ...current,
        id: `prev-${Date.now()}`,
        date: executeForm.value.rescheduleTo,
        status: 'scheduled',
        observation: 'Reagendado após baixa.'
      },
      ...rows.value
    ];
  }

  notice.value = { variant: 'success', message: 'Aplicação baixada e rotina preventiva atualizada.' };
  closeExecuteModal();
}

function sendEmail(event: PreventiveEvent) {
  notice.value = { variant: 'success', message: `Email de aviso preparado para ${event.client}.` };
}

function sendBulkEmail() {
  notice.value = { variant: 'success', message: 'Emails de aviso preparados para os registros filtrados.' };
}

function statusLabel(status: PreventiveStatus): string {
  return status === 'executed' ? 'Executada' : 'Agendada';
}

function formatDate(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
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

.modal-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 1fr));
  gap: 12px;
}

.modal-grid__wide {
  grid-column: 1 / -1;
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
