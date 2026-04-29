<template>
  <div class="multibranch-dashboard-page">
    <AppPageHeader
      title="DashBoard do Multifilial"
      :breadcrumbs="['Financeiro', 'Controles', 'DashBoard do Multifilial']"
      subtitle="Visão consolidada de filiais, comparativo operacional e ranking de desempenho"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="multibranch-summary-grid" aria-label="Resumo do dashboard multifilial">
      <DsStatCard :label="`${branchRows.length} unidade(s)`" value="Unidades" />
      <DsStatCard :label="formatCurrency(totalRevenue)" value="Receita Comercial" />
      <DsStatCard :label="formatCurrency(totalReceivables)" value="Recebíveis" />
      <DsStatCard :label="cashStatusLabel" value="Caixa" />
      <DsStatCard :label="`${fiscalCoverageScore}/100`" value="Cobertura Fiscal" />
    </section>

    <section class="multibranch-actions" aria-label="Ações do dashboard multifilial">
      <DsButton variant="primary" disabled>Exportar Dashboard</DsButton>
      <DsButton variant="secondary" tag="a" to="/dashboards/financial">Dashboard Financeiro</DsButton>
      <DsButton variant="secondary" tag="a" to="/cash">Gaveta</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadDashboard">Atualizar</DsButton>
    </section>

    <form class="multibranch-filters" aria-label="Filtros do dashboard multifilial" @submit.prevent="loadDashboard">
      <DsInput id="multibranch-unit" v-model="filters.unit" label="Unidade" type="select">
        <option value="">Todas</option>
        <option value="current">Unidade atual</option>
      </DsInput>
      <DsInput id="multibranch-date-from" v-model="filters.dateFrom" label="De" type="date" />
      <DsInput id="multibranch-date-to" v-model="filters.dateTo" label="Até" type="date" />
      <div class="multibranch-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="🏢"
      empty-title="Nenhuma unidade com movimento no período"
      empty-description="O dashboard multifilial exibe a unidade operacional atual enquanto não houver endpoint de filiais segregadas."
      caption="DashBoard do Multifilial"
      variant="hoverable"
    >
      <template #cell-unit="{ row }">
        <strong>{{ branchRow(row).unit }}</strong>
        <small>{{ branchRow(row).scope }}</small>
      </template>
      <template #cell-revenue="{ row }">
        <strong>{{ formatCurrency(branchRow(row).revenue) }}</strong>
      </template>
      <template #cell-receivables="{ row }">
        {{ formatCurrency(branchRow(row).receivables) }}
      </template>
      <template #cell-cash="{ row }">
        {{ formatCurrency(branchRow(row).cash) }}
      </template>
      <template #cell-sales="{ row }">
        {{ branchRow(row).sales }} venda(s)
      </template>
      <template #cell-averageTicket="{ row }">
        {{ formatCurrency(branchRow(row).averageTicket) }}
      </template>
      <template #cell-fiscalCoverage="{ row }">
        {{ branchRow(row).fiscalCoverage }}/100
      </template>
      <template #cell-status="{ row }">
        <StatusBadge :label="branchRow(row).status" :variant="statusVariant(branchRow(row).status)" />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="branchRow(row).openTo" class="open-link">Abrir</RouterLink>
      </template>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AppPageHeader from '@/components/AppPageHeader.vue';
import DataTable from '@/components/DataTable.vue';
import type { DataTableColumn, DataTableRow } from '@/components/DataTable.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import {
  administrativeReportsService,
  type AdministrativeReportsResponse
} from '@/services/administrativeReports';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type BranchStatus = 'Operacional' | 'Atenção' | 'Sem movimento';

interface BranchDashboardRow {
  id: string;
  unit: string;
  scope: string;
  revenue: number;
  receivables: number;
  cash: number;
  sales: number;
  averageTicket: number;
  fiscalCoverage: number;
  status: BranchStatus;
  openTo: string;
}

