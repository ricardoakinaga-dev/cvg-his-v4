<template>
  <div class="curve-abc-products-page">
    <AppPageHeader
      title="Curva ABC Produtos"
      :breadcrumbs="['Financeiro', 'Controles', 'Curva ABC Produtos']"
      subtitle="Classificação por importância, faturamento e participação acumulada dos produtos"
      :secondary-actions="headerSecondaryActions"
    />

    <section class="abc-summary-grid" aria-label="Resumo da curva ABC de produtos">
      <DsStatCard :label="`${filteredRows.length} produto(s)`" value="Produtos" />
      <DsStatCard :label="formatCurrency(totalRevenue)" value="Faturamento" />
      <DsStatCard :label="formatQuantity(totalQuantity)" value="Quantidade" />
      <DsStatCard
        :label="formatCurrency(classARevenue)"
        value="Classe A"
        :error="classACount > 0 ? `${classACount} produto(s)` : undefined"
      />
    </section>

    <section class="abc-actions" aria-label="Ações da curva ABC de produtos">
      <DsButton variant="primary" disabled>Exportar Curva</DsButton>
      <DsButton variant="secondary" disabled>Gerar Relatório</DsButton>
      <DsButton variant="secondary" tag="a" to="/products">Produtos</DsButton>
      <DsButton variant="secondary" tag="a" to="/counter-sales">Comandas</DsButton>
      <DsButton variant="ghost" :loading="loading" @click="loadCurve">Atualizar</DsButton>
    </section>

    <form class="abc-filters" aria-label="Filtros da curva ABC de produtos" @submit.prevent="loadCurve">
      <DsInput
        id="abc-product-search"
        v-model="filters.search"
        label="Produto"
        type="search"
        placeholder="Buscar por produto ou código"
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
      empty-icon="📈"
      empty-title="Nenhum produto na curva ABC"
      empty-description="A curva é calculada a partir dos produtos vendidos em comandas fechadas no período selecionado."
      caption="Curva ABC Produtos"
      variant="hoverable"
    >
      <template #cell-rank="{ row }">
        <strong>{{ abcRow(row).rank }}</strong>
      </template>
      <template #cell-product="{ row }">
        <strong>{{ abcRow(row).product }}</strong>
        <small>{{ abcRow(row).code || 'Sem código vinculado' }}</small>
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
      <template #cell-quantity="{ row }">
        {{ formatQuantity(abcRow(row).quantity) }}
      </template>
      <template #cell-averagePrice="{ row }">
        {{ formatCurrency(abcRow(row).averagePrice) }}
      </template>
      <template #cell-open="{ row }">
        <RouterLink :to="abcRow(row).productId ? `/products/${abcRow(row).productId}` : '/products'" class="open-link">
          Abrir
        </RouterLink>
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
import { counterSalesService, type CounterSalesCommercialDashboard } from '@/services/counterSales';
import { productsService, type ProductSummary } from '@/services/products';
import DsAlert from '@cvg-his-v2/design-system/vue/DsAlert.vue';
import DsButton from '@cvg-his-v2/design-system/vue/DsButton.vue';
import DsInput from '@cvg-his-v2/design-system/vue/DsInput.vue';
import DsStatCard from '@cvg-his-v2/design-system/vue/DsStatCard.vue';

type AbcClass = 'A' | 'B' | 'C';
type AbcClassFilter = '' | AbcClass;
type DashboardProduct = CounterSalesCommercialDashboard['topProducts'][number];

interface AbcProductRow {
  id: string;
  rank: number;
  product: string;
  productId: string | null;
  code: string | null;
  revenue: number;
  share: number;
  accumulated: number;
  class: AbcClass;
  quantity: number;
  averagePrice: number;
}

const columns: DataTableColumn[] = [
  { key: 'rank', label: 'Classificação', width: '96px' },
  { key: 'product', label: 'Produto' },
  { key: 'revenue', label: 'Faturamento' },
  { key: 'share', label: 'Participação' },
  { key: 'accumulated', label: 'Acumulado' },
  { key: 'class', label: 'Classe' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'averagePrice', label: 'Preço Médio' },
  { key: 'open', label: 'Abrir', class: 'table__actions-col' }
];

const period = currentMonthPeriod();
const filters = reactive({
  search: '',
  dateFrom: period.from,
  dateTo: period.to,
  classFilter: '' as AbcClassFilter
});
const dashboardProducts = ref<readonly DashboardProduct[]>([]);
const products = ref<readonly ProductSummary[]>([]);
const loading = ref(false);
const error = ref('');

const productLookup = computed(() => {
  const lookup = new Map<string, ProductSummary>();
  for (const product of products.value) {
    lookup.set(normalizeSearch(product.name), product);
    if (product.code) lookup.set(normalizeSearch(product.code), product);
  }
  return lookup;
});
const rankedRows = computed(() => buildRankedRows(dashboardProducts.value, productLookup.value));
const filteredRows = computed(() =>
  rankedRows.value
    .filter((row) => !filters.classFilter || row.class === filters.classFilter)
    .filter(matchesSearch) as unknown as DataTableRow[]
);
const totalRevenue = computed(() => rankedRows.value.reduce((sum, row) => sum + row.revenue, 0));
const totalQuantity = computed(() => rankedRows.value.reduce((sum, row) => sum + row.quantity, 0));
const classARows = computed(() => rankedRows.value.filter((row) => row.class === 'A'));
const classARevenue = computed(() => classARows.value.reduce((sum, row) => sum + row.revenue, 0));
const classACount = computed(() => classARows.value.length);
const headerSecondaryActions = computed(() => [
  {
    key: 'refresh-abc-products',
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
    const [dashboard, productList] = await Promise.all([
      counterSalesService.getCommercialDashboard({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined
      }),
      productsService.list()
    ]);
    dashboardProducts.value = dashboard.topProducts ?? [];
    products.value = productList;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Não foi possível carregar curva ABC de produtos.';
    dashboardProducts.value = [];
    products.value = [];
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

function buildRankedRows(
  items: readonly DashboardProduct[],
  lookup: ReadonlyMap<string, ProductSummary>
): AbcProductRow[] {
  const sorted = [...items].sort((left, right) => right.revenue - left.revenue);
  const total = sorted.reduce((sum, row) => sum + row.revenue, 0);
  let accumulated = 0;

  return sorted.map((item, index) => {
    const product = lookup.get(normalizeSearch(item.name)) ?? null;
    const share = total > 0 ? item.revenue / total : 0;
    accumulated += share;
    return {
      id: product?.id ?? normalizeSearch(item.name),
      rank: index + 1,
      product: item.name,
      productId: product?.id ?? null,
      code: product?.code ?? null,
      revenue: item.revenue,
      share,
      accumulated,
      class: classifyAccumulated(accumulated),
      quantity: item.quantity,
      averagePrice: item.quantity > 0 ? item.revenue / item.quantity : 0
    };
  });
}

function classifyAccumulated(accumulated: number): AbcClass {
  if (accumulated <= 0.8) return 'A';
  if (accumulated <= 0.95) return 'B';
  return 'C';
}

function matchesSearch(row: AbcProductRow): boolean {
  const term = normalizeSearch(filters.search);
  if (!term) return true;
  return [row.product, row.code ?? '', row.productId ?? ''].some((value) => normalizeSearch(value).includes(term));
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

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function abcRow(row: DataTableRow): AbcProductRow {
  return row as unknown as AbcProductRow;
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

function formatQuantity(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}
</script>

<style scoped>
.curve-abc-products-page {
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

.curve-abc-products-page :deep(td small) {
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
