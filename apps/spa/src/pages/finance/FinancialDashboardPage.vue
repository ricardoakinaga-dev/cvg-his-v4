<template>
  <div class="financial-dashboard-page">
    <AppPageHeader
      title="Dashboard Financeiro"
      :breadcrumbs="['Financeiro', 'Controles', 'Dashboard Financeiro']"
      subtitle="Indicadores financeiros, recebíveis, caixa, PIX e produção comercial"
      :secondary-actions="headerSecondaryActions"
    />

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <div class="financial-dashboard-period">
      <span>{{ appliedPeriod.from.split('-').reverse().join('/') || 'Sem início' }} — {{ appliedPeriod.to.split('-').reverse().join('/') || 'Sem fim' }}</span>
      <DsButton variant="secondary" :aria-expanded="filtersOpen" aria-controls="financial-period-filters"
        @click="filtersOpen = !filtersOpen">{{ filtersOpen ? 'Ocultar filtros' : 'Filtrar período' }}</DsButton>
    </div>
    <form id="financial-period-filters" class="financial-dashboard-filters" :class="{ 'is-open': filtersOpen }" aria-label="Filtros do dashboard financeiro" @submit.prevent="loadDashboard">
      <DsInput id="financial-dashboard-from" v-model="filters.dateFrom" label="De" type="date" />
      <DsInput id="financial-dashboard-to" v-model="filters.dateTo" label="Até" type="date" />
      <DsInput id="financial-dashboard-view" v-model="filters.view" label="Visão" type="select">
        <option value="executive">Executiva</option>
        <option value="cash">Caixa</option>
        <option value="receivables">Recebíveis</option>
        <option value="income">DRE</option>
      </DsInput>
      <div class="financial-dashboard-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="resetPeriod">Mês Atual</DsButton>
      </div>
    </form>

    <section class="financial-dashboard-summary-grid" aria-label="Resumo do dashboard financeiro">
      <DsStatCard :loading="loading" label="Receita Comercial" :value="!report ? '—' : formatCurrency(commercialRevenue)" />
      <DsStatCard :loading="loading" label="Recebíveis" :value="!report ? '—' : formatCurrency(outstandingReceivables)" />
      <DsStatCard :loading="loading" label="Caixa Aberto" :value="!report ? '—' : cashBalanceLabel" />
      <DsStatCard :loading="loading" label="Resultado Realizado" :value="!report ? '—' : formatCurrency(realizedNetResult)" />
      <DsStatCard
        :loading="loading"
        :label="pixAttentionCount > 0 ? 'PIX · conciliação pendente' : 'PIX em Atenção'"
        :value="!report ? '—' : `${pixAttentionCount} pendência(s)`"
      />
      <DsStatCard :loading="loading" label="Pipeline" :value="!report ? '—' : formatCurrency(quotePipelineAmount)" />
    </section>

    <section class="financial-dashboard-actions" aria-label="Ações do dashboard financeiro">
      <DsButton variant="secondary" tag="a" to="/billing">Contas a Receber</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/accounts-payable">Contas a Pagar</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/cash-flow">Fluxo de Caixa</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadDashboard">Atualizar</DsButton>
    </section>

    <section v-if="visibleHighlights.length" class="financial-dashboard-highlights" aria-label="Alertas financeiros">
      <DsAlert
        v-for="highlight in visibleHighlights"
        :key="`${highlight.domain}-${highlight.title}`"
        :variant="highlight.severity === 'danger' ? 'danger' : highlight.severity === 'warning' ? 'warning' : 'info'"
      >
        <strong>{{ highlight.title }}</strong>
        <span>{{ highlight.message }}</span>
      </DsAlert>
    </section>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="💰"
      empty-title="Nenhum indicador financeiro no período"
      empty-description="O dashboard financeiro consolida dados dos hubs administrativos, recebíveis, caixa, PIX e produção comercial."
      caption="Dashboard financeiro"
      variant="hoverable"
    >
      <template #cell-indicator="{ row }">
        <strong>{{ financialRow(row).indicator }}</strong>
        <small>{{ financialRow(row).description }}</small>
      </template>
      <template #cell-total="{ row }">
        <strong>{{ formatRowValue(financialRow(row)) }}</strong>
      </template>
      <template #cell-detail="{ row }">
        {{ financialRow(row).detail }}
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="financialRow(row).status"
          :variant="statusVariant(financialRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="financialRow(row).openTo" class="open-link">Abrir</RouterLink>
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
import {
  financialStatementsService,
  type FinancialIncomeStatement
} from '@/services/financialStatements';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type DashboardView = 'executive' | 'cash' | 'receivables' | 'income';
type FinancialStatus = 'Regular' | 'Atenção' | 'Sem movimento';
type ValueKind = 'money' | 'count';

interface FinancialDashboardRow {
  id: string;
  indicator: string;
  description: string;
  value: number;
  valueKind: ValueKind;
  detail: string;
  status: FinancialStatus;
  openTo: string;
}

