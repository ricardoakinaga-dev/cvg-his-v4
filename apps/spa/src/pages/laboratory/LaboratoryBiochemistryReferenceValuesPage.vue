<template>
  <div class="laboratory-biochemistry-reference-values-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Vlr. Ref. Bioquímico']"
      title="Vlr. Ref. Bioquímico"
      subtitle="Cadastro dos intervalos bioquímicos usados na interpretação de exames séricos"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/laboratory/biochemistry-reference-values/new" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo dos valores de referência bioquímicos">
      <DsStatCard :label="`${referenceValues.length} parâmetro(s)`" value="" icon="⚗️" />
      <DsStatCard :label="`${criticalCount} faixa(s) críticas`" value="" icon="⚠️" />
      <DsStatCard :label="`${unitCoverage} unidade(s)`" value="" icon="📏" />
      <DsStatCard label="BIO" value="" icon="🧪" />
    </section>

    <section class="filter-panel" aria-label="Filtros de valores de referência bioquímicos">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Código</span>
          <input v-model="draftFilters.id" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Parâmetro</span>
          <input v-model="draftFilters.parameter" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Unidade</span>
          <input v-model="draftFilters.unit" type="search" autocomplete="off" />
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="decoratedReferenceValues"
      :loading="loading"
      empty-icon="⚗️"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo valor de referência."
      variant="hoverable"
    >
      <template #cell-id="{ row }">
        <span class="record-id">{{ shortId((row as ReferenceValueRow).id) }}</span>
      </template>
      <template #cell-parameter="{ row }">
        <strong>{{ (row as ReferenceValueRow).parameter }}</strong>
      </template>
      <template #cell-minValue="{ row }">
        {{ formatNumber((row as ReferenceValueRow).minValue) }}
      </template>
      <template #cell-maxValue="{ row }">
        {{ formatNumber((row as ReferenceValueRow).maxValue) }}
      </template>
      <template #cell-range="{ row }">
        <StatusBadge
          :label="(row as ReferenceValueRow).rangeLabel"
          :variant="(row as ReferenceValueRow).rangeVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/laboratory/biochemistry-reference-values/${(row as ReferenceValueRow).id}`"
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
  type LaboratoryReferenceValueSummary
} from '@/services/laboratory';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface ReferenceValueRow extends LaboratoryReferenceValueSummary {
  rangeLabel: string;
  rangeVariant: StatusVariant;
}

const referenceValues = ref<LaboratoryReferenceValueSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  id: '',
  parameter: '',
  unit: ''
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'id', label: 'Código', width: '150px' },
  { key: 'parameter', label: 'Parâmetro' },
  { key: 'examType', label: 'Exame', width: '100px' },
  { key: 'minValue', label: 'Valor Mínimo', width: '140px' },
  { key: 'maxValue', label: 'Valor Máximo', width: '140px' },
  { key: 'unit', label: 'Unidade', width: '120px' },
  { key: 'range', label: 'Faixa', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '110px', class: 'table__actions-col' }
];

const decoratedReferenceValues = computed<ReferenceValueRow[]>(() =>
  referenceValues.value.map((item) => ({
    ...item,
    rangeLabel: item.minValue <= item.maxValue ? 'Válida' : 'Revisar',
    rangeVariant: item.minValue <= item.maxValue ? 'success' : 'warning'
  }))
);

const criticalCount = computed(() =>
  referenceValues.value.filter((item) => item.minValue <= 0 || item.maxValue <= 0).length
);
const unitCoverage = computed(() => new Set(referenceValues.value.map((item) => item.unit)).size);

function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 14)}...` : id;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 3
  }).format(value);
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    referenceValues.value = await laboratoryService.listBiochemistryReferenceValues({
      id: appliedFilters.id || undefined,
      parameter: appliedFilters.parameter || undefined,
      unit: appliedFilters.unit || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar valores de referência bioquímicos';
    referenceValues.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-biochemistry-reference-values-page {
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
  grid-template-columns: minmax(140px, 0.7fr) minmax(220px, 1.2fr) minmax(140px, 0.7fr) auto;
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

.filter-field input {
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

@media (max-width: 900px) {
  .filters {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 620px) {
  .filters {
    grid-template-columns: 1fr;
  }
}
</style>
