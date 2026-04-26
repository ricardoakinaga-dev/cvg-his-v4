<template>
  <div class="laboratory-equipment-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Equipamentos']"
      title="Equipamentos"
      subtitle="Cadastro técnico de equipamentos, calibração e manutenção do laboratório"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/laboratory/equipment/new" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo de equipamentos">
      <DsStatCard :label="`${equipment.length} equipamento(s)`" value="" icon="🔧" />
      <DsStatCard :label="`${maintenanceCount} em manutenção`" value="" icon="⚠️" />
      <DsStatCard :label="`${calibrationDueCount} calibração vencida`" value="" icon="📆" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
    </section>

    <section class="filter-panel" aria-label="Filtros de equipamentos">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Código</span>
          <input v-model="draftFilters.id" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Descrição</span>
          <input v-model="draftFilters.description" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Tipo</span>
          <input v-model="draftFilters.type" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Situação</span>
          <select v-model="draftFilters.status">
            <option value="">Todas</option>
            <option value="active">Ativo</option>
            <option value="maintenance">Manutenção</option>
          </select>
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="decoratedEquipment"
      :loading="loading"
      empty-icon="🔧"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo equipamento."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="record-id">{{ shortId((row as EquipmentRow).id) }}</span>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as EquipmentRow).name }}</strong>
      </template>
      <template #cell-lastCalibrationAt="{ row }">
        {{ formatDate((row as EquipmentRow).lastCalibrationAt) }}
      </template>
      <template #cell-calibrationStatus="{ row }">
        <StatusBadge
          :label="(row as EquipmentRow).calibrationStatus"
          :variant="(row as EquipmentRow).calibrationVariant"
          size="sm"
        />
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="(row as EquipmentRow).statusLabel"
          :variant="(row as EquipmentRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/laboratory/equipment/${(row as EquipmentRow).id}`"
          size="sm"
          variant="secondary"
        >
          Abrir
        </DsButton>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import type { DataTableColumn } from '@/components/DataTable.vue';
import {
  laboratoryService,
  type LaboratoryEquipmentSummary
} from '@/services/laboratory';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface EquipmentRow extends LaboratoryEquipmentSummary {
  statusLabel: string;
  statusVariant: StatusVariant;
  calibrationStatus: string;
  calibrationVariant: StatusVariant;
}

const equipment = ref<LaboratoryEquipmentSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  id: '',
  description: '',
  type: '',
  status: '' as '' | 'active' | 'maintenance'
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Código', width: '16%' },
  { key: 'name', label: 'Descrição' },
  { key: 'type', label: 'Tipo', width: '140px' },
  { key: 'serialNumber', label: 'Nº Série', width: '160px' },
  { key: 'lastCalibrationAt', label: 'Última Calibração', width: '150px' },
  { key: 'calibrationStatus', label: 'Calibração', width: '150px' },
  { key: 'status', label: 'Situação', width: '130px' },
  { key: 'actions', label: 'Abrir', width: '110px', class: 'table__actions-col' }
];

const decoratedEquipment = computed<EquipmentRow[]>(() =>
  equipment.value.map((item) => ({
    ...item,
    statusLabel: item.status === 'active' ? 'Ativo' : 'Manutenção',
    statusVariant: item.status === 'active' ? 'success' : 'warning',
    calibrationStatus: isCalibrationDue(item.lastCalibrationAt) ? 'Revisar' : 'Em dia',
    calibrationVariant: isCalibrationDue(item.lastCalibrationAt) ? 'warning' : 'success'
  }))
);

const activeCount = computed(() => equipment.value.filter((item) => item.status === 'active').length);
const maintenanceCount = computed(() =>
  equipment.value.filter((item) => item.status === 'maintenance').length
);
const calibrationDueCount = computed(() =>
  equipment.value.filter((item) => isCalibrationDue(item.lastCalibrationAt)).length
);

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 14)}...` : id;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function isCalibrationDue(value: string): boolean {
  const calibrationDate = new Date(value);
  const daysSinceCalibration = Math.floor((Date.now() - calibrationDate.getTime()) / 86_400_000);
  return daysSinceCalibration > 180;
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    equipment.value = await laboratoryService.listEquipment({
      id: appliedFilters.id || undefined,
      description: appliedFilters.description || undefined,
      type: appliedFilters.type || undefined,
      status: appliedFilters.status || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar equipamentos';
    equipment.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-equipment-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.hub-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.filter-panel {
  padding: 16px;
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  background: var(--color-surface, #ffffff);
}

.filters {
  display: grid;
  grid-template-columns: minmax(140px, 0.7fr) minmax(220px, 1.2fr) minmax(140px, 0.8fr) minmax(140px, 0.7fr) auto;
  align-items: end;
  gap: 12px;
}

.filter-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary, #475569);
}

.filter-field input,
.filter-field select {
  width: 100%;
  min-height: 38px;
  padding: 8px 10px;
  border: 1px solid var(--color-border, #d7dde8);
  border-radius: 6px;
  background: var(--color-surface, #ffffff);
  color: var(--color-text, #0f172a);
  font: inherit;
}

.record-id {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
}

@media (max-width: 980px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 680px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