const columns: DataTableColumn[] = [
  { key: 'indicator', label: 'Indicador' },
  { key: 'total', label: 'Total' },
  { key: 'detail', label: 'Detalhe' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const initialPeriod = currentMonthPeriod();
const appliedPeriod = ref({ ...initialPeriod });
const filters = reactive({
  dateFrom: initialPeriod.from,
  dateTo: initialPeriod.to,
  view: 'executive' as DashboardView
});
const report = ref<AdministrativeReportsResponse | null>(null);
const incomeStatement = ref<FinancialIncomeStatement | null>(null);
const loading = ref(false);
const filtersOpen = ref(false);
const error = ref('');

const commercialRevenue = computed(() => report.value?.executive.commercialRevenue ?? 0);
const outstandingReceivables = computed(() => report.value?.executive.outstandingReceivables ?? 0);
const pixAttentionCount = computed(() => report.value?.executive.pixAttentionCount ?? 0);
const quotePipelineAmount = computed(() => report.value?.executive.quotePipelineAmount ?? 0);
const cashBalance = computed(() => report.value?.executive.openCashBalance ?? 0);
const realizedNetResult = computed(() => incomeStatement.value?.result.realizedNetResult ?? 0);
const cashBalanceLabel = computed(() => {
  if (!report.value) return formatCurrency(0);
  return report.value.domains.cash.hasOpenRegister ? formatCurrency(cashBalance.value) : 'Sem caixa aberto';
});
const visibleHighlights = computed(() =>
  (report.value?.highlights ?? []).filter((highlight) =>
    ['financial', 'cash', 'commercial'].includes(highlight.domain)
  )
);
const rows = computed(() => {
  if (!report.value) return [];
  return buildRows(report.value, incomeStatement.value).filter((row) => row.value !== 0 || row.status === 'Atenção');
});
const visibleRows = computed(() => rows.value as unknown as DataTableRow[]);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-financial-dashboard',
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
    const period = {
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined
    };
    const [hubReport, statement] = await Promise.all([
      administrativeReportsService.getHubs(period),
      financialStatementsService.getIncomeStatement(period)
    ]);
    appliedPeriod.value = { from: period.dateFrom ?? '', to: period.dateTo ?? '' };
    report.value = hubReport;
    incomeStatement.value = statement;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar dashboard financeiro.';
    report.value = null;
    incomeStatement.value = null;
  } finally {
    loading.value = false;
  }
}

function resetPeriod() {
  const period = currentMonthPeriod();
  filters.dateFrom = period.from;
  filters.dateTo = period.to;
  filters.view = 'executive';
  void loadDashboard();
}

function buildRows(source: AdministrativeReportsResponse, statement: FinancialIncomeStatement | null): FinancialDashboardRow[] {
  const financial = source.domains.financial;
  const commercial = source.domains.commercial;
  const cash = source.domains.cash;

  const baseRows: FinancialDashboardRow[] = [
    {
      id: 'income-realized',
      indicator: 'DRE Realizado',
      description: `${statement?.revenue.settledReceivableCount ?? 0} recebimento(s), ${statement?.expenses.payableCount ?? 0} obrigação(ões)`,
      value: statement?.result.realizedNetResult ?? 0,
      valueKind: 'money',
      detail: `Receitas ${formatCurrency(statement?.revenue.realizedRevenue ?? 0)}, despesas pagas ${formatCurrency(statement?.expenses.paidExpenses ?? 0)}`,
      status: (statement?.result.realizedNetResult ?? 0) < 0 ? 'Atenção' : resolveMovementStatus(statement?.result.realizedNetResult ?? 0),
      openTo: '/finance/accounts-payable'
    },
    {
      id: 'income-accrual',
      indicator: 'DRE Competência',
      description: `${statement?.revenue.receivableCount ?? 0} título(s), ${statement?.expenses.openPayableCount ?? 0} conta(s) aberta(s)`,
      value: statement?.result.accrualNetResult ?? 0,
      valueKind: 'money',
      detail: `Margem ${formatPercent(statement?.result.grossMarginPercent ?? null)}, conversão ${formatPercent(statement?.result.cashConversionPercent ?? null)}`,
      status: (statement?.result.accrualNetResult ?? 0) < 0 ? 'Atenção' : resolveMovementStatus(statement?.result.accrualNetResult ?? 0),
      openTo: '/reports/engine'
    },
    {
      id: 'billing',
      indicator: 'Faturamento',
      description: `${financial.billing.totalRecords} título(s) financeiros`,
      value: financial.billing.grossAmount,
      valueKind: 'money',
      detail: `${financial.billing.openCount} aberto(s), ${financial.billing.settledCount} recebido(s)`,
      status: financial.billing.openCount > 0 ? 'Atenção' : resolveMovementStatus(financial.billing.grossAmount),
      openTo: '/billing'
    },
    {
      id: 'receivables',
      indicator: 'Recebíveis em Aberto',
      description: `${financial.receivables.openCount} título(s) a receber`,
      value: financial.receivables.totalOutstanding,
      valueKind: 'money',
      detail: `${financial.receivables.currentCount} em dia, ${financial.receivables.overdueCount} vencido(s)`,
      status: financial.receivables.overdueCount > 0 ? 'Atenção' : resolveMovementStatus(financial.receivables.totalOutstanding),
      openTo: '/billing'
    },
    {
      id: 'pix',
      indicator: 'PIX em Atenção',
      description: `${financial.pix.totalTransactions} transação(ões) no período`,
      value: financial.pix.completedAmount,
      valueKind: 'money',
      detail: `${financial.pix.completedCount} concluída(s), ${financial.pix.attentionRequiredCount} pendência(s)`,
      status: financial.pix.attentionRequiredCount > 0 ? 'Atenção' : resolveMovementStatus(financial.pix.completedAmount),
      openTo: '/pix'
    },
    {
      id: 'cash',
      indicator: 'Caixa',
      description: cash.hasOpenRegister ? 'Gaveta aberta' : 'Sem gaveta aberta',
      value: source.executive.openCashBalance ?? 0,
      valueKind: 'money',
      detail: `${cash.registerCount} gaveta(s), entradas ${formatCurrency(cash.inflowAmount)}`,
      status: cash.hasOpenRegister ? 'Regular' : 'Atenção',
      openTo: '/cash'
    },
    {
      id: 'commercial',
      indicator: 'Produção Comercial',
      description: `${commercial.counterSales.closedCount} venda(s) fechada(s)`,
      value: source.executive.commercialRevenue,
      valueKind: 'money',
      detail: `Ticket médio ${formatCurrency(commercial.counterSales.avgTicket)}`,
      status: resolveMovementStatus(source.executive.commercialRevenue),
      openTo: '/counter-sales'
    },
    {
      id: 'pipeline',
      indicator: 'Pipeline',
      description: `${commercial.quotes.issuedCount} orçamento(s) emitido(s)`,
      value: source.executive.quotePipelineAmount,
      valueKind: 'money',
      detail: `${commercial.quotes.approvedCount} aprovado(s), ${commercial.quotes.convertedCount} convertido(s)`,
      status: resolveMovementStatus(source.executive.quotePipelineAmount),
      openTo: '/quotes'
    }
  ];

  if (filters.view === 'cash') return baseRows.filter((row) => ['cash', 'pix', 'billing'].includes(row.id));
  if (filters.view === 'receivables') return baseRows.filter((row) => ['billing', 'receivables', 'pix'].includes(row.id));
  if (filters.view === 'income') return baseRows.filter((row) => row.id.startsWith('income'));
  return baseRows;
}

