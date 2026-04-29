<template>
  <div class="cash-flow-page">
    <AppPageHeader
      title="Fluxo de Caixa"
      :breadcrumbs="['Financeiro', 'Controles', 'Fluxo de Caixa']"
      subtitle="Projeção temporal de receitas, despesas, produção, descontos e saldo final"
      :secondary-actions="headerSecondaryActions"
    />

    <form class="cash-flow-filters" aria-label="Filtros de fluxo de caixa" @submit.prevent="loadCashFlow">
      <DsInput id="cash-flow-from" v-model="filters.dateFrom" label="Fluxo de" type="date" />
      <DsInput id="cash-flow-to" v-model="filters.dateTo" label="Até" type="date" />
      <DsInput id="cash-flow-group" v-model="filters.groupBy" label="Agrupar por" type="select">
        <option value="day">Dia</option>
        <option value="month">Mês</option>
      </DsInput>
      <div class="cash-flow-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="resetPeriod">Mês Atual</DsButton>
      </div>
    </form>

    <section class="cash-flow-summary-grid" aria-label="Resumo do fluxo de caixa">
      <DsStatCard :label="formatCurrency(totalRevenue)" value="Total de Receitas" />
      <DsStatCard :label="formatCurrency(totalExpenses)" value="Total de Despesas" />
      <DsStatCard
        :label="formatCurrency(finalBalance)"
        value="Saldo Final"
        :error="finalBalance < 0 ? 'Saldo negativo' : undefined"
      />
      <DsStatCard :label="formatCurrency(totalProduced)" value="Total Produzido" />
      <DsStatCard :label="formatCurrency(totalDiscount)" value="Total Desconto" />
    </section>

    <section class="cash-flow-actions" aria-label="Ações de fluxo de caixa">
      <DsButton variant="primary" disabled>Gerar Fluxo</DsButton>
      <DsButton variant="secondary" disabled>Exportar Gráfico</DsButton>
      <DsButton variant="secondary" tag="a" to="/billing">Contas a Receber</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/accounts-payable">Contas a Pagar</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadCashFlow">Atualizar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="rowsWithBalance"
      :loading="loading"
      empty-icon="📈"
      empty-title="Nenhuma linha de fluxo encontrada"
      empty-description="As linhas aparecem a partir de recebíveis, comandas e catálogo financeiro existentes."
      caption="Fluxo de caixa"
      variant="hoverable"
    >
      <template #cell-date="{ row }">
        <strong>{{ cashFlowRow(row).dateLabel }}</strong>
        <small>{{ groupByLabel }}</small>
      </template>
      <template #cell-nature="{ row }">
        <StatusBadge
          :label="natureLabel(cashFlowRow(row).nature)"
          :variant="natureVariant(cashFlowRow(row).nature)"
        />
      </template>
      <template #cell-description="{ row }">
        <strong>{{ cashFlowRow(row).description }}</strong>
        <small>{{ cashFlowRow(row).reference }}</small>
      </template>
      <template #cell-origin="{ row }">
        <span class="origin-cell">{{ cashFlowRow(row).origin }}</span>
      </template>
      <template #cell-amount="{ row }">
        <strong>{{ formatCurrency(cashFlowRow(row).amount) }}</strong>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel(cashFlowRow(row).status)"
          :variant="statusVariant(cashFlowRow(row).status)"
        />
      </template>
      <template #cell-balance="{ row }">
        <strong>{{ formatCurrency(cashFlowRow(row).balance) }}</strong>
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="cashFlowRow(row).href" class="open-link">Abrir</RouterLink>
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
import { counterSalesService, type CounterSaleSummary } from '@/services/counterSales';
import { expensesCatalogService, type ExpenseCatalogItem } from '@/services/expensesCatalog';
import { financialReceivablesService } from '@/services/financialReceivables';
import type { FinancialReceivableListItem } from '@/types/financialReceivables';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type CashFlowNature = 'inflow' | 'outflow';
type CashFlowStatus = 'received' | 'receivable' | 'planned';
type GroupBy = 'day' | 'month';

interface CashFlowRow {
  id: string;
  date: string | null;
  dateLabel: string;
  nature: CashFlowNature;
  description: string;
  reference: string;
  origin: string;
  amount: number;
  status: CashFlowStatus;
  href: string;
  balance: number;
}

const columns: DataTableColumn[] = [
  { key: 'date', label: 'Data' },
  { key: 'nature', label: 'Natureza' },
  { key: 'description', label: 'Descrição' },
  { key: 'origin', label: 'Origem' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Status' },
  { key: 'balance', label: 'Saldo' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const initialPeriod = currentMonthPeriod();
const filters = reactive({
  dateFrom: initialPeriod.from,
  dateTo: initialPeriod.to,
  groupBy: 'day' as GroupBy
});
const receivables = ref<FinancialReceivableListItem[]>([]);
const sales = ref<CounterSaleSummary[]>([]);
const expenses = ref<ExpenseCatalogItem[]>([]);
const loading = ref(false);
const error = ref('');

const flowRows = computed(() => {
  const baseRows = [
    ...receivables.value.map(toReceivableFlowRow),
    ...expenses.value.map(toExpenseFlowRow)
  ];
  return baseRows
    .filter(matchesPeriod)
    .sort((left, right) => compareNullableDates(left.date, right.date));
});
const rowsWithBalance = computed(() => {
  let balance = 0;
  return flowRows.value.map((row) => {
    balance += row.nature === 'inflow' ? row.amount : -row.amount;
    return {
      ...row,
      balance
    } as CashFlowRow;
  }) as unknown as DataTableRow[];
});
const totalRevenue = computed(() =>
  flowRows.value.filter((row) => row.nature === 'inflow').reduce((sum, row) => sum + row.amount, 0)
);
const totalExpenses = computed(() =>
  flowRows.value.filter((row) => row.nature === 'outflow').reduce((sum, row) => sum + row.amount, 0)
);
const finalBalance = computed(() => totalRevenue.value - totalExpenses.value);
const totalProduced = computed(() =>
  sales.value
    .filter((sale) => matchesPeriodByDate(sale.closedAt || sale.createdAt))
    .reduce((sum, sale) => sum + sale.total, 0)
);
const totalDiscount = computed(() =>
  sales.value
    .filter((sale) => matchesPeriodByDate(sale.closedAt || sale.createdAt))
    .reduce((sum, sale) => sum + sale.discountAmount, 0)
);
const groupByLabel = computed(() => (filters.groupBy === 'day' ? 'Dia' : 'Mês'));
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-cash-flow',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadCashFlow()
  }
]);

