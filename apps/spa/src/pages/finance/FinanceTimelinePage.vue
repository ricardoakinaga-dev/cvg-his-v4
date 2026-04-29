<template>
  <div class="finance-timeline-page">
    <AppPageHeader
      title="Linha do Tempo"
      :breadcrumbs="['Financeiro', 'Controles', 'Linha do Tempo']"
      subtitle="Eventos financeiros, vencimentos, recebimentos e marcos operacionais"
      :secondary-actions="headerSecondaryActions"
    />

    <form class="finance-timeline-filters" aria-label="Filtros da linha do tempo financeira" @submit.prevent="loadTimeline">
      <DsInput id="finance-timeline-from" v-model="filters.dateFrom" label="De" type="date" />
      <DsInput id="finance-timeline-to" v-model="filters.dateTo" label="Até" type="date" />
      <DsInput id="finance-timeline-type" v-model="filters.type" label="Tipo" type="select">
        <option value="">Todos</option>
        <option value="inflow">Entrada</option>
        <option value="outflow">Saída</option>
        <option value="commercial">Comercial</option>
      </DsInput>
      <DsInput id="finance-timeline-status" v-model="filters.status" label="Status" type="select">
        <option value="">Todos</option>
        <option value="pending">Pendente</option>
        <option value="done">Concluído</option>
        <option value="planned">Planejado</option>
      </DsInput>
      <div class="finance-timeline-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="resetPeriod">Mês Atual</DsButton>
      </div>
    </form>

    <section class="finance-timeline-summary-grid" aria-label="Resumo da linha do tempo financeira">
      <DsStatCard :label="`${visibleTimelineRows.length} evento(s)`" value="Eventos" />
      <DsStatCard :label="formatCurrency(totalInflow)" value="Entradas" />
      <DsStatCard :label="`${plannedOutflows} item(ns)`" value="Saídas Planejadas" />
      <DsStatCard :label="`${pendingEvents} pendência(s)`" value="Pendências" />
    </section>

    <section class="finance-timeline-actions" aria-label="Ações da linha do tempo financeira">
      <DsButton variant="primary" disabled>Exportar Timeline</DsButton>
      <DsButton variant="secondary" tag="a" to="/dashboards/financial">Dashboard Financeiro</DsButton>
      <DsButton variant="secondary" tag="a" to="/finance/cash-flow">Fluxo de Caixa</DsButton>
      <DsButton variant="secondary" tag="a" to="/billing">Contas a Receber</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadTimeline">Atualizar</DsButton>
    </section>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="visibleRows"
      :loading="loading"
      empty-icon="🕒"
      empty-title="Nenhum evento financeiro no período"
      empty-description="A linha do tempo é composta por recebíveis, comandas e catálogo financeiro existentes."
      caption="Linha do tempo financeira"
      variant="hoverable"
    >
      <template #cell-date="{ row }">
        <strong>{{ formatDate(financeTimelineRow(row).date) }}</strong>
        <small>{{ formatTime(financeTimelineRow(row).date) }}</small>
      </template>
      <template #cell-event="{ row }">
        <strong>{{ financeTimelineRow(row).event }}</strong>
        <small>{{ financeTimelineRow(row).description }}</small>
      </template>
      <template #cell-origin="{ row }">
        <span>{{ financeTimelineRow(row).origin }}</span>
        <small>{{ financeTimelineRow(row).reference }}</small>
      </template>
      <template #cell-amount="{ row }">
        <strong>{{ formatCurrency(financeTimelineRow(row).amount) }}</strong>
      </template>
      <template #cell-status="{ row }">
        <StatusBadge
          :label="statusLabel(financeTimelineRow(row).status)"
          :variant="statusVariant(financeTimelineRow(row).status)"
        />
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="financeTimelineRow(row).openTo" class="open-link">Abrir</RouterLink>
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

type TimelineType = 'inflow' | 'outflow' | 'commercial';
type TimelineStatus = 'pending' | 'done' | 'planned';
type TypeFilter = '' | TimelineType;
type StatusFilter = '' | TimelineStatus;

interface FinanceTimelineRow {
  id: string;
  date: string;
  type: TimelineType;
  event: string;
  description: string;
  origin: string;
  reference: string;
  amount: number;
  status: TimelineStatus;
  openTo: string;
}

