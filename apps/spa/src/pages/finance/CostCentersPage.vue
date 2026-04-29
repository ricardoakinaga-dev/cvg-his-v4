<template>
  <div class="cost-centers-page">
    <AppPageHeader
      title="Centros de Custo"
      :breadcrumbs="['Financeiro', 'Cadastros', 'Centros de Custo']"
      subtitle="Cadastro operacional de classificações, responsáveis e rateios financeiros"
      :secondary-actions="headerSecondaryActions"
      :primary-action="{ label: 'Novo Centro', disabled: true }"
    />

    <DsAlert variant="info">
      Superfície somente leitura para preservar a ordem Vetus de cadastros financeiros. Criar centro, editar rateio,
      remover classificação e impactar baixa financeira seguem bloqueados até contrato auditável.
    </DsAlert>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">{{ error }}</DsAlert>

    <form class="cost-centers-filters" aria-label="Filtros de centros de custo" @submit.prevent>
      <DsInput
        id="cost-centers-search"
        v-model="filters.search"
        label="Pesquisar"
        placeholder="Buscar por centro, código, responsável ou uso"
        type="search"
      />
      <DsInput id="cost-centers-kind" v-model="filters.kind" label="Classificação" type="select">
        <option value="">Todas</option>
        <option value="operational">Operacional</option>
        <option value="administrative">Administrativo</option>
      </DsInput>
      <DsInput id="cost-centers-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="active">Ativo</option>
        <option value="inactive">Inativo</option>
      </DsInput>
    </form>

    <section class="cost-centers-summary-grid" aria-label="Resumo de centros de custo">
      <DsStatCard :label="`${visibleCostCenters.length} centro(s)`" value="Registros" />
      <DsStatCard :label="`${operationalCount} operacional(is)`" value="Operacionais" />
      <DsStatCard :label="`${administrativeCount} administrativo(s)`" value="Administrativos" />
      <DsStatCard :label="`${allocationCount} com rateio`" value="Rateios" />
    </section>

    <section class="cost-centers-actions" aria-label="Ações de centros de custo">
      <DsButton variant="primary" disabled>Novo Centro</DsButton>
      <DsButton variant="secondary" tag="a" to="/expenses">Custos e Despesas</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/accounts-payable">Contas a Pagar</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/cash-flow">Fluxo de Caixa</DsButton>
      <DsButton variant="ghost" type="button" :loading="loading" @click="reload">Atualizar</DsButton>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhum centro de custo encontrado"
      empty-description="Ajuste os filtros para visualizar as classificações financeiras cadastradas."
      caption="Centros de custo"
      row-key-field="code"
      variant="hoverable"
    >
      <template #cell-center="{ row }">
        <strong>{{ costCenter(row).name }}</strong>
        <small>{{ costCenter(row).code }}</small>
      </template>
      <template #cell-kind="{ row }">
        <StatusBadge :label="kindLabel(costCenter(row).kindKey)" variant="info" />
      </template>
      <template #cell-owner="{ row }">
        <span>{{ costCenter(row).owner }}</span>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="costCenter(row).status === 'active' ? 'Ativo' : 'Inativo'"
          :variant="costCenter(row).status === 'active' ? 'success' : 'neutral'"
        />
      </template>
      <template #cell-allocation="{ row }">
        <span>{{ costCenter(row).allocation }}</span>
      </template>
      <template #cell-usage="{ row }">
        <span>{{ costCenter(row).usage }}</span>
      </template>
      <template #cell-next="{ row }">
        <span>{{ costCenter(row).nextAction }}</span>
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
import { costCentersCatalogService, type CostCenterCatalogItem } from '@/services/costCentersCatalog';

type CostCenterKind = 'operational' | 'administrative';
type CostCenterStatus = 'active' | 'inactive';

interface CostCenterView extends CostCenterCatalogItem {
  kindKey: CostCenterKind;
  status: CostCenterStatus;
  allocation: string;
  usage: string;
  nextAction: string;
}

const columns: DataTableColumn[] = [
  { key: 'center', label: 'Centro' },
  { key: 'kind', label: 'Classificação' },
  { key: 'owner', label: 'Responsável' },
  { key: 'status', label: 'Status' },
  { key: 'allocation', label: 'Rateio' },
  { key: 'usage', label: 'Uso' },
  { key: 'next', label: 'Próxima Ação' }
];

const costCenters = ref<CostCenterView[]>([]);
const loading = ref(false);
const error = ref('');
const filters = reactive({
  search: '',
  kind: '',
  status: ''
});

const visibleCostCenters = computed(() => costCenters.value.filter(matchesFilters));
const visibleRows = computed(() => visibleCostCenters.value as unknown as DataTableRow[]);
const operationalCount = computed(() => visibleCostCenters.value.filter((item) => item.kindKey === 'operational').length);
const administrativeCount = computed(() => visibleCostCenters.value.filter((item) => item.kindKey === 'administrative').length);
const allocationCount = computed(() => visibleCostCenters.value.filter((item) => item.allocation.length > 0).length);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-cost-centers',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: reload
  }
]);

async function loadCostCenters() {
  loading.value = true;
  error.value = '';
  try {
    const response = await costCentersCatalogService.list({ page: 1, pageSize: 100, sort: 'name', order: 'asc' });
    costCenters.value = (response.items ?? []).map(toCostCenterView);
  } catch (err: unknown) {
    error.value = err instanceof Error ? err.message : 'Falha ao carregar centros de custo';
    costCenters.value = [];
  } finally {
    loading.value = false;
  }
}

async function reload() {
  await loadCostCenters();
}

function matchesFilters(item: CostCenterView): boolean {
  if (filters.kind && item.kindKey !== filters.kind) return false;
  if (filters.status && item.status !== filters.status) return false;
  const search = normalize(filters.search);
  if (!search) return true;
  return [
    item.code,
    item.name,
    item.kind,
    item.owner,
    item.description,
    item.allocation,
    item.usage,
    item.nextAction
  ].some((value) => normalize(value).includes(search));
}

function toCostCenterView(item: CostCenterCatalogItem): CostCenterView {
  const kindKey = normalizeKind(item.kind);
  return {
    ...item,
    kindKey,
    status: 'active',
    allocation: kindKey === 'operational' ? 'Rateio assistencial' : 'Rateio administrativo',
    usage: kindKey === 'operational' ? 'Consultas, procedimentos e jornada clínica' : 'Compras, estrutura e backoffice',
    nextAction: kindKey === 'operational' ? 'Conferir em Custos e Despesas' : 'Acompanhar Contas a Pagar'
  };
}

function normalizeKind(kind: string): CostCenterKind {
  return normalize(kind).includes('operacional') ? 'operational' : 'administrative';
}

function kindLabel(kind: CostCenterKind): string {
  return kind === 'operational' ? 'Operacional' : 'Administrativo';
}

function costCenter(row: DataTableRow): CostCenterView {
  return row as unknown as CostCenterView;
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

onMounted(() => {
  void loadCostCenters();
});
</script>

<style scoped>
.cost-centers-page {
  display: grid;
  gap: 16px;
}

.cost-centers-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: 2fr 1fr 1fr;
}

.cost-centers-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.cost-centers-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cost-centers-page small {
  color: var(--color-text-secondary, #64748b);
  display: block;
  font-size: 12px;
  margin-top: 3px;
}

@media (max-width: 1100px) {
  .cost-centers-filters,
  .cost-centers-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .cost-centers-filters,
  .cost-centers-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
