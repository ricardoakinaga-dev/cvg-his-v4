<template>
  <div class="curve-abc-clients-page">
    <AppPageHeader
      title="Curva ABC Clientes"
      :breadcrumbs="['Financeiro', 'Controles', 'Curva ABC Clientes']"
      subtitle="Classificação por faturamento, participação acumulada e concentração da carteira"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="abc-summary-grid" aria-label="Resumo da curva ABC de clientes">
      <DsStatCard :label="`${filteredRows.length} cliente(s)`" value="Clientes" />
      <DsStatCard :label="formatCurrency(totalRevenue)" value="Faturamento" />
      <DsStatCard :label="formatCurrency(averageTicket)" value="Ticket Médio" />
      <DsStatCard
        :label="formatCurrency(classARevenue)"
        value="Classe A"
        :error="classACount > 0 ? `${classACount} cliente(s)` : undefined"
      />
    </section>

    <section class="abc-actions" aria-label="Ações da curva ABC de clientes">
      <DsButton variant="primary" disabled>Exportar Curva</DsButton>
      <DsButton variant="secondary" disabled>Gerar Relatório</DsButton>
      <DsButton variant="secondary" tag="a" to="/owners">Clientes</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadCurve">Atualizar</DsButton>
    </section>

    <form class="abc-filters" aria-label="Filtros da curva ABC de clientes" @submit.prevent="loadCurve">
      <DsInput
        id="abc-client-search"
        v-model="filters.search"
        label="Cliente"
        type="search"
        placeholder="Buscar por cliente ou ID"
      />
      <DsInput id="abc-date-from" v-model="filters.dateFrom" label="De" type="date" />
      <DsInput id="abc-date-to" v-model="filters.dateTo" label="Até" type="date" />
      <DsInput id="abc-class" v-model="filters.classFilter" label="Classe" type="select">
        <option value="">Todas</option>
        <option value="A">Classe A</option>
        <option value="B">Classe B</option>
        <option value="C">Classe C</option>
      </DsInput>
      <div class="abc-filters__actions">
        <DsButton type="submit" :loading="loading">Pesquisar</DsButton>
        <DsButton type="button" variant="ghost" @click="clearFilters">Limpar</DsButton>
      </div>
    </form>

    <DsAlert v-if="error" variant="danger" dismissible @dismiss="error = ''">
      {{ error }}
    </DsAlert>

    <DataTable
      :columns="columns"
      :rows="filteredRows"
      :loading="loading"
      empty-icon="📊"
      empty-title="Nenhum cliente na curva ABC"
      empty-description="A curva é calculada a partir dos recebíveis financeiros existentes no período selecionado."
      caption="Curva ABC Clientes"
      variant="hoverable"
    >
      <template #cell-rank="{ row }">
        <strong>{{ abcRow(row).rank }}</strong>
      </template>
      <template #cell-client="{ row }">
        <strong>{{ abcRow(row).client }}</strong>
        <small>{{ abcRow(row).ownerId }}</small>
      </template>
      <template #cell-revenue="{ row }">
        <strong>{{ formatCurrency(abcRow(row).revenue) }}</strong>
      </template>
      <template #cell-share="{ row }">
        {{ formatPercent(abcRow(row).share) }}
      </template>
      <template #cell-accumulated="{ row }">
        {{ formatPercent(abcRow(row).accumulated) }}
      </template>
      <template #cell-class="{ row }">
        <StatusBadge :label="`Classe ${abcRow(row).class}`" :variant="classVariant(abcRow(row).class)" />
      </template>
      <template #cell-titles="{ row }">
        {{ abcRow(row).titles }}
      </template>
      <template #cell-lastMovement="{ row }">
        {{ formatDate(abcRow(row).lastMovement) }}
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="`/owners/${abcRow(row).ownerId}`" class="open-link">Abrir</RouterLink>
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
import { financialReceivablesService } from '@/services/financialReceivables';
import type { FinancialReceivableListItem } from '@/types/financialReceivables';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type AbcClass = 'A' | 'B' | 'C';
type AbcClassFilter = '' | AbcClass;

interface AbcClientRow {
  id: string;
  rank: number;
  ownerId: string;
  client: string;
  revenue: number;
  share: number;
  accumulated: number;
  class: AbcClass;
  titles: number;
  lastMovement: string | null;
}

interface ClientAggregate {
  ownerId: string;
  client: string;
  revenue: number;
  titles: number;
  lastMovement: string | null;
}

