<template>
  <div class="expenses-page">
    <AppPageHeader
      title="Custos e Despesas"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Custos e Despesas']"
      subtitle="Cadastro operacional de despesas, categorias e vínculo com centros de custo"
      :secondary-actions="headerSecondaryActions"
      :primary-action="{ label: 'Incluir Despesa', disabled: true }"
    />

    <DsAlert variant="info">
      Superfície somente leitura para preservar a ordem Vetus de cadastros financeiros. Incluir despesa, editar
      categoria, remover lançamento e executar baixa seguem bloqueados até contrato financeiro auditável.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>

    <form class="expenses-filters" aria-label="Filtros de custos e despesas" @submit.prevent>
      <DsInput
        id="expenses-search"
        v-model="filters.search"
        label="Pesquisar"
        placeholder="Buscar por despesa, categoria, centro ou descrição"
        type="search"
      />
      <DsInput id="expenses-category" v-model="filters.category" label="Categoria" type="select">
        <option value="">Todas</option>
        <option v-for="category in categoryOptions" :key="category" :value="category">{{ category }}</option>
      </DsInput>
      <DsInput id="expenses-cost-center" v-model="filters.costCenter" label="Centro de Custo" type="select">
        <option value="">Todos</option>
        <option v-for="center in costCenterOptions" :key="center.code" :value="center.code">
          {{ center.name }}
        </option>
      </DsInput>
      <DsInput id="expenses-kind" v-model="filters.kind" label="Natureza" type="select">
        <option value="">Todas</option>
        <option value="fixed">Fixa</option>
        <option value="operational">Operacional</option>
        <option value="variable">Variável</option>
      </DsInput>
    </form>

    <section class="expenses-summary-grid" aria-label="Resumo de custos e despesas">
      <DsStatCard :label="`${visibleExpenses.length} despesa(s)`" value="Registros" />
      <DsStatCard :label="`${fixedCount} fixa(s)`" value="Fixas" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="Operacionais" />
      <DsStatCard :label="`${linkedCostCenterCount} centro(s)`" value="Centros" />
    </section>

    <section class="expenses-actions" aria-label="Ações de custos e despesas">
      <DsButton variant="primary" disabled>Incluir Despesa</DsButton>
      <DsButton variant="secondary" tag="a" to="/cost-centers">Centro de Custo</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/accounts-payable">Contas a Pagar</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/cash-flow">Fluxo de Caixa</DsButton>
      <DsButton variant="ghost" type="button" :loading="loading" @click="reload">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="🧾"
      empty-title="Nenhuma despesa encontrada"
      empty-description="Ajuste os filtros para visualizar os custos e despesas cadastrados."
      caption="Custos e despesas"
      row-key-field="id"
      variant="hoverable"
    >
      <template #cell-expense="{ row }">
        <strong>{{ expense(row).name }}</strong>
        <small>{{ expense(row).id }}</small>
      </template>
      <template #cell-category="{ row }">
        <span>{{ expense(row).category }}</span>
      </template>
      <template #cell-costCenter="{ row }">
        <strong>{{ expense(row).costCenterName }}</strong>
        <small>{{ expense(row).costCenterCode }}</small>
      </template>
      <template #cell-kind="{ row }">
        <StatusBadge :label="kindLabel(expense(row).kindKey)" :variant="kindVariant(expense(row).kindKey)" />
      </template>
      <template #cell-status="{ row }">
        <StatusBadge label="Planejada" variant="warning" />
      </template>
      <template #cell-usage="{ row }">
        <span>{{ expense(row).usage }}</span>
      </template>
      <template #cell-next="{ row }">
        <span>{{ expense(row).nextAction }}</span>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';
import {
  expensesCatalogService,
  type ExpenseCatalogItem,
  type ExpenseCostCenterItem
} from '@/services/expensesCatalog';

type ExpenseKind = 'fixed' | 'operational' | 'variable';

interface ExpenseView extends ExpenseCatalogItem {
  kindKey: ExpenseKind;
  usage: string;
  nextAction: string;
}

