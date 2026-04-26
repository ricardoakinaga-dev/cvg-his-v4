<template>
  <div class="laboratory-report-types-page">
    <AppPageHeader
      :breadcrumbs="['Laboratório', 'Cadastros', 'Tipos de Laudo']"
      title="Tipos de Laudo"
      subtitle="Cadastro de modelos usados em laudos, exames e autorizações laboratoriais"
    >
      <template #actions>
        <DsButton variant="primary" tag="a" to="/laboratory/report-types/new" icon="➕">Incluir</DsButton>
        <DsButton variant="secondary" :loading="loading" @click="load">Atualizar</DsButton>
      </template>
    </AppPageHeader>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <section class="hub-kpis" aria-label="Resumo dos tipos de laudo">
      <DsStatCard :label="`${reportTypes.length} tipo(s)`" value="" icon="📄" />
      <DsStatCard :label="`${activeCount} ativo(s)`" value="" icon="✅" />
      <DsStatCard :label="`${laboratoryCount} laboratoriais`" value="" icon="🧪" />
      <DsStatCard :label="`${imageCount} imagem`" value="" icon="🖼️" />
    </section>

    <section class="filter-panel" aria-label="Filtros de tipos de laudo">
      <form class="filters" @submit.prevent="applyFilters">
        <label class="filter-field">
          <span>Código</span>
          <input v-model="draftFilters.code" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Descrição</span>
          <input v-model="draftFilters.description" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Categoria</span>
          <input v-model="draftFilters.category" type="search" autocomplete="off" />
        </label>
        <label class="filter-field">
          <span>Situação</span>
          <select v-model="draftFilters.status">
            <option value="">Todas</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>
        </label>
        <DsButton type="submit" variant="primary">Pesquisar</DsButton>
      </form>
    </section>

    <DataTable
      :columns="columns"
      :rows="decoratedReportTypes"
      :loading="loading"
      empty-icon="📄"
      empty-title="Nenhum registro encontrado"
      empty-description="Use os filtros acima ou inclua um novo tipo de laudo."
      variant="hoverable"
    >
      <template #cell-code="{ row }">
        <span class="record-code">{{ (row as ReportTypeRow).code }}</span>
      </template>
      <template #cell-name="{ row }">
        <strong>{{ (row as ReportTypeRow).name }}</strong>
      </template>
      <template #cell-description="{ row }">
        <span class="description-cell">{{ (row as ReportTypeRow).description }}</span>
      </template>
      <template #cell-active="{ row }">
        <StatusBadge
          :label="(row as ReportTypeRow).statusLabel"
          :variant="(row as ReportTypeRow).statusVariant"
          size="sm"
        />
      </template>
      <template #cell-actions="{ row }">
        <DsButton
          tag="a"
          :to="`/laboratory/report-types/${(row as ReportTypeRow).id}`"
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
  type LaboratoryReportTypeSummary
} from '@/services/laboratory';

type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface ReportTypeRow extends LaboratoryReportTypeSummary {
  statusLabel: string;
  statusVariant: StatusVariant;
}

const reportTypes = ref<LaboratoryReportTypeSummary[]>([]);
const loading = ref(false);
const error = ref('');
const draftFilters = reactive({
  code: '',
  description: '',
  category: '',
  status: '' as '' | 'active' | 'inactive'
});
const appliedFilters = reactive({ ...draftFilters });

const columns: DataTableColumn[] = [
  { key: 'code', label: 'Código', width: '120px' },
  { key: 'name', label: 'Descrição', width: '22%' },
  { key: 'category', label: 'Categoria', width: '150px' },
  { key: 'description', label: 'Modelo', width: '36%' },
  { key: 'active', label: 'Situação', width: '120px' },
  { key: 'actions', label: 'Abrir', width: '110px', class: 'table__actions-col' }
];

const decoratedReportTypes = computed<ReportTypeRow[]>(() =>
  reportTypes.value.map((item) => ({
    ...item,
    statusLabel: item.active ? 'Ativo' : 'Inativo',
    statusVariant: item.active ? 'success' : 'warning'
  }))
);

const activeCount = computed(() => reportTypes.value.filter((item) => item.active).length);
const laboratoryCount = computed(() =>
  reportTypes.value.filter((item) => normalizeText(item.category).includes('laboratorial')).length
);
const imageCount = computed(() =>
  reportTypes.value.filter((item) => normalizeText(item.category).includes('imagem')).length
);

function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

function applyFilters() {
  Object.assign(appliedFilters, draftFilters);
  void load();
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    reportTypes.value = await laboratoryService.listReportTypes({
      code: appliedFilters.code || undefined,
      description: appliedFilters.description || undefined,
      category: appliedFilters.category || undefined,
      status: appliedFilters.status || undefined
    });
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Erro ao carregar tipos de laudo';
    reportTypes.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<style scoped>
.laboratory-report-types-page {
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
  grid-template-columns: minmax(120px, 0.65fr) minmax(220px, 1.2fr) minmax(150px, 0.85fr) minmax(130px, 0.65fr) auto;
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

.record-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace;
  font-size: 12px;
  font-weight: 700;
}

.description-cell {
  display: inline-block;
  max-width: 520px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 980px) {
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