const columns: DataTableColumn[] = [
  { key: 'rank', label: 'Classificação', width: '96px' },
  { key: 'client', label: 'Cliente' },
  { key: 'revenue', label: 'Faturamento' },
  { key: 'share', label: 'Participação' },
  { key: 'accumulated', label: 'Acumulado' },
  { key: 'class', label: 'Classe' },
  { key: 'titles', label: 'Títulos' },
  { key: 'lastMovement', label: 'Último Movimento' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const period = currentMonthPeriod();
const filters = reactive({
  search: '',
  dateFrom: period.from,
  dateTo: period.to,
  classFilter: '' as AbcClassFilter
});
const receivables = ref<FinancialReceivableListItem[]>([]);
const loading = ref(false);
const error = ref('');

const rankedRows = computed(() => buildRankedRows(receivables.value.filter(matchesPeriod)));
const filteredRows = computed(() =>
  rankedRows.value
    .filter((row) => !filters.classFilter || row.class === filters.classFilter)
    .filter(matchesSearch) as unknown as DataTableRow[]
);
const totalRevenue = computed(() => rankedRows.value.reduce((sum, row) => sum + row.revenue, 0));
const averageTicket = computed(() => {
  const totalTitles = rankedRows.value.reduce((sum, row) => sum + row.titles, 0);
  return totalTitles > 0 ? totalRevenue.value / totalTitles : 0;
});
const classARows = computed(() => rankedRows.value.filter((row) => row.class === 'A'));
const classARevenue = computed(() => classARows.value.reduce((sum, row) => sum + row.revenue, 0));
const classACount = computed(() => classARows.value.length);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-abc-clients',
    label: 'Atualizar',
    variant: 'secondary' as const,
    loading: loading.value,
    onClick: () => loadCurve()
  }
]);

onMounted(() => {
  void loadCurve();
});

async function loadCurve() {
  loading.value = true;
  error.value = '';
  try {
    const response = await financialReceivablesService.list({ page: 1, pageSize: 200 });
    receivables.value = response.data ?? [];
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar curva ABC de clientes.';
    receivables.value = [];
  } finally {
    loading.value = false;
  }
}

function clearFilters() {
  filters.search = '';
  filters.classFilter = '';
  const nextPeriod = currentMonthPeriod();
  filters.dateFrom = nextPeriod.from;
  filters.dateTo = nextPeriod.to;
  void loadCurve();
}

function buildRankedRows(items: FinancialReceivableListItem[]): AbcClientRow[] {
  const aggregates = new Map<string, ClientAggregate>();
  for (const receivable of items) {
    const revenue = receivable.amountPaid > 0 ? receivable.amountPaid : receivable.amountOriginal;
    const existing = aggregates.get(receivable.ownerId) ?? {
      ownerId: receivable.ownerId,
      client: receivable.ownerName,
      revenue: 0,
      titles: 0,
      lastMovement: null
    };
    existing.revenue += revenue;
    existing.titles += 1;
    existing.lastMovement = latestDate(existing.lastMovement, movementDate(receivable));
    aggregates.set(receivable.ownerId, existing);
  }

  const sorted = [...aggregates.values()].sort((left, right) => right.revenue - left.revenue);
  const total = sorted.reduce((sum, row) => sum + row.revenue, 0);
  let accumulated = 0;

  return sorted.map((aggregate, index) => {
    const share = total > 0 ? aggregate.revenue / total : 0;
    accumulated += share;
    return {
      id: aggregate.ownerId,
      rank: index + 1,
      ownerId: aggregate.ownerId,
      client: aggregate.client,
      revenue: aggregate.revenue,
      share,
      accumulated,
      class: classifyAccumulated(accumulated),
      titles: aggregate.titles,
      lastMovement: aggregate.lastMovement
    };
  });
}

function classifyAccumulated(accumulated: number): AbcClass {
  if (accumulated <= 0.8) return 'A';
  if (accumulated <= 0.95) return 'B';
  return 'C';
}

function matchesPeriod(receivable: FinancialReceivableListItem): boolean {
  const date = movementDate(receivable);
  if (!date) return !filters.dateFrom && !filters.dateTo;
  const normalized = date.slice(0, 10);
  if (filters.dateFrom && normalized < filters.dateFrom) return false;
  if (filters.dateTo && normalized > filters.dateTo) return false;
  return true;
}

function matchesSearch(row: AbcClientRow): boolean {
  const term = filters.search.trim().toLowerCase();
  if (!term) return true;
  return [row.client, row.ownerId].some((value) => value.toLowerCase().includes(term));
}

function movementDate(receivable: FinancialReceivableListItem): string | null {
  return receivable.settledAt || receivable.dueAt || receivable.issuedAt || null;
}

function latestDate(current: string | null, next: string | null): string | null {
  if (!current) return next;
  if (!next) return current;
  return next > current ? next : current;
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

function abcRow(row: DataTableRow): AbcClientRow {
  return row as unknown as AbcClientRow;
}

function classVariant(value: AbcClass): 'success' | 'warning' | 'info' {
  if (value === 'A') return 'success';
  if (value === 'B') return 'warning';
  return 'info';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

function formatDate(value: string | null): string {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(date);
}
</script>

<style scoped>
.curve-abc-clients-page {
  display: grid;
  gap: 16px;
}

.abc-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.abc-actions,
.abc-filters__actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.abc-filters {
  display: grid;
  grid-template-columns: minmax(220px, 1.3fr) minmax(150px, 0.8fr) minmax(150px, 0.8fr) minmax(150px, 0.7fr) auto;
  gap: 12px;
  align-items: end;
}

.curve-abc-clients-page :deep(td small) {
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

@media (max-width: 980px) {
  .abc-filters {
    grid-template-columns: 1fr;
  }
}
</style>