const columns: DataTableColumn[] = [
  { key: 'expense', label: 'Despesa' },
  { key: 'category', label: 'Categoria' },
  { key: 'costCenter', label: 'Centro de Custo' },
  { key: 'kind', label: 'Natureza' },
  { key: 'status', label: 'Status' },
  { key: 'usage', label: 'Uso' },
  { key: 'next', label: 'Próxima Ação' }
];

const expenses = ref<ExpenseView[]>([]);
const categories = ref<string[]>([]);
const costCenters = ref<ExpenseCostCenterItem[]>([]);
const loading = ref(false);
const error = ref('');
const filters = reactive({
  search: '',
  category: '',
  costCenter: '',
  kind: ''
});

const visibleExpenses = computed(() => expenses.value.filter(matchesFilters));
const visibleRows = computed(() => visibleExpenses.value as unknown as DataTableRow[]);
const categoryOptions = computed(() => categories.value.length > 0 ? categories.value : unique(expenses.value.map((item) => item.category)));
const costCenterOptions = computed(() => costCenters.value.length > 0 ? costCenters.value : uniqueCostCenters(expenses.value));
const fixedCount = computed(() => visibleExpenses.value.filter((item) => item.kindKey === 'fixed').length);
const operationalCount = computed(() => visibleExpenses.value.filter((item) => item.kindKey === 'operational').length);
const linkedCostCenterCount = computed(() => new Set(visibleExpenses.value.map((item) => item.costCenterCode)).size);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-expenses',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: reload
  }
]);

async function loadExpenses() {
  loading.value = true;
  error.value = '';
  try {
    const response = await expensesCatalogService.list({ page: 1, pageSize: 100, sort: 'name', order: 'asc' });
    expenses.value = (response.items ?? []).map(toExpenseView);
    categories.value = response.categories ?? [];
    costCenters.value = response.costCenters ?? [];
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar custos e despesas';
    expenses.value = [];
    categories.value = [];
    costCenters.value = [];
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadExpenses();
}

function matchesFilters(item: ExpenseView): boolean {
  if (filters.category && item.category !== filters.category) return false;
  if (filters.costCenter && item.costCenterCode !== filters.costCenter) return false;
  if (filters.kind && item.kindKey !== filters.kind) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    item.id,
    item.name,
    item.kind,
    item.category,
    item.costCenterCode,
    item.costCenterName,
    item.description,
    item.usage,
    item.nextAction
  ].some((value) => normalize(value).includes(search));
}

function toExpenseView(item: ExpenseCatalogItem): ExpenseView {
  const kindKey = normalizeKind(item.kind);
  return {
    ...item,
    kindKey,
    usage: kindKey === 'operational' ? 'Custo ligado à operação assistencial' : 'Despesa administrativa recorrente',
    nextAction: kindKey === 'operational' ? 'Conferir centro de custo antes da baixa' : 'Acompanhar em Contas a Pagar'
  };
}

function normalizeKind(kind: string): ExpenseKind {
  const normalized = normalize(kind);
  if (normalized.includes('fix')) return 'fixed';
  if (normalized.includes('operacional')) return 'operational';
  return 'variable';
}

function kindLabel(kind: ExpenseKind): string {
  if (kind === 'fixed') return 'Fixa';
  if (kind === 'operational') return 'Operacional';
  return 'Variável';
}

function kindVariant(kind: ExpenseKind): 'info' | 'success' | 'neutral' {
  if (kind === 'operational') return 'success';
  if (kind === 'fixed') return 'info';
  return 'neutral';
}

function expense(row: DataTableRow): ExpenseView {
  return row as unknown as ExpenseView;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function uniqueCostCenters(items: ExpenseView[]): ExpenseCostCenterItem[] {
  const centers = new Map<string, ExpenseCostCenterItem>();
  for (const item of items) {
    centers.set(item.costCenterCode, {
      code: item.costCenterCode,
      name: item.costCenterName,
      kind: '',
      owner: '',
      description: ''
    });
  }
  return [...centers.values()].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR'));
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

onMounted(() => {
  void loadExpenses();
});
</script>

<style scoped>
.expenses-page {
  display: grid;
  gap: 16px;
}

.expenses-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: 2fr 1fr 1fr 1fr;
}

.expenses-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.expenses-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.expenses-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .expenses-filters,
  .expenses-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .expenses-filters,
  .expenses-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