const columns: DataTableColumn[] = [
  { key: 'unit', label: 'Unidade' },
  { key: 'revenue', label: 'Receita' },
  { key: 'receivables', label: 'Recebíveis' },
  { key: 'cash', label: 'Caixa' },
  { key: 'sales', label: 'Vendas' },
  { key: 'averageTicket', label: 'Ticket Médio' },
  { key: 'fiscalCoverage', label: 'Cobertura Fiscal' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const period = currentMonthPeriod();
const filters = reactive({
  unit: '',
  dateFrom: period.from,
  dateTo: period.to
});
const report = ref<AdministrativeReportsResponse | null>(null);
const loading = ref(false);
const error = ref('');

const branchRows = computed(() => {
  if (!report.value) return [];
  const row = buildCurrentUnitRow(report.value);
  return hasOperationalMovement(row) ? [row] : [];
});
const visibleRows = computed(() => branchRows.value as unknown as DataTableRow[]);
const totalRevenue = computed(() => branchRows.value.reduce((sum, row) => sum + row.revenue, 0));
const totalReceivables = computed(() => branchRows.value.reduce((sum, row) => sum + row.receivables, 0));
const cashBalance = computed(() => report.value?.executive.openCashBalance ?? 0);
const cashStatusLabel = computed(() => {
  if (!report.value) return formatCurrency(0);
  return report.value.domains.cash.hasOpenRegister ? formatCurrency(cashBalance.value) : 'Sem caixa aberto';
});
const fiscalCoverageScore = computed(() => report.value?.executive.fiscalCoverageScore ?? 0);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-multibranch-dashboard',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadDashboard()
  }
]);

onMounted(() => {
  void loadDashboard();
});

async function loadDashboard() {
  loading.value = true;
  error.value = '';
  try {
    report.value = await administrativeReportsService.getHubs({
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined
    });
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar dashboard multifilial.';
    report.value = null;
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.unit = '';
  const nextPeriod = currentMonthPeriod();
  filters.dateFrom = nextPeriod.from;
  filters.dateTo = nextPeriod.to;
  void loadDashboard();
}

function buildCurrentUnitRow(source: AdministrativeReportsResponse): BranchDashboardRow {
  const sales = source.domains.commercial.counterSales;
  const status = resolveStatus(source);
  return {
    id: 'current-unit',
    unit: 'Unidade atual',
    scope: source.domains.fiscal.backendScope || 'Escopo atual',
    revenue: source.executive.commercialRevenue,
    receivables: source.executive.outstandingReceivables,
    cash: source.executive.openCashBalance ?? 0,
    sales: sales.closedCount,
    averageTicket: sales.avgTicket,
    fiscalCoverage: source.executive.fiscalCoverageScore,
    status,
    openTo: '/dashboards/financial'
  };
}

function hasOperationalMovement(row: BranchDashboardRow): boolean {
  return row.revenue > 0 || row.receivables > 0 || row.cash > 0 || row.sales > 0 || row.fiscalCoverage > 0;
}

function resolveStatus(source: AdministrativeReportsResponse): BranchStatus {
  if (
    source.executive.pixAttentionCount > 0
    || source.domains.financial.receivables.overdueCount > 0
    || !source.domains.cash.hasOpenRegister
  ) {
    return 'Atenção';
  }
  if (source.executive.commercialRevenue <= 0 && source.executive.outstandingReceivables <= 0) {
    return 'Sem movimento';
  }
  return 'Operacional';
}

function currentMonthPeriod(): { from: string; to: string } {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  return {
    from: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    to: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  };
}

function branchRow(row: DataTableRow): BranchDashboardRow {
  return row as unknown as BranchDashboardRow;
}

function statusVariant(value: BranchStatus): 'success' | 'warning' | 'info' {
  if (value === 'Operacional') return 'success';
  if (value === 'Atenção') return 'warning';
  return 'info';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
</script>

<style scoped>
.multibranch-dashboard-page {
  display: grid;
  gap: 16px;
}

.multibranch-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.multibranch-actions,
.multibranch-filters__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.multibranch-filters {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) auto;
  gap: 12px;
  align-items: end;
}

.multibranch-dashboard-page :deep(td small) {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary, #64748b);
  font-size: 12px;
}

.open-link {
  color: var(--color-primary, #2563eb);
  font-weight: 600;
  text-decoration: none;
}

.open-link:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .multibranch-filters {
    grid-template-columns: 1fr;
  }
}
</style>