function resolveMovementStatus(value: number): FinancialStatus {
  return value > 0 ? 'Regular' : 'Sem movimento';
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

function financialRow(row: DataTableRow): FinancialDashboardRow {
  return row as unknown as FinancialDashboardRow;
}

function formatRowValue(row: FinancialDashboardRow): string {
  if (row.valueKind === 'count') return String(row.value);
  return formatCurrency(row.value);
}

function statusVariant(value: FinancialStatus): 'success' | 'warning' | 'info' {
  if (value === 'Regular') return 'success';
  if (value === 'Atenção') return 'warning';
  return 'info';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPercent(value: number | null): string {
  if (value === null) return 'n/a';
  return `${value.toFixed(2).replace('.', ',')}%`;
}
</script>

<style scoped>
.financial-dashboard-page {
  display: grid;
  gap: 16px;
}

.financial-dashboard-filters,
.financial-dashboard-actions {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.financial-dashboard-filters__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.financial-dashboard-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.financial-dashboard-highlights {
  display: grid;
  gap: 8px;
}

.open-link {
  color: var(--color-primary, #2563eb);
  font-weight: 700;
  text-decoration: none;
}

small {
  color: var(--color-text-muted, #64748b);
  display: block;
  margin-top: 2px;
}

@media (max-width: 1100px) {
  .financial-dashboard-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .financial-dashboard-filters,
  .financial-dashboard-actions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.financial-dashboard-period { display: none; }
.financial-dashboard-summary-grid :deep(.ds-stat-card) { padding: 16px; gap: 12px; }
.financial-dashboard-summary-grid :deep(.ds-stat-card__value) { font-size: clamp(20px, 2vw, 27px); font-variant-numeric: tabular-nums; }
.financial-dashboard-filters > * { min-width: 0; }
@media (max-width: 720px) {
  .financial-dashboard-period { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--color-text-muted); font-size: 12px; }
  .financial-dashboard-period > span { min-width: 0; }
  .financial-dashboard-filters { display: none; }
  .financial-dashboard-filters.is-open { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .financial-dashboard-summary-grid, .financial-dashboard-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .financial-dashboard-summary-grid :deep(.ds-stat-card) { padding: 14px 12px; min-height: 92px; }
  .financial-dashboard-summary-grid :deep(.ds-stat-card__icon) { display: none; }
  .financial-dashboard-summary-grid :deep(.ds-stat-card__value) { font-size: 21px; }
  .financial-dashboard-actions :deep(.ds-btn) { white-space: normal; height: auto; min-height: 44px; }
  .financial-dashboard-filters__actions { grid-column: 1 / -1; }
  .financial-dashboard-page :deep(.app-page-header) { padding: 18px; }
  .financial-dashboard-page :deep(.app-page-header__breadcrumbs) { display: none; }

}
</style>