const columns: DataTableColumn[] = [
  { key: 'date', label: 'Data' },
  { key: 'event', label: 'Evento' },
  { key: 'origin', label: 'Origem' },
  { key: 'amount', label: 'Valor' },
  { key: 'status', label: 'Status' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const initialPeriod = currentMonthPeriod();
const filters = reactive({
  dateFrom: initialPeriod.from,
  dateTo: initialPeriod.to,
  type: '' as TypeFilter,
  status: '' as StatusFilter
});
const receivables = ref<FinancialReceivableListItem[]>([]);
const sales = ref<CounterSaleSummary[]>([]);
const expenses = ref<ExpenseCatalogItem[]>([]);
const loading = ref(false);
const error = ref('');

const timelineRows = computed(() => {
  const rows = [
    ...receivables.value.map(toReceivableTimelineRow),
    ...sales.value.map(toSaleTimelineRow),
    ...expenses.value.map(toExpenseTimelineRow)
  ];
  return rows.sort((left, right) => left.date.localeCompare(right.date));
});
const visibleTimelineRows = computed(() =>
  timelineRows.value.filter((row) => matchesFilters(row))
);
const visibleRows = computed(() => visibleTimelineRows.value as unknown as DataTableRow[]);
const totalInflow = computed(() =>
  visibleTimelineRows.value
    .filter((row) => row.type === 'inflow' || row.type === 'commercial')
    .reduce((sum, row) => sum + row.amount, 0)
);
const plannedOutflows = computed(() =>
  visibleTimelineRows.value.filter((row) => row.type === 'outflow' && row.status === 'planned').length
);
const pendingEvents = computed(() =>
  visibleTimelineRows.value.filter((row) => row.status === 'pending').length
);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-finance-timeline',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadTimeline()
  }
]);

onMounted(() => {
  void loadTimeline();
});

async function loadTimeline() {
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
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar linha do tempo financeira.';
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
  filters.type = '';
  filters.status = '';
  void loadTimeline();
}

function toReceivableTimelineRow(receivable: FinancialReceivableListItem): FinanceTimelineRow {
  const isSettled = receivable.status === 'settled';
  const date = isSettled
    ? receivable.settledAt || receivable.dueAt || receivable.issuedAt
    : receivable.issuedAt || receivable.dueAt || currentIsoDate();
  return {
    id: `receivable-${receivable.id}`,
    date,
    type: 'inflow',
    event: isSettled ? 'Recebimento confirmado' : 'Conta a receber emitida',
    description: `${receivable.ownerName} · ${receivable.patientName}`,
    origin: 'Contas a Receber',
    reference: receivable.installmentLabel,
    amount: isSettled
      ? receivable.amountPaid
      : Math.max(receivable.amountOutstanding, receivable.amountOriginal - receivable.amountPaid),
    status: isSettled ? 'done' : 'pending',
    openTo: `/billing?ownerId=${encodeURIComponent(receivable.ownerId)}`
  };
}

function toSaleTimelineRow(sale: CounterSaleSummary): FinanceTimelineRow {
  const date = sale.closedAt || sale.updatedAt || sale.createdAt;
  return {
    id: `sale-${sale.id}`,
    date,
    type: 'commercial',
    event: sale.status === 'closed' ? 'Comanda fechada' : 'Comanda em aberto',
    description: sale.notes || 'Movimento comercial',
    origin: 'Comandas',
    reference: sale.number,
    amount: sale.total,
    status: sale.status === 'closed' ? 'done' : 'pending',
    openTo: `/counter-sales?search=${encodeURIComponent(sale.number)}`
  };
}

function toExpenseTimelineRow(expense: ExpenseCatalogItem): FinanceTimelineRow {
  return {
    id: `expense-${expense.id}`,
    date: currentIsoDate(),
    type: 'outflow',
    event: 'Despesa catalogada',
    description: expense.name,
    origin: expense.category,
    reference: expense.costCenterName,
    amount: 0,
    status: 'planned',
    openTo: `/expenses?search=${encodeURIComponent(expense.name)}`
  };
}

function matchesFilters(row: FinanceTimelineRow): boolean {
  if (filters.type && row.type !== filters.type) return false;
  if (filters.status && row.status !== filters.status) return false;
  const day = row.date.slice(0, 10);
  if (filters.dateFrom && day < filters.dateFrom) return false;
  if (filters.dateTo && day > filters.dateTo) return false;
  return true;
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

function currentIsoDate(): string {
  return new Date().toISOString();
}

function financeTimelineRow(row: DataTableRow): FinanceTimelineRow {
  return row as unknown as FinanceTimelineRow;
}

function statusLabel(status: TimelineStatus): string {
  if (status === 'done') return 'Concluído';
  if (status === 'planned') return 'Planejado';
  return 'Pendente';
}

function statusVariant(status: TimelineStatus): 'success' | 'warning' | 'info' {
  if (status === 'done') return 'success';
  if (status === 'pending') return 'warning';
  return 'info';
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(value));
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}
</script>

<style scoped>
.finance-timeline-page {
  display: grid;
  gap: 16px;
}

.finance-timeline-filters {
  align-items: end;
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.finance-timeline-filters__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.finance-timeline-summary-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.finance-timeline-actions {
  display: flex;
  flex-wrap: wrap;
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
  .finance-timeline-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .finance-timeline-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .finance-timeline-filters,
  .finance-timeline-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