onMounted(() => {
  void loadCashFlow();
});

async function loadCashFlow() {
  loading.value = true;
  error.value = '';
  try {
    const [receivableResponse, nextSales, expenseResponse] = await Promise.all([
      financialReceivablesService.list({ page: 1, pageSize: 100 }),
      counterSalesService.list({
        status: 'all',
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      }),
      expensesCatalogService.list({
        page: 1,
        pageSize: 100,
        sort: 'name',
        order: 'asc'
      })
    ]);
    receivables.value = receivableResponse.data ?? [];
    sales.value = [...nextSales];
    expenses.value = expenseResponse.items ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar fluxo de caixa.';
    receivables.value = [];
    sales.value = [];
    expenses.value = [];
  } finally {
    loading.value = false;
  }
}

function resetPeriod() {
  const period = currentMonthPeriod();
  filters.dateFrom = period.from;
  filters.dateTo = period.to;
  filters.groupBy = 'day';
  void loadCashFlow();
}

function toReceivableFlowRow(receivable: FinancialReceivableListItem): CashFlowRow {
  const status: CashFlowStatus = receivable.status === 'settled' ? 'received' : 'receivable';
  const amount = status === 'received'
    ? receivable.amountPaid
    : Math.max(receivable.amountOutstanding, receivable.amountOriginal - receivable.amountPaid);
  const effectiveDate = receivable.settledAt || receivable.dueAt || receivable.issuedAt;
  return {
    id: `receivable-${receivable.id}`,
    date: effectiveDate,
    dateLabel: formatGroupedDate(effectiveDate),
    nature: 'inflow',
    description: receivable.ownerName,
    reference: `${receivable.installmentLabel} · ${receivable.patientName}`,
    origin: 'Contas a Receber',
    amount,
    status,
    href: `/billing?ownerId=${encodeURIComponent(receivable.ownerId)}`,
    balance: 0
  };
}

function toExpenseFlowRow(expense: ExpenseCatalogItem): CashFlowRow {
  const effectiveDate = filters.dateFrom || null;
  return {
    id: `expense-${expense.id}`,
    date: effectiveDate,
    dateLabel: formatGroupedDate(effectiveDate),
    nature: 'outflow',
    description: expense.name,
    reference: `${expense.category} · ${expense.costCenterName}`,
    origin: 'Contas a Pagar',
    amount: 0,
    status: 'planned',
    href: `/expenses?search=${encodeURIComponent(expense.name)}`,
    balance: 0
  };
}

function matchesPeriod(row: CashFlowRow): boolean {
  return matchesPeriodByDate(row.date);
}

function matchesPeriodByDate(value: string | null): boolean {
  if (!value) return !filters.dateFrom && !filters.dateTo;
  const date = value.slice(0, 10);
  if (filters.dateFrom && date < filters.dateFrom) return false;
  if (filters.dateTo && date > filters.dateTo) return false;
  return true;
}

function compareNullableDates(left: string | null, right: string | null): number {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  return left.localeCompare(right);
}

function currentMonthPeriod(): { from: string; to: string } {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 0));
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to)
  };
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatGroupedDate(value: string | null): string {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  if (filters.groupBy === 'month') {
    return new Intl.DateTimeFormat('pt-BR', { month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
  }
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function cashFlowRow(row: DataTableRow): CashFlowRow {
  return row as unknown as CashFlowRow;
}

function natureLabel(nature: CashFlowNature): string {
  return nature === 'inflow' ? 'Receita' : 'Despesa';
}

function natureVariant(nature: CashFlowNature): 'success' | 'warning' {
  return nature === 'inflow' ? 'success' : 'warning';
}

function statusLabel(status: CashFlowStatus): string {
  if (status === 'received') return 'Recebido';
  if (status === 'receivable') return 'A Receber';
  return 'Previsto';
}

function statusVariant(status: CashFlowStatus): 'success' | 'warning' | 'info' {
  if (status === 'received') return 'success';
  if (status === 'receivable') return 'warning';
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
.cash-flow-page {
  display: grid;
  gap: 16px;
}

.cash-flow-filters {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) minmax(160px, 1fr) minmax(180px, 0.8fr) auto;
  gap: 12px;
  align-items: end;
}

.cash-flow-filters__actions,
.cash-flow-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.cash-flow-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.origin-cell {
  color: var(--color-text-secondary, #475569);
  font-weight: 600;
}

.cash-flow-page :deep(td small) {
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
  .cash-flow-filters {
    grid-template-columns: 1fr;
  }
}
</style>
